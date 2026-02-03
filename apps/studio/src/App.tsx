import { useEffect, useState, useRef } from 'react'
import './App.css'
import './firebase'
import { db } from './firebase'
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore'
import { getStorage, ref, uploadBytes } from 'firebase/storage'
import { Project, NodeMetadata, Step, Displacement } from 'ar-simulator-shared'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import * as TWEEN from '@tweenjs/tween.js'

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [parts, setParts] = useState<NodeMetadata[]>([])
  const [selectedPart, setSelectedPart] = useState<NodeMetadata | null>(null)
  const [currentDisplacement, setCurrentDisplacement] = useState<Displacement | null>(null)
  const [stepTitle, setStepTitle] = useState('')
  const [stepInstruction, setStepInstruction] = useState('')
  const [stepDuration, setStepDuration] = useState(1000)
  const [currentStep, setCurrentStep] = useState<Step | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const transformControlsRef = useRef<TransformControls | null>(null)
  const originalMaterials = useRef<Map<THREE.Mesh, THREE.Material>>(new Map())
  const meshMap = useRef<Map<string, THREE.Mesh>>(new Map())

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (currentProject && canvasRef.current) {
      initThree()
    }
  }, [currentProject])

  const fetchProjects = async () => {
    const q = query(collection(db, 'projects'), where('ownerUid', '==', 'dummy-user'))
    const snapshot = await getDocs(q)
    const projs: Project[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project))
    setProjects(projs)
  }

  const createProject = async () => {
    const name = prompt('Project name:')
    if (name) {
      const docRef = await addDoc(collection(db, 'projects'), {
        name,
        ownerUid: 'dummy-user',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      const newProject: Project = { id: docRef.id, name, ownerUid: 'dummy-user', createdAt: new Date(), updatedAt: new Date() }
      setProjects([...projects, newProject])
    }
  }

  const initThree = () => {
    const canvas = canvasRef.current!
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ canvas })
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    const controls = new OrbitControls(camera, canvas)
    camera.position.z = 5

    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera
    controlsRef.current = controls

    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      TWEEN.update()
      renderer.render(scene, camera)
    }
    animate()
  }

  const uploadGLB = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentProject) return

    const storage = getStorage()
    const storageRef = ref(storage, `projects/${currentProject.id}/source.glb`)
    await uploadBytes(storageRef, file)

    // Load GLB
    const loader = new GLTFLoader()
    loader.load(URL.createObjectURL(file), (gltf) => {
      const scene = sceneRef.current!
      scene.clear()
      scene.add(gltf.scene)

      // Traverse and list parts
      const partsList: NodeMetadata[] = []
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const node = child as THREE.Mesh
          const path = getNodePath(node)
          const metadata: NodeMetadata = {
            nodeId: node.uuid,
            name: node.name || 'Unnamed',
            path,
            nodeIndex: 0, // placeholder
            initialPosition: node.position.toArray()
          }
          partsList.push(metadata)
          meshMap.current.set(node.uuid, node)
        }
      })
      setParts(partsList)

      // Store in Firestore
      partsList.forEach(async (part) => {
        await addDoc(collection(db, 'projects', currentProject.id, 'nodes'), part)
      })
    })
  }

  const getNodePath = (node: THREE.Object3D): string => {
    const path = []
    let current = node
    while (current) {
      path.unshift(current.name || 'Unnamed')
      current = current.parent!
    }
    return path.join('/')
  }

  const createStep = async () => {
    if (!currentProject) return
    const step: Omit<Step, 'id'> = {
      title: stepTitle,
      instruction: stepInstruction,
      durationMs: stepDuration,
      displacements: []
    }
    const docRef = await addDoc(collection(db, 'projects', currentProject.id, 'steps'), step)
    const newStep: Step = { id: docRef.id, ...step }
    setCurrentStep(newStep)
  }

  const addDisplacement = () => {
    if (currentStep && currentDisplacement) {
      setCurrentStep({ ...currentStep, displacements: [...currentStep.displacements, currentDisplacement] })
    }
  }

  const selectPart = (part: NodeMetadata) => {
    setSelectedPart(part)
    const mesh = meshMap.current.get(part.nodeId)
    if (!mesh) return

    // Remove previous controls
    if (transformControlsRef.current) {
      sceneRef.current!.remove(transformControlsRef.current)
    }

    // Attach new controls
    const controls = new TransformControls(cameraRef.current!, rendererRef.current!.domElement)
    controls.setMode('translate')
    controls.attach(mesh)
    sceneRef.current!.add(controls)
    transformControlsRef.current = controls

    // Set displacement
    setCurrentDisplacement({
      nodeId: part.nodeId,
      path: part.path,
      from: part.initialPosition,
      to: mesh.position.toArray()
    })

    // Update on change
    controls.addEventListener('objectChange', () => {
      setCurrentDisplacement(prev => prev ? { ...prev, to: mesh.position.toArray() } : null)
    })

    // Highlight
    const scene = sceneRef.current!
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.uuid === part.nodeId) {
          if (!originalMaterials.current.has(child)) {
            originalMaterials.current.set(child, child.material)
          }
          child.material = new THREE.MeshBasicMaterial({ color: 0xff0000 })
        } else {
          const orig = originalMaterials.current.get(child)
          if (orig) child.material = orig
        }
      }
    })
  }

  const previewStep = () => {
    if (!currentStep || currentStep.displacements.length === 0) return
    currentStep.displacements.forEach(disp => {
      const mesh = meshMap.current.get(disp.nodeId)
      if (mesh) {
        new TWEEN.Tween(mesh.position)
          .to({ x: disp.to[0], y: disp.to[1], z: disp.to[2] }, currentStep.durationMs)
          .start()
      }
    })
  }

  return (
    <div className="App">
      <h1>Studio</h1>
      <button onClick={createProject}>Create Project</button>
      <ul>
        {projects.map(p => (
          <li key={p.id} onClick={() => setCurrentProject(p)} style={{ cursor: 'pointer' }}>
            {p.name}
          </li>
        ))}
      </ul>
      {currentProject && (
        <div>
          <h2>{currentProject.name}</h2>
          <input type="file" accept=".glb" onChange={uploadGLB} />
          <canvas ref={canvasRef} style={{ width: '800px', height: '600px', border: '1px solid black' }} />
          <ul>
            {parts.map(p => (
              <li key={p.nodeId} onClick={() => selectPart(p)} style={{ cursor: 'pointer' }}>
                {p.name}
              </li>
            ))}
          </ul>
          <div>
            <h3>Step Editor</h3>
            <input placeholder="Title" value={stepTitle} onChange={e => setStepTitle(e.target.value)} />
            <input placeholder="Instruction" value={stepInstruction} onChange={e => setStepInstruction(e.target.value)} />
            <input type="number" placeholder="Duration (ms)" value={stepDuration} onChange={e => setStepDuration(Number(e.target.value))} />
            <button onClick={createStep}>Create Step</button>
            {currentStep && <button onClick={addDisplacement}>Add Displacement</button>}
            {currentStep && <button onClick={previewStep}>Preview Step</button>}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, doc, getDoc, onSnapshot, orderBy, query, addDoc, getDocs } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { db, storage } from "../firebase";
import type { DisplacementDoc, NodeDoc, ProjectDoc, StepDoc } from "@ar/shared";

interface StepRow {
  id: string;
  data: StepDoc;
}

const ModelInspector = () => {
  const { projectId } = useParams();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [nodes, setNodes] = useState<NodeDoc[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [fromPosition, setFromPosition] = useState<THREE.Vector3 | null>(null);
  const [toPosition, setToPosition] = useState<THREE.Vector3 | null>(null);
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [durationMs, setDurationMs] = useState(1200);
  const [status, setStatus] = useState("Ready");
  const objectMap = useRef<Map<string, THREE.Object3D>>(new Map());
  const transformRef = useRef<TransformControls | null>(null);

  const projectRef = useMemo(() => (projectId ? doc(db, "projects", projectId) : null), [projectId]);

  useEffect(() => {
    if (!projectRef) return;
    const nodeQuery = query(collection(projectRef, "nodes"));
    const unsub = onSnapshot(nodeQuery, (snap) => {
      setNodes(snap.docs.map((docSnap) => docSnap.data() as NodeDoc));
    });
    return () => unsub();
  }, [projectRef]);

  useEffect(() => {
    if (!projectRef) return;
    const stepQuery = query(collection(projectRef, "steps"), orderBy("order"));
    const unsub = onSnapshot(stepQuery, (snap) => {
      setSteps(snap.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() as StepDoc })));
    });
    return () => unsub();
  }, [projectRef]);

  useEffect(() => {
    if (!projectRef || !canvasRef.current) return;
    let mounted = true;
    let cleanup: (() => void) | null = null;
    const loadScene = async () => {
      const snap = await getDoc(projectRef);
      if (!snap.exists()) return;
      const project = snap.data() as ProjectDoc;
      if (!project.sourceGlbPath) return;
      const url = await getDownloadURL(ref(storage, project.sourceGlbPath));

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111827);
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(2, 2, 2);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      const container = canvasRef.current;
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight);
      container.innerHTML = "";
      container.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      const transform = new TransformControls(camera, renderer.domElement);
      transform.setMode("translate");
      transform.addEventListener("dragging-changed", (event) => {
        controls.enabled = !event.value;
      });
      scene.add(transform);
      transformRef.current = transform;

      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
      dirLight.position.set(3, 4, 2);
      scene.add(dirLight);

      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      scene.add(gltf.scene);
      gltf.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.userData.selectable = true;
        }
      });

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();

      const handlePointer = (event: PointerEvent) => {
        if (!mounted) return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(gltf.scene.children, true);
        const hit = hits.find((item) => (item.object as THREE.Mesh).userData.selectable);
        if (hit) {
          const object = hit.object;
          const matching = nodes.find((node) => object.name === node.name);
          if (matching) {
            setSelectedNodeId(matching.nodeId);
            transform.attach(object);
          }
        }
      };

      renderer.domElement.addEventListener("pointerdown", handlePointer);

      const animate = () => {
        if (!mounted) return;
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      nodes.forEach((node) => {
        const match = gltf.scene.getObjectByName(node.name);
        if (match) {
          objectMap.current.set(node.nodeId, match);
        }
      });

      const onResize = () => {
        if (!container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      window.addEventListener("resize", onResize);

      cleanup = () => {
        window.removeEventListener("resize", onResize);
        renderer.domElement.removeEventListener("pointerdown", handlePointer);
        renderer.dispose();
      };
    };

    loadScene();

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [projectRef, nodes]);

  const selectedNode = nodes.find((node) => node.nodeId === selectedNodeId) || null;

  useEffect(() => {
    if (!selectedNodeId) return;
    const object = objectMap.current.get(selectedNodeId);
    if (object && transformRef.current) {
      transformRef.current.attach(object);
    }
  }, [selectedNodeId]);

  const handleCaptureFrom = () => {
    if (!selectedNodeId) return;
    const object = objectMap.current.get(selectedNodeId);
    if (!object) return;
    setFromPosition(object.position.clone());
  };

  const handleCaptureTo = () => {
    if (!selectedNodeId) return;
    const object = objectMap.current.get(selectedNodeId);
    if (!object) return;
    setToPosition(object.position.clone());
  };

  const handleSaveDisplacement = async () => {
    if (!projectRef || !selectedStepId || !selectedNode || !fromPosition || !toPosition) return;
    const displacement: DisplacementDoc = {
      nodeId: selectedNode.nodeId,
      nodePath: selectedNode.path,
      from: [fromPosition.x, fromPosition.y, fromPosition.z],
      to: [toPosition.x, toPosition.y, toPosition.z]
    };
    await addDoc(collection(projectRef, "steps", selectedStepId, "displacements"), displacement);
    setStatus("Saved displacement");
  };

  const handleCreateStep = async () => {
    if (!projectRef) return;
    const step: StepDoc = {
      order: steps.length,
      title: title || `Step ${steps.length + 1}`,
      instruction: instruction || "Follow the highlighted part",
      durationMs,
      animationName: `step-${steps.length + 1}`,
      createdAt: Date.now()
    };
    await addDoc(collection(projectRef, "steps"), step);
    setTitle("");
    setInstruction("");
    setStatus("Step created");
  };

  const handlePreview = async () => {
    if (!projectRef || !selectedStepId) return;
    const step = steps.find((item) => item.id === selectedStepId)?.data;
    if (!step) return;
    const dispSnap = await getDocs(collection(projectRef, "steps", selectedStepId, "displacements"));
    const disps = dispSnap.docs.map((docSnap) => docSnap.data() as DisplacementDoc);
    const startTime = performance.now();
    const duration = step.durationMs;

    const animate = (time: number) => {
      const t = Math.min((time - startTime) / duration, 1);
      disps.forEach((disp) => {
        const obj = objectMap.current.get(disp.nodeId);
        if (!obj) return;
        obj.position.lerpVectors(
          new THREE.Vector3(...disp.from),
          new THREE.Vector3(...disp.to),
          t
        );
      });
      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  };

  const handleBake = async () => {
    if (!projectId) return;
    setStatus("Baking...");
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/projects/${projectId}/bake`, {
      method: "POST"
    });
    setStatus(res.ok ? "Baked" : "Bake failed");
  };

  return (
    <div className="grid grid-2">
      <div className="sidebar">
        <div className="card">
          <h3>Parts</h3>
          <div className="list">
            {nodes.map((node) => (
              <button
                key={node.nodeId}
                className={selectedNodeId === node.nodeId ? "secondary" : ""}
                onClick={() => setSelectedNodeId(node.nodeId)}
              >
                {node.name}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Displacement</h3>
          <p>Selected: {selectedNode?.name || "None"}</p>
          <div className="inline">
            <button onClick={handleCaptureFrom} className="secondary">
              Capture From
            </button>
            <button onClick={handleCaptureTo} className="secondary">
              Capture To
            </button>
          </div>
          <button onClick={handleSaveDisplacement}>Save to Step</button>
        </div>

        <div className="card">
          <h3>Steps</h3>
          <div className="list">
            {steps.map((step) => (
              <button
                key={step.id}
                className={selectedStepId === step.id ? "secondary" : ""}
                onClick={() => setSelectedStepId(step.id)}
              >
                {step.data.title}
              </button>
            ))}
          </div>
          <div className="grid">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Step title" />
            <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Instruction" />
            <input
              type="number"
              value={durationMs}
              onChange={(event) => setDurationMs(Number(event.target.value))}
              placeholder="Duration ms"
            />
            <button onClick={handleCreateStep}>Create Step</button>
          </div>
          <div className="inline">
            <button onClick={handlePreview} className="secondary">
              Preview Step
            </button>
            <button onClick={handleBake}>Bake & Publish</button>
          </div>
          <p>{status}</p>
        </div>
      </div>

      <div className="canvas-panel" ref={canvasRef} />
    </div>
  );
};

export default ModelInspector;

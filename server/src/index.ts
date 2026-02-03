import 'dotenv/config'
import express from 'express'
import * as admin from 'firebase-admin'
import { Project, Step } from 'ar-simulator-shared'
import { Document, NodeIO, Animation, AnimationChannel, AnimationSampler, Accessor } from '@gltf-transform/core'

const app = express()
const port = 3001

// Firebase Admin init
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
})

const db = admin.firestore()

app.use(express.json())

function findNodeByPath(document: Document, path: string) {
  const scene = document.getRoot().listScenes()[0]
  const parts = path.split('/')
  let node: any = scene
  for (const part of parts) {
    if (part === '') continue
    const children = node.listChildren()
    node = children.find((c: any) => c.getName() === part)
    if (!node) return null
  }
  return node
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Dummy uid for MVP
const dummyUid = 'dummy-user'

app.get('/api/projects', async (req, res) => {
  try {
    const snapshot = await db.collection('projects').where('ownerUid', '==', dummyUid).get()
    const projects: Project[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project))
    res.json(projects)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

app.post('/api/projects', async (req, res) => {
  try {
    const { name } = req.body
    const project: Omit<Project, 'id'> = {
      name,
      ownerUid: dummyUid,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    const docRef = await db.collection('projects').add(project)
    res.json({ id: docRef.id, ...project })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' })
  }
})

app.get('/api/projects/:id/manifest', async (req, res) => {
  try {
    const { id } = req.params
    const doc = await db.collection('projects').doc(id).get()
    if (!doc.exists) {
      return res.status(404).json({ error: 'Project not found' })
    }
    const project = doc.data() as Project
    const stepsSnapshot = await db.collection('projects').doc(id).collection('steps').get()
    const steps = stepsSnapshot.docs.map((doc, index) => ({
      ...doc.data(),
      animationName: `step_${String(index + 1).padStart(2, '0')}`
    }))
    res.json({
      bakedGlbUrl: project.bakedGlbPath ? `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${project.bakedGlbPath}` : null,
      steps
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch manifest' })
  }
})

app.post('/api/projects/:id/bake', async (req, res) => {
  try {
    const { id } = req.params
    const bucket = admin.storage().bucket()
    const sourceRef = bucket.file(`projects/${id}/source.glb`)
    const [sourceBuffer] = await sourceRef.download()

    const io = new NodeIO()
    const document = await io.readBinary(sourceBuffer)

    const stepsSnapshot = await db.collection('projects').doc(id).collection('steps').get()
    const steps = stepsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Step))

    steps.forEach((step, index) => {
      const animation = document.createAnimation(`step_${String(index + 1).padStart(2, '0')}`)
      step.displacements.forEach(disp => {
        const node = findNodeByPath(document, disp.path)
        if (node) {
          const sampler = document.createAnimationSampler()
          sampler.setInterpolation('LINEAR')
          const inputAccessor = document.createAccessor()
          inputAccessor.setType(Accessor.Type.SCALAR)
          inputAccessor.setArray(new Float32Array([0, step.durationMs / 1000]))
          const outputAccessor = document.createAccessor()
          outputAccessor.setType(Accessor.Type.VEC3)
          outputAccessor.setArray(new Float32Array([...disp.from, ...disp.to]))
          sampler.setInput(inputAccessor)
          sampler.setOutput(outputAccessor)
          const channel = document.createAnimationChannel()
          channel.setSampler(sampler)
          channel.setTargetNode(node)
          channel.setTargetPath(AnimationChannel.TargetPath.TRANSLATION)
          animation.addChannel(channel)
        }
      })
    })

    const glb = await io.writeBinary(document)
    const bakedRef = bucket.file(`projects/${id}/baked.glb`)
    await bakedRef.save(glb, { contentType: 'model/gltf-binary' })
    await db.collection('projects').doc(id).update({ bakedGlbPath: `projects/${id}/baked.glb` })

    res.json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to bake' })
  }
})

console.log('Starting server...')
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
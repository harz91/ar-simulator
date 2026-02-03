import express from 'express';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (serviceAccountPath) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
} else {
  console.warn(
    'FIREBASE_SERVICE_ACCOUNT_PATH not set, Firebase Admin not initialized',
  );
}

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Bake project endpoint
app.post('/api/projects/:id/bake', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    // Get project document
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Download source.glb from Firebase Storage
    const sourceGlbPath = `projects/${projectId}/source.glb`;
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const sourceGlbFile = path.join(tempDir, `${projectId}_source.glb`);
    await bucket.file(sourceGlbPath).download({ destination: sourceGlbFile });

    // Read the GLB file
    const glbBuffer = fs.readFileSync(sourceGlbFile);

    // Load GLB using gltf-transform
    const io = new (await import('@gltf-transform/core')).NodeIO();
    const document = await io.readBinary(glbBuffer);

    // Get steps and displacements
    const stepsSnapshot = await db
      .collection('projects')
      .doc(projectId)
      .collection('steps')
      .orderBy('order', 'asc')
      .get();

    const steps = stepsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        order: data.order,
        durationMs: data.durationMs,
      };
    });

    // Get displacements for each step
    const displacementsByStep: Record<string, any[]> = {};
    for (const step of steps) {
      const displacementsSnapshot = await db
        .collection('projects')
        .doc(projectId)
        .collection('steps')
        .doc(step.id)
        .collection('displacements')
        .get();

      displacementsByStep[step.id] = displacementsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          nodeId: data.nodeId,
          fromPosition: data.fromPosition,
          toPosition: data.toPosition,
        };
      });
    }

    // Create animations for each step
    const root = document.getRoot();
    const scene = root.listScenes()[0];
    if (!scene) {
      return res.status(400).json({ error: 'No scene found in GLB' });
    }

    // Get all nodes in the scene
    const nodes = scene.listChildren();
    const nodeMap = new Map<string, any>();
    const buildNodeMap = (node: any) => {
      nodeMap.set(node.getName(), node);
      node.listChildren().forEach(buildNodeMap);
    };
    nodes.forEach(buildNodeMap);

    // Create animation for each step
    for (const step of steps) {
      const animationName = `step_${String(step.order).padStart(2, '0')}`;
      const animation = (root as any).createAnimation(animationName);
      const displacements = displacementsByStep[step.id] || [];

      for (const displacement of displacements) {
        const targetNode = nodeMap.get(displacement.nodeId);
        if (!targetNode) {
          console.warn(`Node ${displacement.nodeId} not found in scene`);
          continue;
        }

        // Create animation channel for translation
        const channel = animation.createChannel();
        channel.setTargetNode(targetNode);
        channel.setTargetPath('translation');

        // Create sampler with keyframes
        const sampler = animation.createSampler();
        channel.setSampler(sampler);

        // Set keyframe times (0 and duration in seconds)
        const times = [0, step.durationMs / 1000];
        const values = [
          ...displacement.fromPosition,
          ...displacement.toPosition,
        ];

        sampler.setInput(
          'TIME',
          (root as any)
            .createAccessor()
            .setArray(new Float32Array(times))
            .setType('SCALAR'),
        );
        sampler.setOutput(
          'translation',
          (root as any)
            .createAccessor()
            .setArray(new Float32Array(values))
            .setType('VEC3'),
        );
        sampler.setInterpolation('LINEAR');
      }
    }

    // Write baked GLB to temp file
    const bakedGlbFile = path.join(tempDir, `${projectId}_baked.glb`);
    const bakedGlbBuffer = await io.writeBinary(document);
    fs.writeFileSync(bakedGlbFile, bakedGlbBuffer);

    // Upload baked.glb to Firebase Storage
    const bakedGlbPath = `projects/${projectId}/baked.glb`;
    await bucket.upload(bakedGlbFile, {
      destination: bakedGlbPath,
      metadata: {
        contentType: 'model/gltf-binary',
      },
    });

    // Update project document with bakedGlbPath
    await db.collection('projects').doc(projectId).update({
      bakedGlbPath: bakedGlbPath,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Clean up temp files
    fs.unlinkSync(sourceGlbFile);
    fs.unlinkSync(bakedGlbFile);

    return res.json({
      success: true,
      bakedGlbPath: bakedGlbPath,
      animationCount: steps.length,
    });
  } catch (error) {
    console.error('Error baking project:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: String(error) });
  }
});

// Get project manifest endpoint
app.get('/api/projects/:id/manifest', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const db = admin.firestore();

    // Get project document
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectData = projectDoc.data();

    // Get steps subcollection
    const stepsSnapshot = await db
      .collection('projects')
      .doc(projectId)
      .collection('steps')
      .orderBy('order', 'asc')
      .get();

    const steps = stepsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        instruction: data.instruction,
        durationMs: data.durationMs,
        order: data.order,
        animationName: `step_${String(data.order).padStart(2, '0')}`,
      };
    });

    // Build manifest
    const manifest = {
      id: projectId,
      name: projectData?.name || 'Untitled Project',
      bakedGlbUrl: projectData?.bakedGlbPath
        ? `/assets/${projectData.bakedGlbPath}`
        : null,
      steps,
    };

    return res.json(manifest);
  } catch (error) {
    console.error('Error fetching project manifest:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import express from "express";
import cors from "cors";
import { z } from "zod";
import { firestore, storage } from "./firebase.js";
import { bakeGlb } from "./bake.js";
import { DisplacementDoc, ProjectDoc, ProjectManifest, StepDoc } from "@ar/shared";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const createProjectSchema = z.object({
  name: z.string().min(1),
  ownerUid: z.string().min(1)
});

app.post("/api/projects", async (req, res) => {
  const parse = createProjectSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }
  const now = Date.now();
  const project: ProjectDoc = {
    name: parse.data.name,
    createdAt: now,
    updatedAt: now,
    ownerUid: parse.data.ownerUid,
    status: "draft"
  };
  const ref = await firestore.collection("projects").add(project);
  return res.json({ projectId: ref.id });
});

app.post("/api/projects/:id/upload-url", async (req, res) => {
  const projectId = req.params.id;
  const path = `projects/${projectId}/source.glb`;
  return res.json({ path });
});

app.post("/api/projects/:id/bake", async (req, res) => {
  const projectId = req.params.id;
  const projectRef = firestore.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    return res.status(404).json({ error: "Project not found" });
  }
  const project = projectSnap.data() as ProjectDoc;
  if (!project.sourceGlbPath) {
    return res.status(400).json({ error: "sourceGlbPath missing" });
  }

  const stepsSnap = await projectRef.collection("steps").orderBy("order").get();
  const steps: { step: StepDoc; displacements: DisplacementDoc[] }[] = [];
  for (const stepDoc of stepsSnap.docs) {
    const step = stepDoc.data() as StepDoc;
    const dispSnap = await stepDoc.ref.collection("displacements").get();
    const displacements = dispSnap.docs.map((doc) => doc.data() as DisplacementDoc);
    steps.push({ step, displacements });
  }

  const bucket = storage.bucket();
  const [buffer] = await bucket.file(project.sourceGlbPath).download();
  const baked = await bakeGlb(new Uint8Array(buffer), steps);

  const bakedPath = `projects/${projectId}/baked.glb`;
  await bucket.file(bakedPath).save(Buffer.from(baked), { contentType: "model/gltf-binary" });

  await projectRef.update({ bakedGlbPath: bakedPath, status: "baked", updatedAt: Date.now() });

  return res.json({ bakedPath });
});

app.get("/api/projects/:id/manifest", async (req, res) => {
  const projectId = req.params.id;
  const projectRef = firestore.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    return res.status(404).json({ error: "Project not found" });
  }
  const project = projectSnap.data() as ProjectDoc;
  if (!project.bakedGlbPath) {
    return res.status(400).json({ error: "bakedGlbPath missing" });
  }

  const bucket = storage.bucket();
  const [url] = await bucket.file(project.bakedGlbPath).getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000
  });

  const stepsSnap = await projectRef.collection("steps").orderBy("order").get();
  const steps = stepsSnap.docs.map((doc) => doc.data() as StepDoc);

  const manifest: ProjectManifest = {
    projectId,
    name: project.name,
    bakedGlbUrl: url,
    steps
  };

  return res.json(manifest);
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { Project, Step, NodeMetadata, Displacement } from 'shared';

const db = getFirestore();

export async function createProject(
  ownerUid: string,
  name: string,
): Promise<string> {
  const projectsRef = collection(db, 'projects');
  const now = Timestamp.now();

  const docRef = await addDoc(projectsRef, {
    name,
    ownerUid,
    sourceGlbPath: '',
    bakedGlbPath: '',
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

export async function getProject(
  projectId: string,
): Promise<(Project & { id: string }) | null> {
  const projectRef = doc(db, 'projects', projectId);
  const projectSnap = await getDoc(projectRef);

  if (!projectSnap.exists()) {
    return null;
  }

  const data = projectSnap.data();
  return {
    id: projectSnap.id,
    name: data.name,
    ownerUid: data.ownerUid,
    sourceGlbPath: data.sourceGlbPath,
    bakedGlbPath: data.bakedGlbPath,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

export async function listProjectsByUser(
  ownerUid: string,
): Promise<(Project & { id: string })[]> {
  const projectsRef = collection(db, 'projects');
  const q = query(projectsRef, where('ownerUid', '==', ownerUid));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      ownerUid: data.ownerUid,
      sourceGlbPath: data.sourceGlbPath,
      bakedGlbPath: data.bakedGlbPath,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

export async function getProjectSteps(
  projectId: string,
): Promise<(Step & { id: string })[]> {
  const stepsRef = collection(db, 'projects', projectId, 'steps');
  const querySnapshot = await getDocs(stepsRef);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      instruction: data.instruction,
      durationMs: data.durationMs,
      order: data.order,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  });
}

export async function saveNodeMetadata(
  projectId: string,
  nodes: NodeMetadata[],
): Promise<void> {
  const batch = writeBatch(db);
  const nodesRef = collection(db, 'projects', projectId, 'nodes');

  nodes.forEach((node) => {
    const docRef = doc(nodesRef, node.nodeId);
    batch.set(docRef, {
      nodeId: node.nodeId,
      name: node.name,
      path: node.path,
      nodeIndex: node.nodeIndex,
      initialPosition: node.initialPosition,
    });
  });

  await batch.commit();
}

export async function getNodeMetadata(
  projectId: string,
): Promise<NodeMetadata[]> {
  const nodesRef = collection(db, 'projects', projectId, 'nodes');
  const querySnapshot = await getDocs(nodesRef);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      nodeId: data.nodeId,
      name: data.name,
      path: data.path,
      nodeIndex: data.nodeIndex,
      initialPosition: data.initialPosition,
    };
  });
}

export async function createStep(
  projectId: string,
  title: string,
  instruction: string,
  durationMs: number,
): Promise<string> {
  const stepsRef = collection(db, 'projects', projectId, 'steps');
  const existingSteps = await getDocs(stepsRef);
  const order = existingSteps.size;
  const now = Timestamp.now();

  const docRef = await addDoc(stepsRef, {
    title,
    instruction,
    durationMs,
    order,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

export async function saveDisplacement(
  projectId: string,
  stepId: string,
  displacement: Displacement,
): Promise<void> {
  const displacementsRef = collection(
    db,
    'projects',
    projectId,
    'steps',
    stepId,
    'displacements',
  );
  await addDoc(displacementsRef, {
    nodeId: displacement.nodeId,
    fromPosition: displacement.fromPosition,
    toPosition: displacement.toPosition,
  });
}

export async function getStepDisplacements(
  projectId: string,
  stepId: string,
): Promise<Displacement[]> {
  const displacementsRef = collection(
    db,
    'projects',
    projectId,
    'steps',
    stepId,
    'displacements',
  );
  const querySnapshot = await getDocs(displacementsRef);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      nodeId: data.nodeId,
      fromPosition: data.fromPosition,
      toPosition: data.toPosition,
    };
  });
}

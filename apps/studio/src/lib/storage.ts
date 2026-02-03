import { getStorage, ref, uploadBytes, getBytes } from 'firebase/storage';

const storage = getStorage();

export async function uploadGLB(
  projectId: string,
  file: File,
): Promise<string> {
  const storageRef = ref(storage, `projects/${projectId}/source.glb`);
  await uploadBytes(storageRef, file);
  return storageRef.fullPath;
}

export async function downloadGLB(projectId: string): Promise<ArrayBuffer> {
  const storageRef = ref(storage, `projects/${projectId}/source.glb`);
  return await getBytes(storageRef);
}

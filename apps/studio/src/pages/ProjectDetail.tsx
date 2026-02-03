import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc, collection } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { db, storage } from "../firebase";
import type { NodeDoc, ProjectDoc } from "@ar/shared";

const ProjectDetail = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const projectRef = useMemo(() => (projectId ? doc(db, "projects", projectId) : null), [projectId]);

  useEffect(() => {
    if (!projectRef) return;
    getDoc(projectRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as ProjectDoc;
        setProject(data);
        if (data.sourceGlbPath) {
          getDownloadURL(ref(storage, data.sourceGlbPath)).then(setSourceUrl);
        }
      }
    });
  }, [projectRef]);

  const indexNodes = async (file: File) => {
    if (!projectId || !projectRef) return;
    const arrayBuffer = await file.arrayBuffer();
    const loader = new GLTFLoader();
    const gltf = await loader.parseAsync(arrayBuffer, "");
    const nodes: NodeDoc[] = [];

    const associations = (gltf.parser as any).associations as Map<THREE.Object3D, { nodes?: number }>;
    const walk = (object: THREE.Object3D, path: string) => {
      const name = object.name || "node";
      const currentPath = path ? `${path}/${name}` : name;
      if ((object as THREE.Mesh).isMesh) {
        const position = object.position;
        const association = associations?.get(object);
        const nodeIndex = association?.nodes ?? nodes.length;
        nodes.push({
          nodeId: String(nodes.length),
          name,
          path: currentPath,
          nodeIndex,
          meshName: (object as THREE.Mesh).geometry?.name,
          initialPosition: [position.x, position.y, position.z]
        });
      }
      object.children.forEach((child) => walk(child, currentPath));
    };

    gltf.scene.children.forEach((child) => walk(child, gltf.scene.name || "scene"));

    const batch = nodes.map((node) => setDoc(doc(collection(projectRef, "nodes"), node.nodeId), node));
    await Promise.all(batch);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !projectId || !projectRef) return;
    setLoading(true);
    try {
      const path = `projects/${projectId}/source.glb`;
      await uploadBytes(ref(storage, path), file);
      await updateDoc(projectRef, {
        sourceGlbPath: path,
        updatedAt: Date.now()
      });
      await indexNodes(file);
      const url = await getDownloadURL(ref(storage, path));
      setSourceUrl(url);
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) {
    return <p>Missing project.</p>;
  }

  return (
    <div className="grid">
      <div className="card">
        <h2>Project Detail</h2>
        {project && <p>{project.name}</p>}
        <label>
          Upload GLB
          <input type="file" accept=".glb" onChange={handleUpload} disabled={loading} />
        </label>
        {sourceUrl && (
          <div className="inline">
            <Link to={`/projects/${projectId}/inspect`}>
              <button>Open Inspector</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db, auth } from "../firebase";
import type { ProjectDoc } from "@ar/shared";

interface ProjectRow {
  id: string;
  data: ProjectDoc;
}

const ProjectList = () => {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as ProjectDoc })));
    });
    return () => unsub();
  }, []);

  const createProject = async () => {
    if (!name || !auth.currentUser) return;
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ownerUid: auth.currentUser.uid })
      });
      if (!res.ok) {
        throw new Error("Failed to create project");
      }
      setName("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid">
      <div className="card">
        <h2>Create Project</h2>
        <div className="inline">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" />
          <button onClick={createProject} disabled={loading}>
            Create
          </button>
        </div>
      </div>
      <div className="card">
        <h2>Projects</h2>
        <div className="list">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="step-card">
              <strong>{project.data.name}</strong>
              <div className="inline">
                <span className="badge">{project.data.status}</span>
              </div>
            </Link>
          ))}
          {!projects.length && <p>No projects yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default ProjectList;

import { useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";
import ProjectList from "./pages/ProjectList";
import ProjectDetail from "./pages/ProjectDetail";
import ModelInspector from "./pages/ModelInspector";

const App = () => {
  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous auth failed", error);
      });
    }
  }, []);

  return (
    <div className="app-shell">
      <header>
        <Link to="/">AR Studio</Link>
        <span className="badge">MVP</span>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<ProjectList />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/projects/:projectId/inspect" element={<ModelInspector />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;

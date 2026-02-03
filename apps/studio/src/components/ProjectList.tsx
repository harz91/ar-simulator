import { useEffect, useState } from 'react';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Project } from 'shared';
import { listProjectsByUser } from '../lib/firestore';
import '../styles/ProjectList.css';

interface ProjectListProps {
    onProjectSelect: (projectId: string) => void;
    onCreateClick: () => void;
}

export function ProjectList({ onProjectSelect, onCreateClick }: ProjectListProps) {
    const [projects, setProjects] = useState<(Project & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const auth = getAuth();
                let user = auth.currentUser;

                if (!user) {
                    const result = await signInAnonymously(auth);
                    user = result.user;
                }

                if (user) {
                    const userProjects = await listProjectsByUser(user.uid);
                    setProjects(userProjects);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load projects');
            } finally {
                setLoading(false);
            }
        };

        loadProjects();
    }, []);

    if (loading) {
        return <div className="project-list-container"><p>Loading projects...</p></div>;
    }

    if (error) {
        return <div className="project-list-container"><p className="error">Error: {error}</p></div>;
    }

    return (
        <div className="project-list-container">
            <div className="project-list-header">
                <h2>My Projects</h2>
                <button className="btn-primary" onClick={onCreateClick}>
                    + New Project
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="empty-state">
                    <p>No projects yet. Create one to get started!</p>
                </div>
            ) : (
                <div className="project-grid">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="project-card"
                            onClick={() => onProjectSelect(project.id)}
                        >
                            <h3>{project.name}</h3>
                            <p className="project-meta">
                                Created: {new Date(project.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

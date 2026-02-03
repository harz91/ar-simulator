import { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { createProject } from '../lib/firestore';
import '../styles/CreateProjectForm.css';

interface CreateProjectFormProps {
    onProjectCreated: () => void;
    onCancel: () => void;
}

export function CreateProjectForm({ onProjectCreated, onCancel }: CreateProjectFormProps) {
    const [projectName, setProjectName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!projectName.trim()) {
            setError('Project name is required');
            return;
        }

        try {
            setLoading(true);
            const auth = getAuth();
            const user = auth.currentUser;

            if (!user) {
                setError('User not authenticated');
                return;
            }

            await createProject(user.uid, projectName);
            onProjectCreated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-project-overlay">
            <div className="create-project-modal">
                <h2>Create New Project</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="projectName">Project Name</label>
                        <input
                            id="projectName"
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Enter project name"
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { Project, Step, NodeMetadata } from 'shared';
import { getProject, getProjectSteps, saveNodeMetadata, createStep, saveDisplacement, getStepDisplacements } from '../lib/firestore';
import { uploadGLB, downloadGLB } from '../lib/storage';
import { loadGLBFromArrayBuffer, highlightNode } from '../lib/glb-loader';
import { GLBViewport } from './GLBViewport';
import '../styles/ProjectDetail.css';

interface ProjectDetailProps {
    projectId: string;
    onBack: () => void;
}

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
    const [project, setProject] = useState<(Project & { id: string }) | null>(null);
    const [steps, setSteps] = useState<(Step & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [glbScene, setGlbScene] = useState<THREE.Scene | null>(null);
    const [nodes, setNodes] = useState<NodeMetadata[]>([]);
    const [uploading, setUploading] = useState(false);
    const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null);
    const [stepTitle, setStepTitle] = useState('');
    const [stepInstruction, setStepInstruction] = useState('');
    const [stepDuration, setStepDuration] = useState(1000);
    const [creatingStep, setCreatingStep] = useState(false);
    const [capturedFromPosition, setCapturedFromPosition] = useState<[number, number, number] | null>(null);
    const [previewingStepId, setPreviewingStepId] = useState<string | null>(null);

    useEffect(() => {
        const loadProjectData = async () => {
            try {
                const projectData = await getProject(projectId);
                if (projectData) {
                    setProject(projectData);
                    const projectSteps = await getProjectSteps(projectId);
                    setSteps(projectSteps.sort((a, b) => a.order - b.order));
                } else {
                    setError('Project not found');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load project');
            } finally {
                setLoading(false);
            }
        };

        loadProjectData();
    }, [projectId]);

    const handleGLBUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            // Upload GLB to Firebase Storage
            await uploadGLB(projectId, file);

            // Download and load GLB
            const arrayBuffer = await downloadGLB(projectId);
            const { scene, nodes: loadedNodes } = await loadGLBFromArrayBuffer(arrayBuffer);

            setGlbScene(scene);
            setNodes(loadedNodes);

            // Save node metadata to Firestore
            await saveNodeMetadata(projectId, loadedNodes);

            // Update project with sourceGlbPath
            setProject(prev => prev ? { ...prev, sourceGlbPath: `projects/${projectId}/source.glb` } : null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload GLB');
        } finally {
            setUploading(false);
        }
    };

    const handleNodeSelect = (nodeIndex: number) => {
        setSelectedNodeIndex(nodeIndex);
        if (glbScene) {
            // Clear previous highlight
            if (selectedNodeIndex !== null) {
                highlightNode(glbScene, selectedNodeIndex, false);
            }
            // Highlight new node
            highlightNode(glbScene, nodeIndex, true);
        }
    };

    const getSelectedNodeObject = (): THREE.Object3D | null => {
        if (selectedNodeIndex === null || !glbScene) return null;
        let currentIndex = 0;
        let foundNode: THREE.Object3D | null = null;

        glbScene.traverse((object: any) => {
            if (foundNode) return;
            if (object instanceof THREE.Mesh) {
                let hasMesh = false;
                object.parent?.traverse((child: any) => {
                    if (child instanceof THREE.Mesh) {
                        hasMesh = true;
                    }
                });

                if (hasMesh && currentIndex === selectedNodeIndex) {
                    foundNode = object.parent || object;
                }
                currentIndex++;
            }
        });

        return foundNode;
    };

    const handleCaptureFromPosition = () => {
        const selectedNode = getSelectedNodeObject();
        if (selectedNode) {
            setCapturedFromPosition([selectedNode.position.x, selectedNode.position.y, selectedNode.position.z]);
        }
    };

    const handleCreateStep = async () => {
        if (!project || !stepTitle || !stepInstruction || selectedNodeIndex === null || !capturedFromPosition) {
            setError('Please fill all fields and capture from position');
            return;
        }

        setCreatingStep(true);
        try {
            const newStepId = await createStep(projectId, stepTitle, stepInstruction, stepDuration);

            // Get the current position as "to" position
            const selectedNode = getSelectedNodeObject();
            if (selectedNode) {
                const toPosition: [number, number, number] = [selectedNode.position.x, selectedNode.position.y, selectedNode.position.z];

                // Save displacement
                await saveDisplacement(projectId, newStepId, {
                    id: `disp_${selectedNodeIndex}`,
                    nodeId: nodes[selectedNodeIndex]?.nodeId || `node_${selectedNodeIndex}`,
                    fromPosition: capturedFromPosition,
                    toPosition,
                });
            }

            // Reload steps
            const projectSteps = await getProjectSteps(projectId);
            setSteps(projectSteps.sort((a, b) => a.order - b.order));

            // Reset form
            setStepTitle('');
            setStepInstruction('');
            setStepDuration(1000);
            setCapturedFromPosition(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create step');
        } finally {
            setCreatingStep(false);
        }
    };

    const handlePreviewStep = async (stepId: string) => {
        if (selectedNodeIndex === null || !glbScene) return;

        const selectedNode = getSelectedNodeObject();
        if (!selectedNode) return;

        const step = steps.find(s => s.id === stepId);
        if (!step) return;

        const displacements = await getStepDisplacements(projectId, stepId);
        const displacement = displacements.find(d => d.nodeId === nodes[selectedNodeIndex]?.nodeId);

        if (!displacement) return;

        setPreviewingStepId(stepId);

        const startTime = Date.now();
        const duration = step.durationMs;
        const fromPos = displacement.fromPosition;
        const toPos = displacement.toPosition;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            selectedNode.position.x = fromPos[0] + (toPos[0] - fromPos[0]) * progress;
            selectedNode.position.y = fromPos[1] + (toPos[1] - fromPos[1]) * progress;
            selectedNode.position.z = fromPos[2] + (toPos[2] - fromPos[2]) * progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setPreviewingStepId(null);
            }
        };

        animate();
    };

    if (loading) {
        return (
            <div className="project-detail-container">
                <button className="btn-back" onClick={onBack}>← Back</button>
                <p>Loading project...</p>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="project-detail-container">
                <button className="btn-back" onClick={onBack}>← Back</button>
                <p className="error">Error: {error || 'Project not found'}</p>
            </div>
        );
    }

    return (
        <div className="project-detail-container">
            <button className="btn-back" onClick={onBack}>← Back</button>

            <div className="project-header">
                <h1>{project.name}</h1>
                <div className="project-info">
                    <p><strong>Created:</strong> {new Date(project.createdAt).toLocaleString()}</p>
                    <p><strong>Last Updated:</strong> {new Date(project.updatedAt).toLocaleString()}</p>
                </div>
            </div>

            <div className="project-content">
                <section className="assets-section">
                    <h2>Assets</h2>
                    <div className="asset-info">
                        <div className="glb-upload-section">
                            <label htmlFor="glb-input" className="upload-label">
                                Upload GLB File:
                            </label>
                            <input
                                id="glb-input"
                                type="file"
                                accept=".glb"
                                onChange={handleGLBUpload}
                                disabled={uploading}
                                className="file-input"
                            />
                            {uploading && <span className="uploading-text">Uploading...</span>}
                            {project.sourceGlbPath && (
                                <p className="success-text">✓ GLB uploaded: {project.sourceGlbPath}</p>
                            )}
                        </div>
                    </div>
                </section>

                {glbScene && nodes.length > 0 && (
                    <section className="viewport-section">
                        <h2>3D Model Viewer</h2>
                        <GLBViewport
                            scene={glbScene}
                            nodes={nodes}
                            onNodeSelect={handleNodeSelect}
                            selectedNodeIndex={selectedNodeIndex}
                        />
                    </section>
                )}

                <section className="steps-section">
                    <h2>Step Editor</h2>
                    {selectedNodeIndex !== null && (
                        <div className="step-editor">
                            <div className="editor-form">
                                <div className="form-group">
                                    <label htmlFor="step-title">Step Title:</label>
                                    <input
                                        id="step-title"
                                        type="text"
                                        value={stepTitle}
                                        onChange={(e) => setStepTitle(e.target.value)}
                                        placeholder="Enter step title"
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="step-instruction">Instruction:</label>
                                    <input
                                        id="step-instruction"
                                        type="text"
                                        value={stepInstruction}
                                        onChange={(e) => setStepInstruction(e.target.value)}
                                        placeholder="Enter step instruction"
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="step-duration">Duration (ms):</label>
                                    <input
                                        id="step-duration"
                                        type="number"
                                        value={stepDuration}
                                        onChange={(e) => setStepDuration(parseInt(e.target.value) || 1000)}
                                        min="100"
                                        className="form-input"
                                    />
                                </div>
                                <div className="button-group">
                                    <button
                                        onClick={handleCaptureFromPosition}
                                        className="btn-capture"
                                        disabled={creatingStep}
                                    >
                                        {capturedFromPosition ? '✓ From Position Captured' : 'Capture From Position'}
                                    </button>
                                    <button
                                        onClick={handleCreateStep}
                                        className="btn-create-step"
                                        disabled={creatingStep || !capturedFromPosition}
                                    >
                                        {creatingStep ? 'Creating...' : 'Create Step'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {selectedNodeIndex === null && (
                        <p className="empty-message">Select a part to create steps</p>
                    )}

                    <h2>Steps ({steps.length})</h2>
                    {steps.length === 0 ? (
                        <p className="empty-message">No steps yet</p>
                    ) : (
                        <div className="steps-list">
                            {steps.map((step) => (
                                <div key={step.id} className="step-item">
                                    <div className="step-number">{step.order}</div>
                                    <div className="step-content">
                                        <h3>{step.title}</h3>
                                        <p>{step.instruction}</p>
                                        <p className="step-duration">Duration: {step.durationMs}ms</p>
                                    </div>
                                    <button
                                        onClick={() => handlePreviewStep(step.id)}
                                        className="btn-preview"
                                        disabled={previewingStepId === step.id}
                                    >
                                        {previewingStepId === step.id ? 'Previewing...' : 'Preview'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

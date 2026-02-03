import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ProjectManifest } from '@ar-simulator/shared'
import '../styles/TrainerView.css'

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'model-viewer': ModelViewerProps
        }
    }
}

interface ModelViewerProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> {
    src?: string
    ar?: boolean
    'ar-modes'?: string
    'camera-controls'?: boolean
    'auto-rotate'?: boolean
}

interface ModelViewerElement extends HTMLElement {
    play: (options: { animationName: string; repetitions: number }) => void
    pause: () => void
}

export function TrainerView() {
    const { projectId } = useParams<{ projectId: string }>()
    const [manifest, setManifest] = useState<ProjectManifest | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [isAnimationPlaying, setIsAnimationPlaying] = useState(false)
    const modelViewerRef = useRef<ModelViewerElement>(null)

    // Fetch manifest on mount
    useEffect(() => {
        const fetchManifest = async () => {
            if (!projectId) {
                setError('Project ID not provided')
                setLoading(false)
                return
            }

            try {
                const response = await fetch(`/api/projects/${projectId}/manifest`)
                if (!response.ok) {
                    if (response.status === 404) {
                        setError('Project not found')
                    } else {
                        setError('Failed to load project manifest')
                    }
                    setLoading(false)
                    return
                }

                const data: ProjectManifest = await response.json()
                setManifest(data)
                setError(null)
            } catch (err) {
                setError('Error loading project manifest')
                console.error('Manifest fetch error:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchManifest()
    }, [projectId])

    // Setup animation finished listener
    useEffect(() => {
        const modelViewer = modelViewerRef.current
        if (!modelViewer) return

        const handleAnimationFinished = () => {
            setIsAnimationPlaying(false)
        }

        modelViewer.addEventListener('finished', handleAnimationFinished)
        return () => {
            modelViewer.removeEventListener('finished', handleAnimationFinished)
        }
    }, [])

    const handlePlayAnimation = () => {
        if (!manifest || !modelViewerRef.current) return

        const currentStep = manifest.steps[currentStepIndex]
        if (!currentStep) return

        setIsAnimationPlaying(true)
        modelViewerRef.current.play({
            animationName: currentStep.animationName,
            repetitions: 1,
        })
    }

    const handlePreviousStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1)
        }
    }

    const handleNextStep = () => {
        if (manifest && currentStepIndex < manifest.steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1)
        }
    }

    if (loading) {
        return (
            <div className="trainer-view loading">
                <p>Loading project...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="trainer-view error">
                <h2>Error</h2>
                <p>{error}</p>
            </div>
        )
    }

    if (!manifest) {
        return (
            <div className="trainer-view error">
                <h2>Error</h2>
                <p>No manifest data available</p>
            </div>
        )
    }

    const currentStep = manifest.steps[currentStepIndex]

    return (
        <div className="trainer-view">
            <div className="trainer-container">
                <div className="model-viewer-container">
                    {manifest.bakedGlbUrl ? (
                        <model-viewer
                            ref={modelViewerRef}
                            src={manifest.bakedGlbUrl}
                            ar
                            ar-modes="webxr scene-viewer quick-look"
                            camera-controls
                            auto-rotate
                            style={{
                                width: '100%',
                                height: '100%',
                            }}
                        />
                    ) : (
                        <div className="no-model">
                            <p>No 3D model available for this project</p>
                        </div>
                    )}
                </div>

                <div className="step-ui">
                    <div className="step-header">
                        <h2>{manifest.name}</h2>
                        <p className="step-counter">
                            Step {currentStepIndex + 1} of {manifest.steps.length}
                        </p>
                    </div>

                    {currentStep && (
                        <div className="step-content">
                            <h3>{currentStep.title}</h3>
                            <p className="instruction">{currentStep.instruction}</p>
                        </div>
                    )}

                    <div className="step-controls">
                        <button
                            onClick={handlePreviousStep}
                            disabled={currentStepIndex === 0}
                            className="btn btn-secondary"
                        >
                            ← Previous
                        </button>

                        <button
                            onClick={handlePlayAnimation}
                            disabled={isAnimationPlaying || !manifest.bakedGlbUrl}
                            className="btn btn-primary"
                        >
                            {isAnimationPlaying ? 'Playing...' : 'Play Animation'}
                        </button>

                        <button
                            onClick={handleNextStep}
                            disabled={
                                currentStepIndex === manifest.steps.length - 1 ||
                                isAnimationPlaying
                            }
                            className="btn btn-secondary"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

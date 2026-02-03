import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Manifest } from 'ar-simulator-shared'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any
    }
  }
}

function Trainer() {
  const { projectId } = useParams<{ projectId: string }>()
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const modelViewerRef = useRef<any>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/manifest`)
      .then(res => res.json())
      .then(setManifest)
  }, [projectId])

  const playStep = () => {
    if (manifest && modelViewerRef.current) {
      const step = manifest.steps[currentStepIndex]
      modelViewerRef.current.animationName = step.animationName
      modelViewerRef.current.play({ repetitions: 1 })
    }
  }

  const nextStep = () => {
    if (manifest && currentStepIndex < manifest.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  return (
    <div>
      <h1>Trainer</h1>
      {manifest && manifest.bakedGlbUrl ? (
        <div>
          <model-viewer
            ref={modelViewerRef}
            src={manifest.bakedGlbUrl}
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            style={{ width: '800px', height: '600px' }}
          ></model-viewer>
          <div>
            <button onClick={prevStep} disabled={currentStepIndex === 0}>Back</button>
            <button onClick={playStep}>Play Step {currentStepIndex + 1}</button>
            <button onClick={nextStep} disabled={currentStepIndex >= manifest.steps.length - 1}>Next</button>
          </div>
          <p>{manifest.steps[currentStepIndex]?.instruction}</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  )
}

export default Trainer
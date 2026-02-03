import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import "@google/model-viewer";
import type { ProjectManifest } from "@ar/shared";

const TrainView = () => {
  const { projectId } = useParams();
  const [manifest, setManifest] = useState<ProjectManifest | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [canAdvance, setCanAdvance] = useState(true);
  const viewerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!projectId) return;
    fetch(`${import.meta.env.VITE_SERVER_URL}/api/projects/${projectId}/manifest`)
      .then((res) => res.json())
      .then((data: ProjectManifest) => setManifest(data));
  }, [projectId]);

  useEffect(() => {
    if (!manifest || !viewerRef.current) return;
    const viewer = viewerRef.current as any;
    const step = manifest.steps[stepIndex];
    if (!step) return;
    setCanAdvance(false);
    viewer.animationName = step.animationName;
    viewer.play({ repetitions: 1, pingpong: false });
    const onFinished = () => setCanAdvance(true);
    viewer.addEventListener("finished", onFinished, { once: true });
  }, [manifest, stepIndex]);

  if (!manifest) {
    return <main>Loading...</main>;
  }

  const step = manifest.steps[stepIndex];

  return (
    <main>
      <h2>{manifest.name}</h2>
      <div className="viewer">
        <model-viewer
          ref={viewerRef}
          src={manifest.bakedGlbUrl}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          exposure="1"
          shadow-intensity="1"
        />
      </div>
      <div className="step-panel">
        <h3>{step?.title}</h3>
        <p>{step?.instruction}</p>
        <div className="inline">
          <button
            className="secondary"
            onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
            disabled={stepIndex === 0}
          >
            Back
          </button>
          <button
            onClick={() => setStepIndex((prev) => Math.min(prev + 1, manifest.steps.length - 1))}
            disabled={!canAdvance || stepIndex >= manifest.steps.length - 1}
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
};

export default TrainView;

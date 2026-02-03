export interface Project {
  id: string;
  name: string;
  ownerUid: string;
  sourceGlbPath?: string;
  bakedGlbPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NodeMetadata {
  nodeId: string;
  name: string;
  path: string;
  nodeIndex: number;
  initialPosition: [number, number, number];
}

export interface Displacement {
  nodeId: string;
  path: string;
  from: [number, number, number];
  to: [number, number, number];
}

export interface Step {
  id: string;
  title: string;
  instruction: string;
  durationMs: number;
  displacements: Displacement[];
}

export interface Manifest {
  bakedGlbUrl: string;
  steps: (Step & { animationName: string })[];
}
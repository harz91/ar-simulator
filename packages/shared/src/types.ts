export type Vector3Tuple = [number, number, number];

export type ProjectStatus = "draft" | "baked" | "error";

export interface ProjectDoc {
  name: string;
  createdAt: number;
  updatedAt: number;
  ownerUid: string;
  sourceGlbPath?: string;
  bakedGlbPath?: string;
  status: ProjectStatus;
}

export interface NodeDoc {
  nodeId: string;
  name: string;
  path: string;
  nodeIndex: number;
  meshName?: string;
  initialPosition: Vector3Tuple;
}

export interface StepDoc {
  order: number;
  title: string;
  instruction: string;
  durationMs: number;
  animationName: string;
  createdAt: number;
}

export interface DisplacementDoc {
  nodeId: string;
  nodePath: string;
  from: Vector3Tuple;
  to: Vector3Tuple;
}

export interface ProjectManifest {
  projectId: string;
  name: string;
  bakedGlbUrl: string;
  steps: StepDoc[];
}

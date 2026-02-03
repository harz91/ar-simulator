/**
 * Shared TypeScript types for AR Simulator
 */

export interface Project {
  id: string;
  name: string;
  ownerUid: string;
  sourceGlbPath: string;
  bakedGlbPath: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Step {
  id: string;
  title: string;
  instruction: string;
  durationMs: number;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Displacement {
  id: string;
  nodeId: string;
  fromPosition: [number, number, number];
  toPosition: [number, number, number];
}

export interface ProjectManifest {
  id: string;
  name: string;
  bakedGlbUrl: string | null;
  steps: Array<{
    id: string;
    title: string;
    instruction: string;
    durationMs: number;
    order: number;
    animationName: string;
  }>;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingSession {
  id: string;
  userId: string;
  projectId: string;
  startedAt: Date;
  completedAt?: Date;
  progress: number;
}

export interface ARMarker {
  id: string;
  projectId: string;
  name: string;
  imageUrl: string;
  metadata: Record<string, unknown>;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface NodeMetadata {
  nodeId: string;
  name: string;
  path: string;
  nodeIndex: number;
  initialPosition: Vector3;
}

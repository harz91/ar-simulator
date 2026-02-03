import * as THREE from 'three';
import { NodeMetadata, Vector3 } from 'shared';

// Dynamic import to avoid module resolution issues
let GLTFLoader: any;

async function loadGLTFLoader() {
  if (!GLTFLoader) {
    const module = await import('three/examples/jsm/loaders/GLTFLoader.js');
    GLTFLoader = module.GLTFLoader;
  }
  return GLTFLoader;
}

export interface LoadedGLBData {
  scene: THREE.Scene;
  nodes: NodeMetadata[];
}

export async function loadGLBFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
): Promise<LoadedGLBData> {
  const GLTFLoaderClass = await loadGLTFLoader();
  const loader = new GLTFLoaderClass();
  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf: any) => {
        const scene = gltf.scene;
        const nodes = traverseSceneGraph(scene);
        URL.revokeObjectURL(url);
        resolve({ scene, nodes });
      },
      undefined,
      (error: any) => {
        URL.revokeObjectURL(url);
        reject(error);
      },
    );
  });
}

function traverseSceneGraph(scene: THREE.Scene): NodeMetadata[] {
  const nodes: NodeMetadata[] = [];
  let nodeIndex = 0;

  function traverse(object: THREE.Object3D, path: string = ''): void {
    const currentPath = path ? `${path}/${object.name}` : object.name || 'root';

    // Check if this object or its children have meshes
    let hasMesh = false;
    object.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        hasMesh = true;
      }
    });

    if (hasMesh) {
      const position = object.position;
      const nodeMetadata: NodeMetadata = {
        nodeId: `node_${nodeIndex}`,
        name: object.name || `Node_${nodeIndex}`,
        path: currentPath,
        nodeIndex,
        initialPosition: {
          x: position.x,
          y: position.y,
          z: position.z,
        } as Vector3,
      };
      nodes.push(nodeMetadata);
      nodeIndex++;
    }

    // Traverse children
    for (const child of object.children) {
      traverse(child, currentPath);
    }
  }

  traverse(scene);
  return nodes;
}

export function highlightNode(
  scene: THREE.Scene,
  nodeIndex: number,
  highlight: boolean = true,
): void {
  let currentIndex = 0;

  scene.traverse((object: any) => {
    if (object instanceof THREE.Mesh) {
      // Check if this mesh belongs to the node we're looking for
      let hasMesh = false;
      object.parent?.traverse((child: any) => {
        if (child instanceof THREE.Mesh) {
          hasMesh = true;
        }
      });

      if (hasMesh && currentIndex === nodeIndex) {
        if (highlight) {
          // Store original material
          if (!object.userData.originalMaterial) {
            object.userData.originalMaterial = object.material;
          }
          // Apply highlight material
          const highlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5,
          });
          object.material = highlightMaterial;
        } else {
          // Restore original material
          if (object.userData.originalMaterial) {
            object.material = object.userData.originalMaterial;
          }
        }
        currentIndex++;
      }
    }
  });
}

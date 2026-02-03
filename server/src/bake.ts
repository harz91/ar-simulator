import { Document, NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { DisplacementDoc, StepDoc } from "@ar/shared";

export interface BakeStep {
  step: StepDoc;
  displacements: DisplacementDoc[];
}

const toSeconds = (ms: number) => ms / 1000;

const getNodePathMap = (doc: Document) => {
  const root = doc.getRoot();
  const scenes = root.listScenes();
  const map = new Map<string, number>();

  const walk = (node: ReturnType<typeof root.listNodes>[number], path: string) => {
    const currentPath = path ? `${path}/${node.getName() || "node"}` : node.getName() || "node";
    const index = root.listNodes().indexOf(node);
    map.set(currentPath, index);
    node.listChildren().forEach((child) => walk(child, currentPath));
  };

  scenes.forEach((scene) => {
    scene.listChildren().forEach((child) => walk(child, scene.getName() || "scene"));
  });

  return map;
};

const findNodeIndex = (doc: Document, nodeIndex: number, nodePath: string) => {
  const root = doc.getRoot();
  const nodes = root.listNodes();
  if (nodeIndex >= 0 && nodes[nodeIndex]) {
    return nodeIndex;
  }
  const map = getNodePathMap(doc);
  return map.get(nodePath) ?? -1;
};

export const bakeGlb = async (glb: Uint8Array, steps: BakeStep[]) => {
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const doc = io.readBinary(glb);
  const root = doc.getRoot();

  steps.forEach(({ step, displacements }) => {
    const animation = root.createAnimation(step.animationName);
    const durationSec = toSeconds(step.durationMs);
    displacements.forEach((disp) => {
      const parsedIndex = Number.parseInt(disp.nodeId, 10);
      const nodeIndex = findNodeIndex(doc, Number.isNaN(parsedIndex) ? -1 : parsedIndex, disp.nodePath);
      if (nodeIndex < 0) {
        return;
      }
      const node = root.listNodes()[nodeIndex];
      const input = root.createAccessor().setArray(new Float32Array([0, durationSec])).setType("SCALAR");
      const output = root
        .createAccessor()
        .setArray(new Float32Array([...disp.from, ...disp.to]))
        .setType("VEC3");
      const sampler = root.createAnimationSampler().setInput(input).setOutput(output).setInterpolation("LINEAR");
      animation.createChannel().setSampler(sampler).setTargetNode(node).setTargetPath("translation");
    });
  });

  return io.writeBinary(doc);
};

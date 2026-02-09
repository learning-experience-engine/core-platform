import type { Node } from "@lxp/schema";
import rawNodes from "../../../content/examples/nodes.json";

const nodes = rawNodes as Node[];

export const loadExamples = (): Node[] => nodes;

export const getNodeById = (id: string, list: Node[]): Node | undefined => {
  return list.find((node) => node.id === id);
};

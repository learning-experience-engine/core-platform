import type { Node, QuestionChain } from "@lxp/schema";
import rawNodes from "../../../content/examples/nodes.json";
import rawChains from "../../../content/examples/chains.json";

const nodes = rawNodes as Node[];
const chains = rawChains as QuestionChain[];

export const loadExamples = (): Node[] => nodes;

export const loadExampleChains = (): QuestionChain[] => chains;

export const getNodeById = (id: string, list: Node[]): Node | undefined => {
  return list.find((node) => node.id === id);
};

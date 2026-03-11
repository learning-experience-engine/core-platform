import type { Domain, Node, QuestionChain } from "@lxp/schema";
import rawNodes from "../../../content/examples/nodes.json" with { type: "json" };
import rawChains from "../../../content/examples/chains.json" with { type: "json" };
import rawDomains from "../../../content/examples/domains.json" with { type: "json" };

const nodes = rawNodes as Node[];
const chains = rawChains as unknown as QuestionChain[];
const domains = rawDomains as Domain[];

export const loadExamples = (): Node[] => nodes;

export const loadExampleChains = (): QuestionChain[] => chains;

export const loadExampleDomains = (): Domain[] => domains;

export const getNodeById = (id: string, list: Node[]): Node | undefined => {
  return list.find((node) => node.id === id);
};

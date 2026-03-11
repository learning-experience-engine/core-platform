export { loadExamples, loadExampleChains, loadExampleDomains, getNodeById } from "./examples.js";
export {
  listNodes,
  listChains,
  getNode,
  getChain,
  searchContent,
  type SearchOptions,
  type SearchResult,
  type SearchResultKind
} from "./contentSearch.js";
export {
  matchScenarios,
  type ScenarioMatch,
  type ScenarioMatchOptions
} from "./scenarioMatcher.js";
export { groupRelationsByFacet, type RelationView } from "./relations.js";
export {
  DEFAULT_ROOT_ID,
  reduceCardStack,
  setStack,
  push,
  pop,
  reset,
  getTop,
  getPrev,
  getBreadcrumb,
  type NodeId,
  type CardStackState,
  type CardStackAction
} from "./cardStack.js";
export {
  createQuestionChainState,
  reduceQuestionChain,
  setChain,
  setStep,
  nextStep,
  prevStep,
  setAge,
  exitChain,
  type QuestionChainState,
  type QuestionChainAction,
  type QuestionChainContext
} from "./questionChain.js";
export type {
  Node,
  Relation,
  RelationType,
  Facet,
  AgeBand,
  QuestionChain,
  ChainStep,
  Domain,
  Difficulty
} from "@lxp/schema";

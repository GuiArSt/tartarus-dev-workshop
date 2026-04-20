/**
 * Kronus Module - Knowledge Oracle for Tartarus
 *
 * Exports the Kronus agent and MCP tool registration
 */

export { registerKronusTools } from "./tools.js";
export { askKronus, buildSummariesIndex } from "./agent.js";
export { buildKronusTools } from "./kronus-tools.js";
export type {
  KronusAskInput,
  KronusResponse,
  KronusSource,
  SummariesIndex,
} from "./types.js";

/**
 * Kronus Module - Knowledge Oracle for Developer Journal
 *
 * Exports the Kronus agent and MCP tool registration
 */

export { registerKronusTools } from './tools.js';
export { askKronus, buildSummariesIndex } from './agent.js';
export type {
  KronusAskInput,
  KronusResponse,
  KronusSource,
  SummariesIndex,
} from './types.js';

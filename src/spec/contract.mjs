// Every spec file carries a machine-readable contract (an HTML comment, invisible when rendered)
// that lists exactly which prototype facts it covers. The parity check compares contracts with a
// fresh manifest; prose around it (human or agent written) is kept across regenerations.
// The blocks themselves live in src/web/public/contract.js: pure ESM, so the browser reads the same
// contract from the Markdown it shows.
export {
  embedContract,
  readContract,
  visibleText,
  readNotes,
  notesBlock,
  citedNodes,
} from '../web/public/contract.js';

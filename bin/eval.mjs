#!/usr/bin/env node
/**
 * Evaluation Harness CLI (EH-001) — G2 validate + G4 record/report.
 *
 * Does not execute coding agents.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatDiagnostics,
  validateSkillStructure,
  recordExecution,
  reportExecution,
  DEFAULT_RUNS_DIRNAME,
} from '../lib/eval/index.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function printHelp() {
  console.log(`Internationalization Engineering — Evaluation Harness (G4)

Usage:
  node bin/eval.mjs validate [--root <path>]
  node bin/eval.mjs record --case <CASE-ID> --input <bundle-dir> [--root <path>] [--runs-dir <path>]
  node bin/eval.mjs report --run <run-id> [--json] [--root <path>] [--runs-dir <path>]
  node bin/eval.mjs --help

Commands:
  validate   Read-only structural checks of the skill package and G3 cases.
  record     Import a prepared execution bundle (does not run agents).
  report     Verify integrity and print a deterministic evaluation report.

Options:
  --root       Package root (default: this skill package)
  --case       Case ID (e.g. MI-001) for record
  --input      Directory containing bundle.json + evidence files
  --run        Recorded run ID for report
  --runs-dir   Override run store directory (default: <root>/${DEFAULT_RUNS_DIRNAME})
  --json       Emit machine-readable JSON report
  --help, -h   Show this help

Exit codes:
  0  success
  1  validation / recording / integrity / report failure
  2  usage error

G4 does not execute Cursor or other agents. Operators must sanitize traces
before ingestion. Evidence hashes prove stored-byte integrity, not authenticity.
`);
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {{
   *   command?: string,
   *   root: string,
   *   help: boolean,
   *   caseId?: string,
   *   input?: string,
   *   runId?: string,
   *   runsDir?: string,
   *   json: boolean,
   * }} */
  const out = { root: packageRoot, help: false, json: false };
  const args = [...argv];
  if (args.length === 0) {
    out.help = true;
    return out;
  }
  while (args.length) {
    const a = args.shift();
    if (a === '--help' || a === '-h') {
      out.help = true;
    } else if (a === '--root') {
      const v = args.shift();
      if (!v) throw Object.assign(new Error('--root requires a path'), { code: 'USAGE' });
      out.root = resolve(v);
    } else if (a === '--case') {
      const v = args.shift();
      if (!v) throw Object.assign(new Error('--case requires a case ID'), { code: 'USAGE' });
      out.caseId = v;
    } else if (a === '--input') {
      const v = args.shift();
      if (!v) throw Object.assign(new Error('--input requires a path'), { code: 'USAGE' });
      out.input = resolve(v);
    } else if (a === '--run') {
      const v = args.shift();
      if (!v) throw Object.assign(new Error('--run requires a run ID'), { code: 'USAGE' });
      out.runId = v;
    } else if (a === '--runs-dir') {
      const v = args.shift();
      if (!v) throw Object.assign(new Error('--runs-dir requires a path'), { code: 'USAGE' });
      out.runsDir = resolve(v);
    } else if (a === '--json') {
      out.json = true;
    } else if (a === 'validate' || a === 'record' || a === 'report') {
      out.command = a;
    } else {
      throw Object.assign(new Error(`Unknown argument: ${a}`), { code: 'USAGE' });
    }
  }
  return out;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    printHelp();
    process.exit(2);
  }

  if (opts.help || !opts.command) {
    printHelp();
    process.exit(0);
  }

  if (opts.command === 'validate') {
    const result = validateSkillStructure(opts.root);
    if (result.ok) {
      console.log(`Structural validation PASSED for ${opts.root}`);
      if (result.warnings.length) {
        console.log('Warnings:');
        console.log(formatDiagnostics(result.warnings));
      }
      process.exit(0);
    }
    console.error(`Structural validation FAILED for ${opts.root}`);
    console.error(formatDiagnostics(result.errors));
    process.exit(1);
  }

  if (opts.command === 'record') {
    if (!opts.caseId || !opts.input) {
      console.error('record requires --case <CASE-ID> and --input <bundle-dir>');
      printHelp();
      process.exit(2);
    }
    const result = await recordExecution({
      packageRoot: opts.root,
      caseId: opts.caseId,
      bundleDir: opts.input,
      runsRoot: opts.runsDir,
    });
    if (!result.ok) {
      console.error('Recording FAILED');
      console.error(result.diagnosticsText || formatDiagnostics(result.errors));
      process.exit(1);
    }
    console.log(`Recorded run ${result.runId}`);
    console.log(`Store: ${result.runDir}`);
    console.log(`Evaluated outcome at import: ${result.outcome}`);
    process.exit(0);
  }

  if (opts.command === 'report') {
    if (!opts.runId) {
      console.error('report requires --run <run-id>');
      printHelp();
      process.exit(2);
    }
    const result = await reportExecution({
      packageRoot: opts.root,
      runId: opts.runId,
      runsRoot: opts.runsDir,
      json: opts.json,
    });
    if (!result.ok) {
      if (opts.json && result.report) {
        console.error(JSON.stringify(result.report, null, 2));
      } else {
        console.error(result.text || result.diagnosticsText || formatDiagnostics(result.errors));
      }
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify(result.report, null, 2));
    } else {
      console.log(result.text);
    }
    process.exit(0);
  }

  printHelp();
  process.exit(2);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

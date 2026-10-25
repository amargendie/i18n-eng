import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
  realpathSync,
  lstatSync,
} from 'node:fs';
import { join, resolve, dirname, normalize, isAbsolute, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { DEFAULT_RUNS_DIRNAME, RECORDED_RUN_SCHEMA_VERSION } from './constants.mjs';
import { diagnostic } from './diagnostics.mjs';
import { sha256File } from './hash.mjs';
import { checkEvidenceFileSizeFromStat, resolveEvidencePath } from './evidence.mjs';

/**
 * @param {string} packageRoot
 * @param {string} [runsDirname]
 */
export function getRunsRoot(packageRoot, runsDirname = DEFAULT_RUNS_DIRNAME) {
  return resolve(packageRoot, runsDirname);
}

/**
 * @param {string} runsRoot
 * @param {string} runId
 */
export function getRunDir(runsRoot, runId) {
  return join(runsRoot, runId);
}

/**
 * @param {string} runsRoot
 * @param {string} runId
 */
export function runExists(runsRoot, runId) {
  return existsSync(getRunDir(runsRoot, runId));
}

/**
 * Safe relative destination under a run's evidence/ tree.
 * @param {string} relativePath
 * @returns {{ ok: true, destRel: string } | { ok: false, errors: import('./diagnostics.mjs').Diagnostic[] }}
 */
export function normalizeEvidenceDest(relativePath) {
  if (typeof relativePath !== 'string' || !relativePath.trim()) {
    return {
      ok: false,
      errors: [diagnostic('EVIDENCE_PATH', 'Evidence path must be non-empty')],
    };
  }
  if (isAbsolute(relativePath)) {
    return {
      ok: false,
      errors: [diagnostic('EVIDENCE_ESCAPE', 'Evidence path must be relative')],
    };
  }
  const normalized = normalize(relativePath);
  if (
    normalized.startsWith('..' + sep) ||
    normalized === '..' ||
    normalized.includes(sep + '..' + sep)
  ) {
    return {
      ok: false,
      errors: [diagnostic('EVIDENCE_ESCAPE', 'Evidence path must not escape storage')],
    };
  }
  // Always store under evidence/ prefix inside the run directory.
  const stripped = normalized.startsWith('evidence' + sep)
    ? normalized
    : join('evidence', normalized);
  return { ok: true, destRel: stripped.split('\\').join('/') };
}

/**
 * Copy evidence from bundle root into staging, computing hashes.
 * Rejects destination collisions with differing content.
 *
 * @param {Array<{ kind: string, path: string }>} refs
 * @param {string} bundleRoot
 * @param {string} stagingDir
 * @returns {Promise<{ ok: true, inventory: object[] } | { ok: false, errors: import('./diagnostics.mjs').Diagnostic[] }>}
 */
export async function stageEvidenceFiles(refs, bundleRoot, stagingDir) {
  /** @type {import('./diagnostics.mjs').Diagnostic[]} */
  const errors = [];
  /** @type {Map<string, { sha256: string, kind: string, sourcePath: string }>} */
  const destMap = new Map();
  /** @type {object[]} */
  const inventory = [];

  for (const ref of refs) {
    const resolved = resolveEvidencePath(ref.path, bundleRoot, 'evidence.path');
    if (!resolved.ok) {
      errors.push(...resolved.errors);
      continue;
    }
    const dest = normalizeEvidenceDest(ref.path);
    if (!dest.ok) {
      errors.push(...dest.errors);
      continue;
    }
    // Bound resource use: size via stat before streaming hash/copy.
    const st = lstatSync(resolved.absolutePath);
    const sizeCheck = checkEvidenceFileSizeFromStat(st.size, 'evidence.path', ref.path);
    if (!sizeCheck.ok) {
      errors.push(...sizeCheck.errors);
      continue;
    }
    const hash = await sha256File(resolved.absolutePath);
    const prev = destMap.get(dest.destRel);
    if (prev) {
      if (prev.sha256 !== hash) {
        errors.push(
          diagnostic(
            'EVIDENCE_COLLISION',
            `Conflicting evidence destination "${dest.destRel}" with different content`,
            { path: dest.destRel },
          ),
        );
      }
      // Same content: reuse; still record inventory entry for this ref.
      inventory.push({
        kind: ref.kind,
        sourcePath: ref.path,
        storedPath: dest.destRel,
        sha256: hash,
        bytes: lstatSync(resolved.absolutePath).size,
      });
      continue;
    }
    destMap.set(dest.destRel, { sha256: hash, kind: ref.kind, sourcePath: ref.path });
    const absDest = join(stagingDir, dest.destRel);
    mkdirSync(dirname(absDest), { recursive: true });
    // Refuse if dest somehow escapes staging (defense in depth).
    const stagingReal = realpathSync(stagingDir);
    const parentReal = realpathSync(dirname(absDest));
    if (parentReal !== stagingReal && !parentReal.startsWith(stagingReal + sep)) {
      errors.push(
        diagnostic('EVIDENCE_ESCAPE', 'Staged evidence path escaped staging root', {
          path: dest.destRel,
        }),
      );
      continue;
    }
    cpSync(resolved.absolutePath, absDest);
    inventory.push({
      kind: ref.kind,
      sourcePath: ref.path,
      storedPath: dest.destRel,
      sha256: hash,
      bytes: lstatSync(absDest).size,
    });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, inventory };
}

/**
 * Atomically publish a staging directory to runsRoot/runId.
 * Cleans staging on failure. Does not overwrite existing runs.
 *
 * @param {string} runsRoot
 * @param {string} runId
 * @param {(stagingDir: string) => Promise<void> | void} populate
 * @param {{ failBeforePublish?: () => void }} [hooks] test-only hooks
 */
export async function atomicPublishRun(runsRoot, runId, populate, hooks = {}) {
  mkdirSync(runsRoot, { recursive: true });
  const finalDir = getRunDir(runsRoot, runId);
  if (existsSync(finalDir)) {
    return {
      ok: false,
      errors: [
        diagnostic('RUN_EXISTS', `Run ID already exists: ${runId}`, { path: runId }),
      ],
    };
  }

  const staging = mkdtempSync(join(runsRoot, `.staging-${runId}-`));
  try {
    await populate(staging);
    if (hooks.failBeforePublish) hooks.failBeforePublish();
    // Re-check existence immediately before rename (TOCTOU mitigation).
    if (existsSync(finalDir)) {
      rmSync(staging, { recursive: true, force: true });
      return {
        ok: false,
        errors: [
          diagnostic('RUN_EXISTS', `Run ID already exists: ${runId}`, { path: runId }),
        ],
      };
    }
    renameSync(staging, finalDir);
    return { ok: true, runDir: finalDir, errors: [] };
  } catch (err) {
    rmSync(staging, { recursive: true, force: true });
    // Ensure no partial final dir.
    if (existsSync(finalDir) && !existsSync(join(finalDir, 'manifest.json'))) {
      try {
        rmSync(finalDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
    if (err && typeof err === 'object' && Array.isArray(/** @type {{ errors?: unknown }} */ (err).errors)) {
      return {
        ok: false,
        errors: /** @type {import('./diagnostics.mjs').Diagnostic[]} */ (
          /** @type {{ errors: unknown }} */ (err).errors
        ),
      };
    }
    return {
      ok: false,
      errors: [
        diagnostic('RECORD_FAILED', 'Recording failed; staging cleaned', {
          detail: err instanceof Error ? err.message : String(err),
        }),
      ],
    };
  }
}

/**
 * Load a recorded run manifest.
 * @param {string} runDir
 */
export function loadManifest(runDir) {
  const path = join(runDir, 'manifest.json');
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (raw.schemaVersion !== RECORDED_RUN_SCHEMA_VERSION) {
    throw Object.assign(new Error(`Unsupported recorded run schema: ${raw.schemaVersion}`), {
      code: 'SCHEMA_VERSION',
    });
  }
  return raw;
}

/**
 * Verify stored evidence hashes match the manifest inventory.
 * @param {string} runDir
 * @param {Array<{ storedPath: string, sha256: string }>} inventory
 */
export async function verifyEvidenceIntegrity(runDir, inventory) {
  /** @type {import('./diagnostics.mjs').Diagnostic[]} */
  const errors = [];
  for (const item of inventory) {
    const abs = join(runDir, item.storedPath);
    if (!existsSync(abs)) {
      errors.push(
        diagnostic('INTEGRITY', `Missing evidence file: ${item.storedPath}`, {
          path: item.storedPath,
        }),
      );
      continue;
    }
    const actual = await sha256File(abs);
    if (actual !== item.sha256) {
      errors.push(
        diagnostic(
          'INTEGRITY',
          `SHA-256 mismatch for ${item.storedPath} (stored evidence may have been tampered with)`,
          { path: item.storedPath },
        ),
      );
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Write manifest JSON into a directory.
 * @param {string} dir
 * @param {object} manifest
 */
export function writeManifest(dir, manifest) {
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

/** Exported for tests that need an isolated temp runs root outside the package. */
export function createTempRunsRoot() {
  return mkdtempSync(join(tmpdir(), 'eh-runs-'));
}

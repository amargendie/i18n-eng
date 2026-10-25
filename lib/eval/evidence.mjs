import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { isAbsolute, join, normalize, resolve, sep } from 'node:path';
import {
  EVIDENCE_KINDS,
  EVIDENCE_REF_SCHEMA_VERSION,
  MAX_EVIDENCE_FILE_BYTES,
  VERIFIED_PASS_EVIDENCE,
} from './constants.mjs';
import { diagnostic } from './diagnostics.mjs';

/**
 * @typedef {{
 *   schemaVersion?: string,
 *   kind: string,
 *   path: string,
 * }} EvidenceRef
 */

/**
 * @param {unknown} raw
 * @param {string} path
 * @returns {import('./diagnostics.mjs').Diagnostic[]}
 */
export function validateEvidenceRefShape(raw, path = 'evidence[]') {
  /** @type {import('./diagnostics.mjs').Diagnostic[]} */
  const errors = [];
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return [diagnostic('SCHEMA_TYPE', 'Evidence reference must be an object', { path })];
  }
  const e = /** @type {Record<string, unknown>} */ (raw);
  if (e.schemaVersion !== undefined && e.schemaVersion !== EVIDENCE_REF_SCHEMA_VERSION) {
    errors.push(
      diagnostic(
        'SCHEMA_VERSION',
        `schemaVersion must be "${EVIDENCE_REF_SCHEMA_VERSION}" when present`,
        { path: `${path}.schemaVersion`, detail: e.schemaVersion },
      ),
    );
  }
  if (typeof e.kind !== 'string' || !EVIDENCE_KINDS.includes(e.kind)) {
    errors.push(
      diagnostic(
        'EVIDENCE_KIND',
        `Unknown or missing evidence kind (allowed: ${EVIDENCE_KINDS.join(', ')})`,
        { path: `${path}.kind`, detail: e.kind },
      ),
    );
  }
  if (typeof e.path !== 'string' || e.path.trim() === '') {
    errors.push(
      diagnostic('EVIDENCE_PATH', 'Evidence path must be a non-empty string', {
        path: `${path}.path`,
      }),
    );
  }
  return errors;
}

/**
 * Resolve and bound-check an evidence path under evaluationRoot.
 * Rejects absolute paths, missing files, and escapes (including symlink traversal).
 * Does not read or execute evidence file contents.
 *
 * @param {string} relativePath
 * @param {string} evaluationRoot
 * @param {string} diagPath
 * @returns {{ ok: true, absolutePath: string } | { ok: false, errors: import('./diagnostics.mjs').Diagnostic[] }}
 */
export function resolveEvidencePath(relativePath, evaluationRoot, diagPath = 'evidence.path') {
  if (typeof relativePath !== 'string' || relativePath.trim() === '') {
    return {
      ok: false,
      errors: [
        diagnostic('EVIDENCE_PATH', 'Evidence path must be a non-empty string', {
          path: diagPath,
        }),
      ],
    };
  }
  if (isAbsolute(relativePath)) {
    return {
      ok: false,
      errors: [
        diagnostic('EVIDENCE_ESCAPE', 'Evidence path must be relative to the evaluation root', {
          path: diagPath,
          detail: relativePath,
        }),
      ],
    };
  }

  const normalized = normalize(relativePath);
  if (normalized.startsWith('..' + sep) || normalized === '..' || normalized.includes(sep + '..' + sep)) {
    return {
      ok: false,
      errors: [
        diagnostic('EVIDENCE_ESCAPE', 'Evidence path must not escape the evaluation root', {
          path: diagPath,
          detail: relativePath,
        }),
      ],
    };
  }

  let rootReal;
  try {
    rootReal = realpathSync(evaluationRoot);
  } catch {
    return {
      ok: false,
      errors: [
        diagnostic('EVIDENCE_ROOT', 'Evaluation root does not exist or is not readable', {
          path: 'evaluationRoot',
          detail: evaluationRoot,
        }),
      ],
    };
  }

  const candidate = resolve(join(rootReal, normalized));

  // Pre-realpath containment of the lexical join (blocks obvious escapes).
  if (candidate !== rootReal && !candidate.startsWith(rootReal + sep)) {
    return {
      ok: false,
      errors: [
        diagnostic('EVIDENCE_ESCAPE', 'Evidence path resolves outside the evaluation root', {
          path: diagPath,
          detail: relativePath,
        }),
      ],
    };
  }

  if (!existsSync(candidate)) {
    return {
      ok: false,
      errors: [
        diagnostic('EVIDENCE_MISSING', `Evidence file not found: ${relativePath}`, {
          path: diagPath,
        }),
      ],
    };
  }

  let fileReal;
  try {
    // Resolve symlinks; reject if the final target escapes the root.
    fileReal = realpathSync(candidate);
  } catch {
    return {
      ok: false,
      errors: [
        diagnostic('EVIDENCE_MISSING', `Evidence file not readable: ${relativePath}`, {
          path: diagPath,
        }),
      ],
    };
  }

  if (fileReal !== rootReal && !fileReal.startsWith(rootReal + sep)) {
    return {
      ok: false,
      errors: [
        diagnostic(
          'EVIDENCE_ESCAPE',
          'Evidence path escapes the evaluation root via symlink traversal',
          { path: diagPath, detail: relativePath },
        ),
      ],
    };
  }

  // Refuse to treat directories as evidence payloads; enforce size before hash/copy.
  try {
    const st = lstatSync(fileReal);
    if (st.isDirectory()) {
      return {
        ok: false,
        errors: [
          diagnostic('EVIDENCE_PATH', 'Evidence path must point to a file, not a directory', {
            path: diagPath,
            detail: relativePath,
          }),
        ],
      };
    }
    const sizeCheck = checkEvidenceFileSizeFromStat(st.size, diagPath, relativePath);
    if (!sizeCheck.ok) return sizeCheck;
  } catch {
    return {
      ok: false,
      errors: [
        diagnostic('EVIDENCE_MISSING', `Evidence file not readable: ${relativePath}`, {
          path: diagPath,
        }),
      ],
    };
  }

  return { ok: true, absolutePath: fileReal };
}

/**
 * Reject oversized evidence using statted size (no full file read).
 * @param {number} sizeBytes
 * @param {string} diagPath
 * @param {string} [relativePath]
 * @returns {{ ok: true } | { ok: false, errors: import('./diagnostics.mjs').Diagnostic[] }}
 */
export function checkEvidenceFileSizeFromStat(sizeBytes, diagPath, relativePath = '') {
  if (typeof sizeBytes !== 'number' || sizeBytes < 0 || !Number.isFinite(sizeBytes)) {
    return {
      ok: false,
      errors: [
        diagnostic('EVIDENCE_PATH', 'Unable to determine evidence file size', { path: diagPath }),
      ],
    };
  }
  if (sizeBytes > MAX_EVIDENCE_FILE_BYTES) {
    return {
      ok: false,
      errors: [
        diagnostic(
          'EVIDENCE_TOO_LARGE',
          `Evidence file exceeds ${MAX_EVIDENCE_FILE_BYTES} bytes (10 MiB)` +
            (relativePath ? `: ${relativePath}` : ''),
          { path: diagPath, detail: { sizeBytes, maxBytes: MAX_EVIDENCE_FILE_BYTES } },
        ),
      ],
    };
  }
  return { ok: true };
}

/**
 * Validate evidence refs for shape, kind, existence, and path safety.
 * @param {unknown[]} evidence
 * @param {string} evaluationRoot
 * @param {string} [basePath]
 * @returns {{ ok: boolean, errors: import('./diagnostics.mjs').Diagnostic[], refs: EvidenceRef[] }}
 */
export function validateEvidenceList(evidence, evaluationRoot, basePath = 'evidence') {
  /** @type {import('./diagnostics.mjs').Diagnostic[]} */
  const errors = [];
  /** @type {EvidenceRef[]} */
  const refs = [];

  if (!Array.isArray(evidence)) {
    return {
      ok: false,
      errors: [diagnostic('SCHEMA_TYPE', 'evidence must be an array', { path: basePath })],
      refs: [],
    };
  }

  evidence.forEach((item, i) => {
    const p = `${basePath}[${i}]`;
    const shapeErrors = validateEvidenceRefShape(item, p);
    errors.push(...shapeErrors);
    if (shapeErrors.length) return;
    const e = /** @type {EvidenceRef} */ (item);
    const resolved = resolveEvidencePath(e.path, evaluationRoot, `${p}.path`);
    if (!resolved.ok) {
      errors.push(...resolved.errors);
      return;
    }
    refs.push({
      kind: e.kind,
      path: e.path,
      ...(e.schemaVersion ? { schemaVersion: e.schemaVersion } : {}),
    });
  });

  return { ok: errors.length === 0, errors, refs };
}

/**
 * Whether evidence kinds satisfy the verification method for a verified pass.
 * Policy is explicit and non-scored.
 * @param {string} verificationMethod
 * @param {EvidenceRef[]} refs
 * @returns {boolean}
 */
export function hasCompatibleEvidenceForVerifiedPass(verificationMethod, refs) {
  const allowed = VERIFIED_PASS_EVIDENCE[verificationMethod];
  if (!allowed) return false;
  return refs.some((r) => allowed.includes(r.kind));
}

/**
 * Explain why a declared pass is not verified.
 * @param {string} verificationMethod
 * @param {EvidenceRef[]} refs
 * @returns {string | null} null if verified
 */
export function unverifiedPassReason(verificationMethod, refs) {
  if (hasCompatibleEvidenceForVerifiedPass(verificationMethod, refs)) return null;
  const allowed = VERIFIED_PASS_EVIDENCE[verificationMethod] ?? [];
  const kinds = refs.map((r) => r.kind);
  if (!refs.length) {
    return `Declared pass for ${verificationMethod} has no evidence`;
  }
  if (kinds.every((k) => k === 'agent_report')) {
    return `Declared pass for ${verificationMethod} cannot be verified from agent_report alone; requires one of: ${allowed.join(', ')}`;
  }
  return `Declared pass for ${verificationMethod} lacks compatible evidence (need one of: ${allowed.join(', ')}; got: ${kinds.join(', ') || 'none'})`;
}

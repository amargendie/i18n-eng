/** Structured diagnostic messages for validation and evaluation. */

/**
 * @typedef {{ code: string, path?: string, message: string, detail?: unknown }} Diagnostic
 */

/**
 * @param {string} code
 * @param {string} message
 * @param {{ path?: string, detail?: unknown }} [extra]
 * @returns {Diagnostic}
 */
export function diagnostic(code, message, extra = {}) {
  const out = { code, message };
  if (extra.path !== undefined) out.path = extra.path;
  if (extra.detail !== undefined) out.detail = extra.detail;
  return out;
}

/**
 * @param {Diagnostic[]} diagnostics
 * @returns {string}
 */
export function formatDiagnostics(diagnostics) {
  if (!diagnostics.length) return 'OK';
  return diagnostics
    .map((d) => {
      const loc = d.path ? ` [${d.path}]` : '';
      return `${d.code}${loc}: ${d.message}`;
    })
    .join('\n');
}

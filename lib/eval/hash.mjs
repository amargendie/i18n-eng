import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

/**
 * SHA-256 hex digest of a file (streaming; does not execute file contents).
 * @param {string} absolutePath
 * @returns {Promise<string>}
 */
export function sha256File(absolutePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(absolutePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Synchronous SHA-256 for small test fixtures.
 * @param {Buffer | string} data
 * @returns {string}
 */
export function sha256Buffer(data) {
  return createHash('sha256').update(data).digest('hex');
}

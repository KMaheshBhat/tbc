import { sep } from 'node:path';

/**
 * Normalise a path to the POSIX (`/`) separator.
 *
 * Every *identity* the TBC product writes into a vault — a collection record
 * id, a generated skill id, a digest `SOURCE` marker, an asset manifest key —
 * is a **relative path**, and a relative path is a *portable* artefact: the
 * same vault, cloned between a Windows drive and a WSL2 drive, must carry the
 * same identities on both hosts. A `\` in an id would index the same vault
 * differently depending on the host that wrote it.
 *
 * `node:path` hands back OS-native separators (`\` on Windows), so every
 * *producer* of such an identity must run its output through this function.
 * Normalising at the producer keeps the on-disk format identical on both
 * platforms, which is what makes the vault portable.
 */
export function toPosixPath(value: string): string {
  return sep === '/' ? value : value.split(sep).join('/');
}

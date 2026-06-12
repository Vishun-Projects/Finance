/** Sanitize client-supplied storage paths — reject traversal and non-user prefixes. */
export function sanitizeImportStorageKey(storageKey: string, userId: string): string | null {
  const normalized = storageKey.replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\/+/, '');
  const allowedPrefixes = [
    `uploads/${userId}/`,
    `temp/import/${userId}/`,
    'uploads/bank-statements/',
  ];
  if (!allowedPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return null;
  }
  return normalized;
}

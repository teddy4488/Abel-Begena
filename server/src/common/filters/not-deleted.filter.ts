/**
 * Shared filter for MongoDB queries to exclude soft-deleted documents.
 * Use when your schema uses deletedAt for soft deletes.
 */
export function notDeletedFilter(): { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] } {
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

type SortOrder = 'asc' | 'desc';

export const isValidSortOrder = (value: unknown): value is SortOrder => {
  return typeof value == 'string' && (value == 'asc' || value == 'desc');
};
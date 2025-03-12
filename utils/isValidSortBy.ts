type SortBy = 'self_stake' | 'withdraw' | 'ratio' | 'sold'; 

export const isValidSortBy = (value: unknown): value is SortBy => {
  return typeof value == 'string' && (value == 'self_stake' || value == 'withdraw' || value == 'ratio' || value == 'sold');
};
type SortBy = 'total_stake' | 'total_withdraw' | 'sold' | 'self_stake' | 'percentage_sold';

export const isValidSortBy = (value: unknown): value is SortBy => {
  return typeof value == 'string' && (value == 'self_stake' || value == 'withdraw' || value == 'ratio' || value == 'sold');
};
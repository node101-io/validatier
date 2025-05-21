type SortBy = 'total_stake' | 'total_withdraw' | 'sold' | 'self_stake' | 'percentage_sold';

export const isValidSortBy = (value: unknown): value is SortBy => {
  return typeof value == 'string' && (value == 'total_stake' || value == 'total_withdraw' || value == 'sold' || value == 'self_stake' || value == 'percentage_sold');
};
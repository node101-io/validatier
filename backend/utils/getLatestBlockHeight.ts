export const getLatestBlockHeight = (apiResponse: Record<string, { latest_block_height: number }>): {
  latest_block_height: number;
} => {
  let latest_block_height = 0;
  Object.values(apiResponse).forEach(node => {
    if (node.latest_block_height > latest_block_height) {
      latest_block_height = node.latest_block_height;
    }
  });
  return { latest_block_height };
}

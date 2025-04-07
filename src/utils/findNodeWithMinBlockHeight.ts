
export const findNodeWithMinBlockHeight = (apiResponse: Record<string, any>): {
  ip_address: string;
  earliest_block_height: number;
  latest_block_height: number;
  data_since: string;
} | null => {
  let minNode = null;
  
  for (const [ip, data] of Object.entries(apiResponse)) {
    const { earliest_block_height , latest_block_height, data_since } = data;
  
    if (minNode === null || earliest_block_height < minNode.earliest_block_height) {
      minNode = { earliest_block_height, latest_block_height, ip_address: ip, data_since: data_since };
    }
  }

  return minNode;  
}

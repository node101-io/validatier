
export const findGenesisNodes = (apiResponse: Record<string, any>): {
  ip_addresses: string[];
  earliest_block_height: number;
  latest_block_height: number;
  data_since: string;
} | null => {
  let genesisNodes = null;
  
  for (const [ip, data] of Object.entries(apiResponse)) {
    const { earliest_block_height , latest_block_height, data_since } = data;
  
    if (earliest_block_height == 5200791) {
      if (!genesisNodes)
        genesisNodes = { earliest_block_height, latest_block_height, ip_addresses: [ip], data_since: data_since };
      else
        genesisNodes.ip_addresses.push(ip);
    }
  }

  return genesisNodes;  
}



import { Tendermint34Client, ValidatorsResponse } from "@cosmjs/tendermint-rpc";


export const fetchIpAddresses = async function getPeers(): Promise<any> {
  try {
      const rpcEndpoint: string = "https://cosmos-rpc.publicnode.com";
      
      const client: Tendermint34Client = await Tendermint34Client.connect(rpcEndpoint);

      const params: any = [];
      const validatorsMasterRawResponse = await client.validators(params);
      return validatorsMasterRawResponse;

  } catch (error) {
      return console.error("Hata oluştu:", error);
  }
}



import { Tendermint34Client, ValidatorsParams, ValidatorsResponse } from "@cosmjs/tendermint-rpc";

export const fetchIpAddresses = async function getPeers(): Promise<ValidatorsResponse | null> {
  try {
      const rpcEndpoint: string = "https://cosmos-rpc.publicnode.com";
      
      const client: Tendermint34Client = await Tendermint34Client.connect(rpcEndpoint);

      const params: ValidatorsParams = {};
      const validatorsMasterRawResponse: ValidatorsResponse = await client.validators(params);
      return validatorsMasterRawResponse;

  } catch (error) {
      console.log(`${new Date()} | Error: ${error}`);
      return null;
  }
}

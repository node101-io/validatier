
export interface CreateNewNodeInterface {
  pubkey: {
    algorithm: "ed25519";
    data: Uint8Array;
  };
  votingPower: any;
  address: Uint8Array;
}
export interface DeleteNodeInterface {
  id: string;
}
export interface NodeByIdInterface {
  id: string;
}
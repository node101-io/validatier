
import { Node } from "../../interfaces/node.js";

export const fetchValidatorIpAddress = (node: Node, callback: (err: any, ipAddress: string) => any) => {
  const { pubkey, address } = node;

  /* Some function */

  return callback(null, "172.67.207.44");
}

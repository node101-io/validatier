
import Node, { NodeInterface } from "../../models/Node.js";

export const fetchValidatorIpAddress = (node: NodeInterface, callback: (err: string, ipAddress: string) => any) => {
  const { pubkey, address } = node;

  /* Some function */

  return callback("", "172.67.207.44");
}

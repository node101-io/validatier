export const ed25519PubKeyToHex = function (pubKey: Uint8Array): string {
  if (pubKey.length !== 32) {
    throw new Error("Invalid public key length. Expected 32 bytes.");
  }
  return Buffer.from(pubKey).toString("hex");
}
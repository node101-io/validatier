
export const uint8ArrayToIPv4 = function (uint8Array: Uint8Array): string {

  return Array.from(uint8Array)
    .map(byte => byte.toString())
    .join('.');
}

export const ipv4ToUint8Array = function (ip: string): Uint8Array {
  const parts = ip.split('.');

  const uint8Array = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    const part = parseInt(parts[i], 10);
    if (part < 0 || part > 255 || isNaN(part)) {
      throw new Error('Each part of the IP address must be between 0 and 255');
    }
    uint8Array[i] = part;
  }
  return uint8Array;
}

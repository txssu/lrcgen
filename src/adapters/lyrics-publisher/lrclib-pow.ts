import { CryptoHasher } from "bun";

function hashToHex(input: string): string {
  const hasher = new CryptoHasher("sha256");
  hasher.update(input);
  return hasher.digest("hex");
}

function hexLessOrEqual(hash: string, target: string): boolean {
  for (let i = 0; i < hash.length; i++) {
    if (hash[i]! < target[i]!) return true;
    if (hash[i]! > target[i]!) return false;
  }
  return true;
}

export async function solveChallenge(prefix: string, target: string): Promise<string> {
  let nonce = 0;
  while (true) {
    const nonceStr = String(nonce);
    const hash = hashToHex(prefix + nonceStr);
    if (hexLessOrEqual(hash, target)) {
      return nonceStr;
    }
    nonce++;
    // Yield to event loop every 10000 iterations
    if (nonce % 10000 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}

export async function verifyChallenge(prefix: string, nonce: string, target: string): Promise<boolean> {
  const hash = hashToHex(prefix + nonce);
  return hexLessOrEqual(hash, target);
}

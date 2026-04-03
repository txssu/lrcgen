import { test, expect, describe } from "bun:test";
import { solveChallenge, verifyChallenge } from "./lrclib-pow";

describe("LRCLIB proof-of-work", () => {
  test("solveChallenge finds a nonce that satisfies the target", async () => {
    // Use an easy target (many leading ff's = easy)
    const prefix = "TESTPREFIX1234567890ABCDEF123456";
    const target = "0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    const nonce = await solveChallenge(prefix, target);

    expect(typeof nonce).toBe("string");
    expect(nonce.length).toBeGreaterThan(0);
  });

  test("verifyChallenge confirms solution is valid", async () => {
    const prefix = "TESTPREFIX1234567890ABCDEF123456";
    const target = "0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    const nonce = await solveChallenge(prefix, target);
    const valid = await verifyChallenge(prefix, nonce, target);

    expect(valid).toBe(true);
  });

  test("verifyChallenge rejects invalid nonce", async () => {
    const prefix = "TESTPREFIX1234567890ABCDEF123456";
    const target = "0000000000000000000000000000000000000000000000000000000000000000";

    const valid = await verifyChallenge(prefix, "definitely-wrong", target);

    expect(valid).toBe(false);
  });
});

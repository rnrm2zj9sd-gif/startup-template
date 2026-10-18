import assert from "node:assert/strict";
import test from "node:test";
import { creerJetonSuppression, lireJetonSuppression } from "./jeton-compte";

test("jeton de suppression : signe, relit, refuse le faux", () => {
  process.env.ACCOUNT_TOKEN_SECRET = "test-secret-themilion";
  const { jeton } = creerJetonSuppression("11111111-1111-1111-1111-111111111111");
  assert.deepEqual(lireJetonSuppression(jeton), { userId: "11111111-1111-1111-1111-111111111111" });
  assert.equal(lireJetonSuppression(`${jeton}x`), null);
  assert.equal(lireJetonSuppression("v1.1.pas-uuid.abc"), null);
});

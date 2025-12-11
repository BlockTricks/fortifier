import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.0.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";

Clarinet.test({
  name: "Guard: set spend cap",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const block = chain.mineBlock([
      Tx.contractCall("guard", "set-spend-cap", [
        types.uint(1000000),
        types.uint(144),
      ], deployer.address),
    ]);
    assertEquals(block.receipts[0].result.expectOk(), "true");
  },
});

Clarinet.test({
  name: "Guard: check spend cap",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    chain.mineBlock([
      Tx.contractCall("guard", "set-spend-cap", [
        types.uint(1000000),
        types.uint(144),
      ], deployer.address),
    ]);
    const check = chain.callReadOnlyFn("guard", "check-spend-cap", [
      types.uint(500000),
    ], deployer.address);
    assertEquals(check.result.expectOk(), "true");
  },
});

Clarinet.test({
  name: "Guard: spend cap exceeded",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    chain.mineBlock([
      Tx.contractCall("guard", "set-spend-cap", [
        types.uint(1000000),
        types.uint(144),
      ], deployer.address),
    ]);
    const check = chain.callReadOnlyFn("guard", "check-spend-cap", [
      types.uint(2000000),
    ], deployer.address);
    assertEquals(check.result.expectOk(), "false");
  },
});

Clarinet.test({
  name: "Guard: allow recipient",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const recipient = accounts.get("wallet_1")!;
    chain.mineBlock([
      Tx.contractCall("guard", "enable-allow-list", [], deployer.address),
      Tx.contractCall("guard", "allow-recipient", [
        types.principal(recipient.address),
      ], deployer.address),
    ]);
    const allowed = chain.callReadOnlyFn("guard", "is-recipient-allowed", [
      types.principal(recipient.address),
    ], deployer.address);
    assertEquals(allowed.result.expectOk(), "true");
  },
});

Clarinet.test({
  name: "Guard: deny recipient",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const recipient = accounts.get("wallet_1")!;
    chain.mineBlock([
      Tx.contractCall("guard", "deny-recipient", [
        types.principal(recipient.address),
      ], deployer.address),
    ]);
    const allowed = chain.callReadOnlyFn("guard", "is-recipient-allowed", [
      types.principal(recipient.address),
    ], deployer.address);
    allowed.result.expectErr().expectUint(2003);
  },
});


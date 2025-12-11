import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.0.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";

Clarinet.test({
  name: "Circuit breaker: owner can pause",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const block = chain.mineBlock([
      Tx.contractCall("circuit-breaker", "pause", [], deployer.address),
    ]);
    assertEquals(block.receipts[0].result.expectOk(), "true");
    const paused = chain.callReadOnlyFn("circuit-breaker", "is-paused", [], deployer.address);
    assertEquals(paused.result.expectOk(), "true");
  },
});

Clarinet.test({
  name: "Circuit breaker: unauthorized cannot pause",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet1 = accounts.get("wallet_1")!;
    const block = chain.mineBlock([
      Tx.contractCall("circuit-breaker", "pause", [], wallet1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(1001);
  },
});

Clarinet.test({
  name: "Circuit breaker: owner can unpause",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    chain.mineBlock([
      Tx.contractCall("circuit-breaker", "pause", [], deployer.address),
    ]);
    const block = chain.mineBlock([
      Tx.contractCall("circuit-breaker", "unpause", [], deployer.address),
    ]);
    assertEquals(block.receipts[0].result.expectOk(), "true");
    const paused = chain.callReadOnlyFn("circuit-breaker", "is-paused", [], deployer.address);
    assertEquals(paused.result.expectOk(), "false");
  },
});

Clarinet.test({
  name: "Circuit breaker: staged unpause with rate limit",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    chain.mineBlock([
      Tx.contractCall("circuit-breaker", "pause", [], deployer.address),
    ]);
    const block = chain.mineBlock([
      Tx.contractCall("circuit-breaker", "staged-unpause", [
        types.uint(144),
        types.uint(1000000),
      ], deployer.address),
    ]);
    assertEquals(block.receipts[0].result.expectOk(), "true");
  },
});

Clarinet.test({
  name: "Circuit breaker: guardian can pause",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const guardian = accounts.get("wallet_1")!;
    chain.mineBlock([
      Tx.contractCall("circuit-breaker", "add-guardian", [
        types.principal(guardian.address),
      ], deployer.address),
    ]);
    const block = chain.mineBlock([
      Tx.contractCall("circuit-breaker", "pause", [], guardian.address),
    ]);
    assertEquals(block.receipts[0].result.expectOk(), "true");
  },
});


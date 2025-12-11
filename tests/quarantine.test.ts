import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.0.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";

Clarinet.test({
  name: "Quarantine: quarantine recipient",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const recipient = accounts.get("wallet_1")!;
    const block = chain.mineBlock([
      Tx.contractCall("quarantine", "quarantine-recipient", [
        types.principal(recipient.address),
        types.ascii("Suspicious activity detected"),
        types.uint(8),
      ], deployer.address),
    ]);
    assertEquals(block.receipts[0].result.expectOk(), "true");
    const quarantined = chain.callReadOnlyFn("quarantine", "is-quarantined", [
      types.principal(recipient.address),
    ], deployer.address);
    assertEquals(quarantined.result.expectOk(), "true");
  },
});

Clarinet.test({
  name: "Quarantine: clear quarantine",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const recipient = accounts.get("wallet_1")!;
    chain.mineBlock([
      Tx.contractCall("quarantine", "quarantine-recipient", [
        types.principal(recipient.address),
        types.ascii("Suspicious activity detected"),
        types.uint(8),
      ], deployer.address),
    ]);
    const block = chain.mineBlock([
      Tx.contractCall("quarantine", "clear-quarantine", [
        types.principal(recipient.address),
      ], deployer.address),
    ]);
    assertEquals(block.receipts[0].result.expectOk(), "true");
    const quarantined = chain.callReadOnlyFn("quarantine", "is-quarantined", [
      types.principal(recipient.address),
    ], deployer.address);
    assertEquals(quarantined.result.expectOk(), "false");
  },
});

Clarinet.test({
  name: "Quarantine: guardian can quarantine",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const guardian = accounts.get("wallet_1")!;
    const recipient = accounts.get("wallet_2")!;
    chain.mineBlock([
      Tx.contractCall("quarantine", "add-guardian", [
        types.principal(guardian.address),
      ], deployer.address),
    ]);
    const block = chain.mineBlock([
      Tx.contractCall("quarantine", "quarantine-recipient", [
        types.principal(recipient.address),
        types.ascii("Guardian action"),
        types.uint(5),
      ], guardian.address),
    ]);
    assertEquals(block.receipts[0].result.expectOk(), "true");
  },
});


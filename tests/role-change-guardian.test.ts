import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.0.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";

Clarinet.test({
  name: "Role Change Guardian: propose signer change",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const newSigner = accounts.get("wallet_1")!;
    const target = accounts.get("wallet_2")!;
    const block = chain.mineBlock([
      Tx.contractCall("role-change-guardian", "propose-signer-change", [
        types.principal(target.address),
        types.principal(newSigner.address),
      ], deployer.address),
    ]);
    assertEquals(block.receipts[0].result.expectOk(), "true");
  },
});

Clarinet.test({
  name: "Role Change Guardian: approve proposal",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const approver1 = accounts.get("wallet_1")!;
    const approver2 = accounts.get("wallet_2")!;
    const newSigner = accounts.get("wallet_3")!;
    const target = accounts.get("wallet_4")!;
    chain.mineBlock([
      Tx.contractCall("role-change-guardian", "add-approver", [
        types.principal(approver1.address),
      ], deployer.address),
      Tx.contractCall("role-change-guardian", "add-approver", [
        types.principal(approver2.address),
      ], deployer.address),
      Tx.contractCall("role-change-guardian", "propose-signer-change", [
        types.principal(target.address),
        types.principal(newSigner.address),
      ], deployer.address),
    ]);
    const block = chain.mineBlock([
      Tx.contractCall("role-change-guardian", "approve-proposal", [
        types.uint(0),
      ], approver1.address),
    ]);
    assertEquals(block.receipts[0].result.expectOk(), "true");
  },
});

Clarinet.test({
  name: "Role Change Guardian: get proposal",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const newSigner = accounts.get("wallet_1")!;
    const target = accounts.get("wallet_2")!;
    chain.mineBlock([
      Tx.contractCall("role-change-guardian", "propose-signer-change", [
        types.principal(target.address),
        types.principal(newSigner.address),
      ], deployer.address),
    ]);
    const proposal = chain.callReadOnlyFn("role-change-guardian", "get-proposal", [
      types.uint(0),
    ], deployer.address);
    proposal.result.expectSome();
  },
});


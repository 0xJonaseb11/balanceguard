import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BROADCAST_PATH = resolve(__dirname, "../../broadcast/Deploy.s.sol/1301/run-latest.json");
const ENV_PATH = resolve(__dirname, "../.env.local");

type Deployment = {
  hook: string;
  router: string;
  deployBlock: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function entriesOf(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function deployedAddress(transactions: unknown[], contractName: string): string {
  for (const transaction of transactions) {
    if (!isRecord(transaction) || transaction.contractName !== contractName) continue;
    if (typeof transaction.contractAddress === "string") return transaction.contractAddress;
  }
  throw new Error(`The broadcast file has no ${contractName} deployment.`);
}

function firstBlock(receipts: unknown[]): number {
  const blocks = receipts.flatMap((receipt) =>
    isRecord(receipt) && typeof receipt.blockNumber === "string" ? [Number(receipt.blockNumber)] : [],
  );
  if (blocks.length === 0) {
    throw new Error("The broadcast file has no receipts. Run the deploy with --broadcast and wait for it to finish.");
  }
  return Math.min(...blocks);
}

function readDeployment(): Deployment {
  const broadcast: unknown = JSON.parse(readFileSync(BROADCAST_PATH, "utf8"));
  if (!isRecord(broadcast)) throw new Error("The broadcast file is not a JSON object.");
  const transactions = entriesOf(broadcast, "transactions");
  return {
    hook: deployedAddress(transactions, "BalanceGuardHook"),
    router: deployedAddress(transactions, "GuardRouter"),
    deployBlock: firstBlock(entriesOf(broadcast, "receipts")),
  };
}

function envLines(deployment: Deployment): string[] {
  const lines = [
    `NEXT_PUBLIC_HOOK_ADDRESS=${deployment.hook}`,
    `NEXT_PUBLIC_ROUTER_ADDRESS=${deployment.router}`,
    `NEXT_PUBLIC_DEPLOY_BLOCK=${deployment.deployBlock}`,
  ];
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  return rpcUrl ? [...lines, `NEXT_PUBLIC_RPC_URL=${rpcUrl}`] : lines;
}

const lines = envLines(readDeployment());
writeFileSync(ENV_PATH, `${lines.join("\n")}\n`);
console.log(`Wrote ${ENV_PATH}`);
console.log(lines.join("\n"));

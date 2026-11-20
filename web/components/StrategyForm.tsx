"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useWriteContract } from "wagmi";
import { hookAbi } from "@/lib/abi";
import { txUrl } from "@/lib/chain";
import { validateParams, type FeeParams } from "@/lib/feeCurve";
import { useTransaction } from "@/lib/useTransaction";
import { useWalletStatus } from "@/lib/useWalletStatus";
import { useGuard } from "@/state/guard";

type Draft = {
  target: string;
  minFee: string;
  baseFee: string;
  maxFee: string;
  slope: string;
};

const PERCENT_PATTERN = /^\d+(\.\d{1,4})?$/;
const INTEGER_PATTERN = /^\d+$/;

function toDraft(params: FeeParams): Draft {
  return {
    target: formatUnits(params.targetWad, 16),
    minFee: (params.minFee / 10_000).toString(),
    baseFee: (params.baseFee / 10_000).toString(),
    maxFee: (params.maxFee / 10_000).toString(),
    slope: params.slope.toString(),
  };
}

function feeUnits(label: string, value: string): number {
  if (!PERCENT_PATTERN.test(value.trim())) throw new Error(`${label} must be a percent such as 0.30.`);
  return Number(parseUnits(value.trim(), 4));
}

function parseDraft(draft: Draft): FeeParams {
  if (!PERCENT_PATTERN.test(draft.target.trim())) throw new Error("Target must be a percent such as 50.");
  if (!INTEGER_PATTERN.test(draft.slope.trim())) throw new Error("Slope must be a whole number of fee units.");
  const params = {
    targetWad: parseUnits(draft.target.trim(), 16),
    minFee: feeUnits("Min fee", draft.minFee),
    baseFee: feeUnits("Base fee", draft.baseFee),
    maxFee: feeUnits("Max fee", draft.maxFee),
    slope: BigInt(draft.slope.trim()),
  };
  const problem = validateParams(params);
  if (problem) throw new Error(problem);
  return params;
}

function checkDraft(draft: Draft): string | undefined {
  try {
    parseDraft(draft);
    return undefined;
  } catch (caught) {
    return caught instanceof Error ? caught.message : "Check the strategy fields.";
  }
}

const FIELDS: ReadonlyArray<{ key: keyof Draft; label: string }> = [
  { key: "target", label: "Target weight (%)" },
  { key: "minFee", label: "Min fee (%)" },
  { key: "baseFee", label: "Base fee (%)" },
  { key: "maxFee", label: "Max fee (%)" },
  { key: "slope", label: "Slope (fee units per full weight)" },
];

export function StrategyForm() {
  const guard = useGuard();
  const wallet = useWalletStatus();
  const write = useWriteContract();
  const tx = useTransaction();
  const [draft, setDraft] = useState(() => toDraft(guard.params));
  const problem = checkDraft(draft);
  const hook = guard.pool?.hook;
  const canSubmit = guard.isOwner && wallet.ready && hook !== undefined && !problem && !tx.busy;

  function submit() {
    if (!hook) return;
    void tx.run("Confirm in your wallet", async () => {
      const params = parseDraft(draft);
      await tx.confirm(write.mutateAsync({ address: hook, abi: hookAbi, functionName: "setStrategy", args: [params] }));
      await guard.refresh();
    });
  }

  return (
    <form
      className="strategy-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="split">
        {FIELDS.map((field) => (
          <label key={field.key} className="field">
            {field.label}
            <input
              inputMode="decimal"
              value={draft[field.key]}
              onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
            />
          </label>
        ))}
      </div>
      {problem ? <p className="wallet-error small">{problem}</p> : null}
      {!guard.isOwner ? <p className="muted small">Only the manager wallet can retune the strategy.</p> : null}
      <button className="primary" style={{ width: "auto", marginTop: 12 }} type="submit" disabled={!canSubmit}>
        {tx.busy ? "Working" : "Save strategy"}
      </button>
      {tx.status ? <p className="small">{tx.status}.</p> : null}
      {tx.error ? <p className="wallet-error small">{tx.error}</p> : null}
      {tx.hash ? (
        <p className="small"><a className="link" href={txUrl(tx.hash)} target="_blank" rel="noreferrer">Last transaction</a></p>
      ) : null}
    </form>
  );
}

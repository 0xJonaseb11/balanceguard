const LABELS = ["Trigger trade", "Watch adjustment", "See results"];

export function TradeSteps({ step }: { step: number }) {
  return (
    <div className="steps">
      {LABELS.map((label, index) => (
        <div key={label} className={step >= index + 1 ? "step on" : "step"}>
          <strong>{index + 1}</strong>
          {label}
        </div>
      ))}
    </div>
  );
}

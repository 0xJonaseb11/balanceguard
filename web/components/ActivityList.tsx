"use client";

import { useGuard } from "@/state/guard";

export function ActivityList({ limit }: { limit?: number }) {
  const guard = useGuard();
  const items = limit ? guard.activity.slice(0, limit) : guard.activity;
  if (items.length === 0) {
    return <p className="muted small">No swaps on this pool yet.</p>;
  }
  return (
    <ul className="activity">
      {items.map((item) => (
        <li key={item.id}>
          <span>
            <span className="dot" />
            {item.href ? (
              <a className="link" href={item.href} target="_blank" rel="noreferrer">{item.text}</a>
            ) : (
              item.text
            )}
          </span>
          <span className="muted">{item.ago}</span>
        </li>
      ))}
    </ul>
  );
}

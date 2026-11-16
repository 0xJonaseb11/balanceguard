"use client";

import { useGuard } from "@/state/guard";

export default function ActivityPage() {
  const guard = useGuard();
  return (
    <>
      <h1 className="page-title">Activity</h1>
      <ul className="activity">
        {guard.activity.map((item) => (
          <li key={item.id}><span><span className="dot" />{item.text}</span><span className="muted">{item.ago}</span></li>
        ))}
      </ul>
    </>
  );
}

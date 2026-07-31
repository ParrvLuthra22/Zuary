"use client";

import { useEffect, useState } from "react";

const UNITS = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Mins" },
  { key: "seconds", label: "Secs" },
] as const;

function remaining(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
    done: ms === 0,
  };
}

/**
 * Counts down to a drop opening.
 *
 * Renders nothing on the server and on first paint. A countdown depends on the
 * visitor's clock, so server HTML and the first client render would disagree on
 * the seconds and React would report a hydration mismatch — the units only
 * appear once the effect has run.
 */
export function DropCountdown({ releasedAt }: { releasedAt: string }) {
  const target = new Date(releasedAt).getTime();
  const [time, setTime] = useState<ReturnType<typeof remaining> | null>(null);

  useEffect(() => {
    setTime(remaining(target));
    const id = setInterval(() => setTime(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div
      className="flex gap-6"
      // Screen readers do not benefit from a per-second update; the release date
      // beside this is the accessible version.
      aria-hidden
    >
      {UNITS.map((unit) => (
        <div key={unit.key}>
          <p className="t-display-sm tabular-nums">
            {time ? String(time[unit.key]).padStart(2, "0") : "––"}
          </p>
          <p className="t-label mt-1 text-fg-muted">{unit.label}</p>
        </div>
      ))}
    </div>
  );
}

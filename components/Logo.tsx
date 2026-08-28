"use client";

import { useRef, useState } from "react";

export default function Logo() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -14, y: px * 14 });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="flex items-center gap-3 select-none"
      style={{ perspective: 400 }}
    >
      <div
        className="tilt-3d logo-highlight rounded-md"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
          <rect x="8" y="4" width="24" height="32" rx="2" stroke="var(--accent-blue)" strokeWidth="2" />
          <path
            className="logo-stroke"
            d="M13 13H27M13 19H27M13 25H21"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div>
        <div className="font-[family-name:var(--font-serif)] text-lg font-semibold leading-tight">
          Docs &amp; Citations
        </div>
        <div className="text-xs text-[var(--ink-soft)] font-[family-name:var(--font-mono)]">
          ask · retrieve · cite
        </div>
      </div>
    </div>
  );
}
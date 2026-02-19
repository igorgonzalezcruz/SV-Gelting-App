"use client";

import React from "react";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function SparkLine({
  values,
  height = 44,
  width = 160,
  invert = false,
}: {
  values: number[];
  height?: number;
  width?: number;
  invert?: boolean; // für Noten (kleiner=besser) -> invert=true
}) {
  const v = (values || []).slice(0, 30);
  if (v.length < 2) {
    return <div style={{ height, width, border: "1px solid #111", borderRadius: 12, opacity: 0.6 }} />;
  }

  const min = Math.min(...v);
  const max = Math.max(...v);
  const span = max - min || 1;

  const pts = v
    .slice()
    .reverse() // älteste links
    .map((x, i) => {
      const t = i / (v.length - 1);
      const xn = t * (width - 16) + 8;
      const yn0 = (x - min) / span; // 0..1
      const yn = invert ? 1 - yn0 : yn0;
      const y = yn * (height - 16) + 8;
      return `${xn.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <rect x="0" y="0" width={width} height={height} rx="12" ry="12" fill="#fff" stroke="#111" strokeWidth="2" />
      <polyline fill="none" stroke="#111" strokeWidth="2.5" points={pts} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function BarMini({
  value,
  max = 100,
  width = 160,
  height = 16,
}: {
  value: number;
  max?: number;
  width?: number;
  height?: number;
}) {
  const pct = clamp(max ? value / max : 0, 0, 1);
  const w = Math.round(pct * width);

  return (
    <div style={{ width, height, border: "2px solid #111", borderRadius: 999, overflow: "hidden", background: "#fff" }}>
      <div style={{ width: w, height: "100%", background: "#111" }} />
    </div>
  );
}
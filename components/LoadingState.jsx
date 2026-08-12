"use client";

import { useEffect, useId, useMemo, useState } from "react";
import styles from "./LoadingState.module.css";

const VARIANTS = ["Drive", "Dots", "Orbit"];
const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];

export const DEFAULT_LOADING_PHASES = [
  "Reading context",
  "Researching external signals",
  "Structuring the framework",
];

function normalizeStartedAt(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

export function formatElapsed(milliseconds) {
  const seconds = Math.max(0, milliseconds) / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;

  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60)}m ${wholeSeconds % 60}s`;
}

function getPhaseState(phases, phase) {
  if (!phases.length) return { currentIndex: -1, currentLabel: String(phase || "Working") };

  if (typeof phase === "string") {
    const currentIndex = phases.findIndex(item => item === phase);
    return {
      currentIndex,
      currentLabel: currentIndex >= 0 ? phases[currentIndex] : phase,
    };
  }

  const currentIndex = Math.min(Math.max(Number.isFinite(phase) ? phase : 0, 0), phases.length - 1);
  return { currentIndex, currentLabel: phases[currentIndex] };
}

function PixelGrid({ variant, active }) {
  const safeVariant = VARIANTS.includes(variant) ? variant : "Drive";

  return (
    <span
      className={styles.pixelGrid}
      data-active={active ? "true" : "false"}
      data-variant={safeVariant.toLowerCase()}
      aria-hidden="true"
    >
      {Array.from({ length: 9 }, (_, index) => {
        const row = Math.floor(index / 3);
        const column = index % 3;
        const orbitIndex = ORBIT_ORDER.indexOf(index);
        const isOrbitCenter = safeVariant === "Orbit" && index === 4;
        const delay = safeVariant === "Orbit"
          ? Math.max(orbitIndex, 0) * 110
          : (column + Math.abs(row - 1)) * 90;

        return (
          <span
            className={styles.pixel}
            data-center={isOrbitCenter ? "true" : undefined}
            key={index}
            style={{
              "--pixel-delay": `${delay}ms`,
              "--pixel-duration": safeVariant === "Orbit" ? "950ms" : "650ms",
            }}
          />
        );
      })}
    </span>
  );
}

export function RunProgress({ phases = DEFAULT_LOADING_PHASES, phase = 0, className = "" }) {
  const phaseList = useMemo(() => phases.filter(Boolean).map(String), [phases]);
  const { currentIndex } = getPhaseState(phaseList, phase);

  if (!phaseList.length) return null;

  return (
    <ol className={[styles.progress, className].filter(Boolean).join(" ")} aria-label="Generation progress">
      {phaseList.map((name, index) => {
        const state = index < currentIndex ? "complete" : index === currentIndex ? "current" : "pending";
        return (
          <li className={styles.progressItem} data-state={state} key={`${name}-${index}`}>
            <span className={styles.phaseMarker} aria-hidden="true" />
            <span>{name}</span>
            <span className={styles.phaseNumber} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function LoadingState({
  label = "Churning",
  variant = "Drive",
  phases = DEFAULT_LOADING_PHASES,
  phase = 0,
  active = true,
  startedAt,
  className = "",
}) {
  const titleId = useId();
  const [elapsed, setElapsed] = useState(0);
  const phaseList = useMemo(() => phases.filter(Boolean).map(String), [phases]);
  const { currentLabel } = getPhaseState(phaseList, phase);

  useEffect(() => {
    if (!active) return undefined;

    const start = normalizeStartedAt(startedAt) ?? Date.now();
    const update = () => setElapsed(Date.now() - start);
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [active, startedAt]);

  const elapsedLabel = formatElapsed(elapsed);

  return (
    <section
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-active={active ? "true" : "false"}
      aria-busy={active}
      aria-labelledby={titleId}
    >
      <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {label}: {currentLabel}
      </span>

      <div className={styles.summary}>
        <span className={styles.loaderFrame}>
          <PixelGrid variant={variant} active={active} />
        </span>

        <div className={styles.copy}>
          <div className={styles.label} id={titleId}>{label}</div>
          <div className={styles.currentPhase}>{currentLabel}</div>
        </div>

        <time
          className={styles.timer}
          dateTime={`PT${Math.floor(elapsed / 1000)}S`}
          aria-label={`Elapsed time ${elapsedLabel}`}
        >
          <span>Elapsed</span>
          <b>{elapsedLabel}</b>
        </time>
      </div>

      <RunProgress phases={phaseList} phase={phase} />
    </section>
  );
}

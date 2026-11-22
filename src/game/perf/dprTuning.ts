export interface DprTuning {
  /** Target FPS the scaler tries to maintain. */
  targetFps: number;
  /** FPS below target allowed before reducing DPR. Recovery uses a smaller margin. */
  fpsTolerance: number;
  /** Lower clamp for DPR. */
  minDpr: number;
  /** Upper clamp for DPR. */
  maxDpr: number;
  /** Step size applied when adjusting DPR. */
  step: number;
}

/**
 * Reduces DPR below target minus tolerance. Recovers at target minus the
 * smaller of 2 FPS and half the tolerance. Holds DPR between those thresholds.
 */
export const computeNextDpr = (currentDpr: number, fps: number, tuning: DprTuning): number => {
  if (!Number.isFinite(fps)) return currentDpr;
  if (fps < tuning.targetFps - tuning.fpsTolerance) {
    return Math.max(tuning.minDpr, currentDpr - tuning.step);
  }
  const recoveryMargin = Math.min(2, tuning.fpsTolerance / 2);
  if (fps >= tuning.targetFps - recoveryMargin) {
    return Math.min(tuning.maxDpr, currentDpr + tuning.step);
  }
  return currentDpr;
};

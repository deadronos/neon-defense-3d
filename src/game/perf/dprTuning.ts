export interface DprTuning {
  /** Target FPS the scaler tries to maintain. */
  targetFps: number;
  /** Allowed deviation from the target before reacting. */
  fpsTolerance: number;
  /** Lower clamp for DPR. */
  minDpr: number;
  /** Upper clamp for DPR. */
  maxDpr: number;
  /** Step size applied when adjusting DPR. */
  step: number;
}

/** Pure: returns the next DPR given the current value, the measured FPS,
 *  and the tuning. Returns `currentDpr` if no change is needed. */
export const computeNextDpr = (
  currentDpr: number,
  fps: number,
  tuning: DprTuning,
): number => {
  if (!Number.isFinite(fps)) return currentDpr;
  if (fps < tuning.targetFps - tuning.fpsTolerance) {
    return Math.max(tuning.minDpr, currentDpr - tuning.step);
  }
  if (fps > tuning.targetFps + tuning.fpsTolerance) {
    return Math.min(tuning.maxDpr, currentDpr + tuning.step);
  }
  return currentDpr;
};

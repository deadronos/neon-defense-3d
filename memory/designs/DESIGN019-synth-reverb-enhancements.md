# DESIGN019 — Synth & Reverb Enhancements

**Status:** Completed
**Updated:** 2026-01-03
**Related PR:** [Enhance Synth audio processing with reverb and improved volume settings](https://github.com/deadronos/neon-defense-3d/pull/66)

## Summary

Improve the in-engine music/synth sound so the background music is less "flat" and more atmospheric. Provide a compact, testable, procedural approach (no external binary IR assets) that can be iterated and exposed via settings later.

## Goals

- Add musical movement (arpeggio) and texture (detuned pads, LFO).
- Add space/ambience via delay-based feedback and a convolver reverb using a procedural impulse.
- Keep implementation small and self-contained to avoid shipping asset files.
- Ensure testability: update `setupTests.ts` mocks for new Audio nodes.

## Audio Graph (high-level)

- Master Gain -> destination
- musicGain (submix) -> masterGain
  - bgmGain (submix) -> [optional lowpass filter] -> musicGain
  - bgmGain -> reverbSend -> convolver -> musicGain (wet)
  - bgmGain -> delay (feedback network) -> musicGain (wet)
  - bgmOscillators (drone/pad/chorus) feed bgmGain
  - arp oscillator + envelope feed bgmGain (adds rhythmic movement)
  - LFO -> detune on selected oscillators (slow movement)

## Implementation notes

- `src/game/audio/Synth.ts` was extended with:
  - `bgmFilter` (Biquad lowpass), `delayNode` + `delayFeedback`, `lfo` + `lfoGain`, and a small `arpOsc` with a per-note envelope.
  - Procedural impulse generator `createImpulseResponse(duration, decay)` to produce a stereo IR buffer.
  - `convolver` (ConvolverNode) and `reverbSend` GainNode to control wet mix, with `setReverbMix()` method.
  - Proper node cleanup in `stopMusic()` including stopping oscillators, disconnecting nodes, and clearing intervals.

- `src/tests/setupTests.ts` was updated to stub `createBiquadFilter`, `createDelay`, and `createConvolver` so tests run in Node without the browser AudioContext.

- Default music gain increased slightly to make movement and effects audible at the default master volume.

## Tests & Validation

- Unit test suite was run locally and passed (107 tests).
- Smoke validation: toggling music in UI yields audible movement and reverb (manual check).

## Acceptance Criteria

- Music is no longer perceived as flat at default settings; there is noticeable movement and ambience.
- No test regressions — `npm test` passes.
- No runtime errors on browsers that support Web Audio; nodes guarded for absence or fallbacks provided.

## Next steps / Extensions

- Add Settings UI controls for `Reverb Mix`, `Arp Speed`, and `Enable/Disable Reverb` (Settings modal).
- Optionally bundle a small curated IR sample for a specific room/plate character and provide presets.
- Add a Playwright e2e test that verifies audio pipeline starts (mocked), and a manual audio QA checklist.

```md
Change log:

- 2026-01-03: Implementation completed and tested locally (no asset added - procedural approach)
```

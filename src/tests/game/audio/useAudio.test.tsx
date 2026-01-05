import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { useAudio } from '../../../game/audio/AudioManager';

const Component = () => {
  useAudio();
  return null;
};

describe('useAudio hook', () => {
  it('throws if used outside of AudioProvider', () => {
    expect(() => render(<Component />)).toThrow(/useAudio must be used within an AudioProvider/);
  });
});

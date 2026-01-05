import { useContext } from 'react';

import { AudioManagerContext } from './audioContext';

export const useAudio = () => {
  const context = useContext(AudioManagerContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

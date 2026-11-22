import React, { useMemo } from 'react';

import { useAudio } from '../../game/audio/useAudio';
import { useGameUi } from '../../game/gameContexts';

import { ModalFrame } from './ModalFrame';
import { SettingsAudioSection } from './settings/SettingsAudioSection';
import { SettingsExportImportSection } from './settings/SettingsExportImportSection';
import { SettingsQualitySection } from './settings/SettingsQualitySection';
import { SettingsResetSection } from './settings/SettingsResetSection';
import { useExportImportState } from './settings/useExportImportState';

export interface SettingsModalProps {
  open: boolean;
  restoreFocusTo?: Element | null;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, restoreFocusTo }) => {
  const {
    gameState,
    setGraphicsQuality,
    resetCheckpoint,
    factoryReset,
    applyCheckpointSave,
    exportCheckpointJson,
  } = useGameUi();

  const { masterVolume, sfxVolume, musicVolume, setMasterVolume, setSFXVolume, setMusicVolume } =
    useAudio();

  const qualityLabel = useMemo(
    () => (gameState.graphicsQuality === 'high' ? 'High' : 'Low'),
    [gameState.graphicsQuality],
  );

  const exportImportState = useExportImportState({
    open,
    waveStartedNonce: gameState.waveStartedNonce,
    exportCheckpointJson,
    applyCheckpointSave,
    resetCheckpoint,
    factoryReset,
  });

  if (!open) return null;

  return (
    <ModalFrame
      label="Settings"
      restoreFocusTo={restoreFocusTo}
      onClose={onClose}
      className="w-11/12 max-w-4xl max-h-[85vh] flex flex-col"
    >
      <div className="p-6 border-b border-cyan-500/25 flex justify-between items-center bg-cyan-950/30">
        <div>
          <h2 className="text-2xl font-bold text-cyan-300 font-orbitron">SETTINGS</h2>
          <p className="text-gray-400 text-sm">Quality • Save/Load • Reset</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="bg-black/40 border border-cyan-500/25 hover:border-cyan-300 text-white px-3 py-2 rounded font-mono text-xs"
          aria-label="Close settings"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <SettingsAudioSection
          masterVolume={masterVolume}
          sfxVolume={sfxVolume}
          musicVolume={musicVolume}
          setMasterVolume={setMasterVolume}
          setSFXVolume={setSFXVolume}
          setMusicVolume={setMusicVolume}
        />

        <SettingsQualitySection
          graphicsQuality={gameState.graphicsQuality}
          qualityLabel={qualityLabel}
          setGraphicsQuality={setGraphicsQuality}
        />

        <SettingsExportImportSection
          exportJson={exportImportState.exportJson}
          hasCheckpoint={exportImportState.hasCheckpoint}
          importText={exportImportState.importText}
          importPreview={exportImportState.importPreview}
          copyStatus={exportImportState.copyStatus}
          setImportText={exportImportState.setImportText}
          refreshExport={exportImportState.refreshExport}
          onCopyExport={exportImportState.onCopyExport}
          onDownloadExport={exportImportState.onDownloadExport}
          previewImport={exportImportState.previewImport}
          onImportApply={exportImportState.onImportApply}
          onImportFilePicked={exportImportState.onImportFilePicked}
        />

        <SettingsResetSection
          hasCheckpoint={exportImportState.hasCheckpoint}
          onResetCheckpoint={exportImportState.onResetCheckpoint}
          onFactoryReset={exportImportState.onFactoryReset}
        />
      </div>
    </ModalFrame>
  );
};

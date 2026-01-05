import React, { useMemo } from 'react';

import { useAudio } from '../../game/audio/AudioManager';
import { useGame } from '../../game/GameState';

import { SettingsAudioSection } from './settings/SettingsAudioSection';
import { SettingsExportImportSection } from './settings/SettingsExportImportSection';
import { SettingsQualitySection } from './settings/SettingsQualitySection';
import { SettingsResetSection } from './settings/SettingsResetSection';
import { useExportImportState } from './settings/useExportImportState';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const {
    gameState,
    setGraphicsQuality,
    resetCheckpoint,
    factoryReset,
    applyCheckpointSave,
    exportCheckpointJson,
  } = useGame();

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
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 backdrop-blur-sm pointer-events-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="bg-[#16213e] border-2 border-[#00f2ff] w-11/12 max-w-4xl max-h-[85vh] flex flex-col rounded-lg shadow-[0_0_40px_rgba(0,242,255,0.2)] overflow-hidden"
      >
        <div className="p-6 border-b border-[#0f3460] flex justify-between items-center bg-[#1a1a2e]">
          <div>
            <h2 className="text-2xl font-bold text-[#00f2ff] font-orbitron">SETTINGS</h2>
            <p className="text-gray-400 text-sm">Quality • Save/Load • Reset</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-black/40 border border-[#0f3460] hover:border-[#00f2ff] text-white px-3 py-2 rounded font-mono text-xs"
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
      </div>
    </div>
  );
};

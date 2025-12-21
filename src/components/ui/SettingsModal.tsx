import React, { useEffect, useMemo, useState } from 'react';

import { useGame } from '../../game/GameState';
import type { SaveV1 } from '../../game/persistence';
import { migrateSave } from '../../game/persistence';

type ImportPreview =
  | { status: 'idle' }
  | { status: 'error'; errors: string[] }
  | { status: 'ready'; save: SaveV1; warnings: string[]; hasWarnings: boolean };

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

  const [exportJson, setExportJson] = useState('');
  const [hasCheckpoint, setHasCheckpoint] = useState(false);

  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<ImportPreview>({ status: 'idle' });
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const qualityLabel = useMemo(
    () => (gameState.graphicsQuality === 'high' ? 'High' : 'Low'),
    [gameState.graphicsQuality],
  );

  useEffect(() => {
    if (!open) return;
    const { json, hasCheckpoint: has } = exportCheckpointJson();
    setExportJson(json);
    setHasCheckpoint(has);

    // Reset any in-progress import preview when opening.
    setImportPreview({ status: 'idle' });
    setCopyStatus(null);
  }, [open, exportCheckpointJson]);

  // If the game autosaves while the modal is open (e.g., WaveStarted), keep the
  // export panel and Reset Checkpoint button in sync without resetting import UI.
  // Use `waveStartedNonce` to detect WaveStarted events (wave number may be the
  // same for wave 1 but the nonce increments each time a WaveStarted is emitted).
  useEffect(() => {
    if (!open) return;

    // Schedule the export check on the next microtask to give parent effects (like
    // the GameProvider autosave) a chance to complete and write the checkpoint.
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const { json, hasCheckpoint: has } = exportCheckpointJson();
      setExportJson(json);
      setHasCheckpoint(has);
    });

    return () => {
      cancelled = true;
    };
  }, [open, gameState.waveStartedNonce, exportCheckpointJson]);

  if (!open) return null;

  const refreshExport = () => {
    const { json, hasCheckpoint: has } = exportCheckpointJson();
    setExportJson(json);
    setHasCheckpoint(has);
  };

  const onCopyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopyStatus('Copied to clipboard.');
    } catch (e) {
      setCopyStatus(`Copy failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const onDownloadExport = () => {
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neon-defense-3d-checkpoint-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const previewImport = (raw: string) => {
    setImportPreview({ status: 'idle' });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      setImportPreview({
        status: 'error',
        errors: [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`],
      });
      return;
    }

    const migrated = migrateSave(parsed);
    if (!migrated.ok || !migrated.save) {
      setImportPreview({
        status: 'error',
        errors: migrated.errors?.length ? migrated.errors : ['Invalid save payload.'],
      });
      return;
    }

    setImportPreview({
      status: 'ready',
      save: migrated.save,
      warnings: migrated.warnings,
      hasWarnings: migrated.warnings.length > 0,
    });
  };

  const onImportApply = () => {
    if (importPreview.status !== 'ready') return;

    const confirmed = window.confirm(
      'Import will replace your current run with the imported checkpoint. Continue?',
    );
    if (!confirmed) return;

    applyCheckpointSave(importPreview.save);
    refreshExport();
  };

  const onResetCheckpoint = () => {
    const res = resetCheckpoint();
    if (!res.ok) {
      setCopyStatus(res.error ?? 'No checkpoint found.');
      return;
    }
    refreshExport();
  };

  const onFactoryReset = () => {
    const confirmed = window.confirm(
      'Factory Reset will wipe all progress/meta and delete the saved checkpoint. Quality will be preserved. Continue?',
    );
    if (!confirmed) return;

    factoryReset();
    refreshExport();
  };

  const onImportFilePicked = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      setImportText(text);
      previewImport(text);
    } catch (e) {
      setImportPreview({
        status: 'error',
        errors: [`Failed to read file: ${e instanceof Error ? e.message : String(e)}`],
      });
    }
  };

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
          {/* Quality */}
          <section className="bg-black/20 border border-[#0f3460] rounded p-5">
            <h3 className="text-lg font-bold text-white mb-2">Quality</h3>
            <p className="text-gray-400 text-sm mb-4">
              Current preset: <span className="text-fuchsia-200 font-mono">{qualityLabel}</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGraphicsQuality('high')}
                className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider border transition-colors ${
                  gameState.graphicsQuality === 'high'
                    ? 'bg-[#00f2ff] text-black border-[#00f2ff]'
                    : 'bg-black/30 text-white border-[#0f3460] hover:border-[#00f2ff]'
                }`}
              >
                High
              </button>
              <button
                type="button"
                onClick={() => setGraphicsQuality('low')}
                className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider border transition-colors ${
                  gameState.graphicsQuality === 'low'
                    ? 'bg-[#00f2ff] text-black border-[#00f2ff]'
                    : 'bg-black/30 text-white border-[#0f3460] hover:border-[#00f2ff]'
                }`}
              >
                Low
              </button>
            </div>
          </section>

          {/* Export / Import */}
          <section className="bg-black/20 border border-[#0f3460] rounded p-5">
            <h3 className="text-lg font-bold text-white mb-2">Export / Import</h3>
            <p className="text-gray-400 text-sm mb-4">
              {hasCheckpoint
                ? 'Export shows the latest autosaved checkpoint.'
                : 'No autosaved checkpoint found yet — export is a live snapshot.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Export */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-[#00f2ff]">Export</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={refreshExport}
                      className="bg-black/40 border border-[#0f3460] hover:border-[#00f2ff] text-white px-3 py-1.5 rounded font-mono text-xs"
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={onCopyExport}
                      className="bg-black/40 border border-[#0f3460] hover:border-[#00f2ff] text-white px-3 py-1.5 rounded font-mono text-xs"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={onDownloadExport}
                      className="bg-black/40 border border-[#0f3460] hover:border-[#00f2ff] text-white px-3 py-1.5 rounded font-mono text-xs"
                    >
                      Download
                    </button>
                  </div>
                </div>
                <textarea
                  aria-label="Exported checkpoint JSON"
                  readOnly
                  value={exportJson}
                  className="w-full h-56 bg-black/30 border border-[#0f3460] rounded p-3 text-xs text-gray-200 font-mono"
                />
              </div>

              {/* Import */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-[#00f2ff]">Import</h4>
                  <div className="flex gap-2">
                    <label className="bg-black/40 border border-[#0f3460] hover:border-[#00f2ff] text-white px-3 py-1.5 rounded font-mono text-xs cursor-pointer">
                      Upload
                      <input
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={(e) => onImportFilePicked(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => previewImport(importText)}
                      className="bg-black/40 border border-[#0f3460] hover:border-[#00f2ff] text-white px-3 py-1.5 rounded font-mono text-xs"
                    >
                      Validate
                    </button>
                    <button
                      type="button"
                      onClick={onImportApply}
                      disabled={importPreview.status !== 'ready'}
                      className={`px-3 py-1.5 rounded font-mono text-xs border transition-colors ${
                        importPreview.status === 'ready'
                          ? 'bg-[#e94560] hover:bg-[#ff5777] text-white border-[#e94560]'
                          : 'bg-black/20 text-gray-500 border-[#0f3460] cursor-not-allowed'
                      }`}
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <textarea
                  aria-label="Import checkpoint JSON"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste checkpoint JSON here…"
                  className="w-full h-56 bg-black/30 border border-[#0f3460] rounded p-3 text-xs text-gray-200 font-mono"
                />

                <div className="mt-3 space-y-2">
                  {importPreview.status === 'error' && (
                    <div className="bg-red-900/30 border border-red-500/40 rounded p-3 text-sm text-red-200">
                      <div className="font-bold mb-1">Import blocked</div>
                      <ul className="list-disc pl-5 space-y-1">
                        {importPreview.errors.map((err) => (
                          <li key={err}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importPreview.status === 'ready' && importPreview.hasWarnings && (
                    <div className="bg-yellow-900/20 border border-yellow-500/40 rounded p-3 text-sm text-yellow-100">
                      <div className="font-bold mb-1">Warnings (import will still work)</div>
                      <ul className="list-disc pl-5 space-y-1">
                        {importPreview.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importPreview.status === 'ready' && !importPreview.hasWarnings && (
                    <div className="bg-emerald-900/20 border border-emerald-500/40 rounded p-3 text-sm text-emerald-100">
                      Save validated and ready to apply.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {copyStatus && <div className="mt-4 text-xs text-gray-300 font-mono">{copyStatus}</div>}
          </section>

          {/* Reset */}
          <section className="bg-black/20 border border-[#0f3460] rounded p-5">
            <h3 className="text-lg font-bold text-white mb-2">Reset</h3>
            <p className="text-gray-400 text-sm mb-4">
              Reset Checkpoint reloads the last autosaved checkpoint. Factory Reset clears all
              progress/meta and deletes the checkpoint (Quality is preserved).
            </p>

            <div className="flex flex-col md:flex-row gap-3">
              <button
                type="button"
                onClick={onResetCheckpoint}
                disabled={!hasCheckpoint}
                className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider border transition-colors ${
                  hasCheckpoint
                    ? 'bg-black/40 border-[#0f3460] hover:border-[#00f2ff] text-white'
                    : 'bg-black/20 border-[#0f3460] text-gray-500 cursor-not-allowed'
                }`}
              >
                Reset Checkpoint
              </button>
              <button
                type="button"
                onClick={onFactoryReset}
                className="bg-[#e94560] hover:bg-[#ff5777] text-white px-4 py-2 rounded font-mono text-xs uppercase tracking-wider"
              >
                Factory Reset
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

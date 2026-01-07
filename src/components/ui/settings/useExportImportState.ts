import { useEffect, useState } from 'react';

import type { SaveV1 } from '../../../game/persistence';
import { migrateSave } from '../../../game/persistence';

import { downloadJson } from './exportImportUtils';

export type ImportPreview =
  | { status: 'idle' }
  | { status: 'error'; errors: string[] }
  | { status: 'ready'; save: SaveV1; warnings: string[]; hasWarnings: boolean };

interface ExportImportStateParams {
  open: boolean;
  waveStartedNonce: number;
  exportCheckpointJson: () => { json: string; hasCheckpoint: boolean };
  applyCheckpointSave: (save: SaveV1) => void;
  resetCheckpoint: () => { ok: boolean; error?: string };
  factoryReset: () => void;
}

export const useExportImportState = ({
  open,
  waveStartedNonce,
  exportCheckpointJson,
  applyCheckpointSave,
  resetCheckpoint,
  factoryReset,
}: ExportImportStateParams) => {
  const [exportJson, setExportJson] = useState('');
  const [hasCheckpoint, setHasCheckpoint] = useState(false);

  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<ImportPreview>({ status: 'idle' });
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

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
  useEffect(() => {
    if (!open) return;

    // Schedule the export check on the next microtask to give parent effects
    // (like the GameProvider autosave) a chance to complete and write the checkpoint.
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const { json, hasCheckpoint: has } = exportCheckpointJson();
      setExportJson(json);
      setHasCheckpoint(has);
    });

    return () => {
      cancelled = true;
    };
  }, [open, waveStartedNonce, exportCheckpointJson]);

  const refreshExport = () => {
    const { json, hasCheckpoint: has } = exportCheckpointJson();
    setExportJson(json);
    setHasCheckpoint(has);
  };

  const onCopyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopyStatus('Copied to clipboard.');
    } catch (err) {
      setCopyStatus(`Copy failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const onDownloadExport = () => {
    const stamp = new Date().toISOString().replace(/[.:]/g, '-');
    downloadJson(exportJson, `neon-defense-3d-checkpoint-${stamp}.json`);
  };

  const previewImport = (raw: string) => {
    setImportPreview({ status: 'idle' });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      setImportPreview({
        status: 'error',
        errors: [`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`],
      });
      return;
    }

    const migrated = migrateSave(parsed);
    if (!migrated.ok || !migrated.save) {
      const errors =
        migrated.errors && migrated.errors.length > 0 ? migrated.errors : ['Invalid save payload.'];
      setImportPreview({
        status: 'error',
        errors,
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
    } catch (err) {
      setImportPreview({
        status: 'error',
        errors: [`Failed to read file: ${err instanceof Error ? err.message : String(err)}`],
      });
    }
  };

  return {
    exportJson,
    hasCheckpoint,
    importText,
    setImportText,
    importPreview,
    copyStatus,
    refreshExport,
    onCopyExport,
    onDownloadExport,
    previewImport,
    onImportApply,
    onResetCheckpoint,
    onFactoryReset,
    onImportFilePicked,
  };
};

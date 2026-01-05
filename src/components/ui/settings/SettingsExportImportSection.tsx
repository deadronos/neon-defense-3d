import React from 'react';

import type { ImportPreview } from './useExportImportState';

interface SettingsExportImportSectionProps {
  exportJson: string;
  hasCheckpoint: boolean;
  importText: string;
  importPreview: ImportPreview;
  copyStatus: string | null;
  setImportText: (value: string) => void;
  refreshExport: () => void;
  onCopyExport: () => void;
  onDownloadExport: () => void;
  previewImport: (raw: string) => void;
  onImportApply: () => void;
  onImportFilePicked: (file: File | null) => void;
}

export const SettingsExportImportSection: React.FC<SettingsExportImportSectionProps> = ({
  exportJson,
  hasCheckpoint,
  importText,
  importPreview,
  copyStatus,
  setImportText,
  refreshExport,
  onCopyExport,
  onDownloadExport,
  previewImport,
  onImportApply,
  onImportFilePicked,
}) => (
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

          {importPreview.status === 'ready' && importPreview.hasWarnings ? (
            <div className="bg-yellow-900/20 border border-yellow-500/40 rounded p-3 text-sm text-yellow-100">
              <div className="font-bold mb-1">Warnings (import will still work)</div>
              <ul className="list-disc pl-5 space-y-1">
                {importPreview.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {importPreview.status === 'ready' && !importPreview.hasWarnings && (
            <div className="bg-emerald-900/20 border border-emerald-500/40 rounded p-3 text-sm text-emerald-100">
              Save validated and ready to apply.
            </div>
          )}
        </div>
      </div>
    </div>

    {copyStatus ? <div className="mt-4 text-xs text-gray-300 font-mono">{copyStatus}</div> : null}
  </section>
);

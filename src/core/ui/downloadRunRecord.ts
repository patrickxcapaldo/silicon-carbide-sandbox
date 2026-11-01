/**
 * Shared "Export" action. Every module's Controls panel has an Export button
 * that downloads its run record (inputs, outputs, software versions) as JSON,
 * named `<moduleId>-v<releaseVersion>-<YYYY-MM-DD>.json`.
 */
export type DownloadableRunRecord = {
  createdAt: string;
  software: { moduleId: string; moduleReleaseVersion: string };
};

export function downloadRunRecord(record: DownloadableRunRecord): void {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${record.software.moduleId}-v${record.software.moduleReleaseVersion}-${record.createdAt.slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

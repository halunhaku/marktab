import { t, type LocaleId } from '@/locales';
import { settings, updateSettings, resetSettingsToDefaults, flushSettings } from '@/core/settings/store';
import { normalizeSettings } from '@/core/settings/normalize';
import { normalizeUserData, emptyUserData, type UserData } from '@/core/userdata/model';
import { flushUserData, replaceUserData, userData } from '@/core/userdata/store';
import { refreshBookmarksNow } from '@/core/bookmarks/store';
import { defaultEngine, SEARCH_ENGINES } from '@/core/util/url';
import { showToast } from '../state/toast';
import { navigate } from '../state/router';

/**
 * Portable MarkTab data.
 *
 * The export deliberately contains only MarkTab-owned state: appearance, search
 * preferences, pins and recent history. Browser bookmarks are never included, and
 * neither export nor import touches the bookmarks tree.
 */
export interface MarkTabExport {
  app: 'marktab';
  schema: number;
  exportedAt: string;
  settings: unknown;
  data: unknown;
}

export function buildExport(): MarkTabExport {
  const current: UserData = userData.value;
  return {
    app: 'marktab',
    schema: settings.value.schema,
    exportedAt: new Date().toISOString(),
    settings: settings.value,
    data: { schema: current.schema, pins: current.pins, recent: current.recent },
  };
}

export function exportFileName(date = new Date()): string {
  return `marktab-export-${date.toISOString().slice(0, 10)}.json`;
}

/** Triggers a download of `payload` as JSON. */
export function downloadJson(payload: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next frame so the download has started.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ParsedImport {
  settings: unknown;
  data: unknown;
}

export function parseImport(text: string): ParsedImport | null {
  try {
    const parsed = JSON.parse(text) as Partial<MarkTabExport>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.app !== 'marktab') return null;
    if (!('settings' in parsed)) return null;
    return { settings: parsed.settings, data: parsed.data };
  } catch {
    return null;
  }
}

export interface ImportOutcome {
  ok: boolean;
  reason?: 'shape' | 'read';
}

/** Restores an export. Unknown or partial payloads fall back to normalisation. */
export async function importData(raw: string | ParsedImport | null): Promise<ImportOutcome> {
  const parsed: ParsedImport | null = raw === null ? null : typeof raw === 'string' ? parseImport(raw) : raw;
  if (!parsed) {
    showToast(t('toast.settingsImportFailed'), { tone: 'error' });
    return { ok: false, reason: 'shape' };
  }
  updateSettings(normalizeSettings(parsed.settings));
  replaceUserData(normalizeUserData(parsed.data));
  await Promise.all([flushSettings(), flushUserData()]);
  showToast(t('toast.settingsImported'), { tone: 'success' });
  return { ok: true };
}

export async function readFileAsText(file: File): Promise<string | null> {
  try {
    return await file.text();
  } catch {
    return null;
  }
}

/** Clears MarkTab state. Browser bookmarks are out of scope by design. */
export async function resetAllData(): Promise<void> {
  resetSettingsToDefaults();
  replaceUserData(emptyUserData());
  await Promise.all([flushSettings(), flushUserData()]);
  await refreshBookmarksNow();
  showToast(t('toast.dataCleared'), { tone: 'success' });
  navigate({ kind: 'home' });
}

export interface EngineOption {
  id: string;
  label: string;
}

export function engineOptions(): EngineOption[] {
  return SEARCH_ENGINES.map((engine) => ({ id: engine.id, label: engine.label }));
}

export function resolvedEngineId(): string {
  return settings.value.search.engine || defaultEngine().id;
}

export function localeLabel(locale: LocaleId): string {
  return locale === 'zh' ? '简体中文' : 'English';
}

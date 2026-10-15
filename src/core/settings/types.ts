export type ThemeMode = 'light' | 'dark' | 'system';
export type LanguageSetting = 'auto' | 'en' | 'zh';
export type Density = 'comfortable' | 'compact';
export type MotionSetting = 'system' | 'reduced' | 'full';
export type FolderView = 'grid' | 'list';
export type FolderSortMode = 'manual' | 'title' | 'recent';

export interface Settings {
  schema: number;
  theme: ThemeMode;
  language: LanguageSetting;
  density: Density;
  motion: MotionSetting;
  /** Left navigation rail collapsed to icons. */
  railCollapsed: boolean;
  home: {
    showClock: boolean;
    showPinned: boolean;
    showRecent: boolean;
    showFolders: boolean;
    recentCount: number;
    pinnedLimit: number;
  };
  folders: {
    view: FolderView;
    sort: FolderSortMode;
    hiddenIds: string[];
  };
  search: {
    engine: string;
    customTemplate: string;
    openInNewTab: boolean;
    showFavicons: boolean;
  };
}

export const SETTINGS_SCHEMA = 3;
export const SETTINGS_KEY = 'marktab:settings:v3';
export const DATA_KEY = 'marktab:data:v3';
export const DATA_SCHEMA = 1;

/** Legacy keys are read for migration and never written or deleted. */
export const LEGACY_SETTINGS_KEYS = ['markTabSettings', 'rainbowBookmarkSettings'] as const;

export const RECENT_CAP = 200;
export const HIDDEN_FOLDER_CAP = 2000;

export const RECENT_COUNT_MIN = 3;
export const RECENT_COUNT_MAX = 24;
export const PINNED_LIMIT_MIN = 4;
export const PINNED_LIMIT_MAX = 40;

/** `storage.sync` allows 8 KiB per item; stay well below with headroom. */
export const SYNC_ITEM_BUDGET = 6 * 1024;

export const DEFAULT_SETTINGS: Settings = {
  schema: SETTINGS_SCHEMA,
  theme: 'system',
  language: 'auto',
  density: 'comfortable',
  motion: 'system',
  railCollapsed: false,
  home: {
    showClock: true,
    showPinned: true,
    showRecent: true,
    showFolders: true,
    recentCount: 8,
    pinnedLimit: 12,
  },
  folders: {
    view: 'grid',
    sort: 'manual',
    hiddenIds: [],
  },
  search: {
    engine: 'google',
    customTemplate: '',
    openInNewTab: false,
    showFavicons: true,
  },
};

export function cloneDefaults(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    home: { ...DEFAULT_SETTINGS.home },
    folders: { ...DEFAULT_SETTINGS.folders, hiddenIds: [] },
    search: { ...DEFAULT_SETTINGS.search },
  };
}

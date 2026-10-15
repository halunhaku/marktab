/**
 * Signal re-exports.
 *
 * Modules that only need to *read* state (selectors, UI) import from here,
 * which keeps the write-side stores free of import cycles: stores own the
 * signal, consumers own the dependency.
 */
export { settings, settingsStatus, settingsNotice } from '../settings/store';
export type { SettingsStatus } from '../settings/store';
export {
  userData,
  pins,
  recent,
  pinsByUrl,
  recentByUrl,
  searchWeights,
  userDataWriteError,
} from '../userdata/store';
export { bookmarkIndex, indexStatus, indexError, indexRevision } from '../bookmarks/store';

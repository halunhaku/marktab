/*
 * First-paint appearance boot.
 *
 * Loaded as a classic, blocking script from `<head>`, before any module runs, so
 * an explicit dark/light choice never flashes the wrong background. It only reads
 * the paint cache written by the app (`marktab.appearance.v3` in localStorage) and
 * writes four attributes on `<html>`; it has no imports and no side effects beyond
 * that, which keeps it safe to run on every page of the extension.
 *
 * CSP note: MV3 forbids inline scripts, so this must stay a real file.
 */
(function () {
  var root = document.documentElement;
  var prefersDark = false;
  var prefersReduced = false;
  try {
    prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (error) {
    /* matchMedia unavailable: fall back to the light/full defaults */
  }

  var cached = null;
  try {
    var raw = window.localStorage.getItem('marktab.appearance.v3');
    if (raw) cached = JSON.parse(raw);
  } catch (error) {
    cached = null;
  }

  var themeSetting = cached && cached.theme ? cached.theme : 'system';
  var motionSetting = cached && cached.motion ? cached.motion : 'system';
  var density = cached && cached.density ? cached.density : 'comfortable';

  var theme = themeSetting === 'system' ? (prefersDark ? 'dark' : 'light') : themeSetting;
  var motion =
    motionSetting === 'system'
      ? prefersReduced
        ? 'reduced'
        : 'full'
      : motionSetting === 'reduced'
        ? 'reduced'
        : 'full';

  root.setAttribute('data-theme', theme);
  root.setAttribute('data-density', density);
  root.setAttribute('data-motion', motion);
  root.setAttribute('data-booting', 'true');
  root.style.colorScheme = theme;

  var platform = 'other';
  try {
    var source = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    if (/mac|iphone|ipad/i.test(source)) platform = 'mac';
  } catch (error) {
    /* keep the platform-neutral shortcut labels */
  }
  root.setAttribute('data-platform', platform);
})();

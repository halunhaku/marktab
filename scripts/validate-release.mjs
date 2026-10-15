import { readFile, access, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

/**
 * Pre-release validation for MarkTab 3.
 *
 * Runs against the *built* extension in `dist/extension` (run `npm run build`
 * first) plus the repository documentation. Everything checked here is a store
 * requirement, a privacy claim we make in our own copy, or a performance budget we
 * committed to — nothing is checked "just because".
 */

const root = process.cwd();
const extensionDir = path.join(root, 'dist', 'extension');

const REQUIRED_RUNTIME_FILES = [
  'manifest.json',
  'newtab.html',
  'popup.html',
  'background.js',
  'theme-boot.js',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png',
  '_locales/en/messages.json',
  '_locales/zh_CN/messages.json',
];

const ALLOWED_PERMISSIONS = ['activeTab', 'bookmarks', 'favicon', 'search', 'storage'];
const REQUIRED_ICON_SIZES = ['16', '32', '48', '128'];

/** Budgets: a new tab page must stay small, and every byte is a cold start. */
const BUDGETS = {
  javascript: 420 * 1024,
  css: 130 * 1024,
  total: 1.2 * 1024 * 1024,
};

/** Strings that would contradict the privacy policy if they shipped. */
const FORBIDDEN_SCRIPT_PATTERNS = [
  { pattern: /\beval\s*\(/, message: 'uses eval(); MV3 forbids remote/dynamic code.' },
  { pattern: /new\s+Function\s*\(/, message: 'uses new Function().' },
  { pattern: /document\.write\s*\(/, message: 'uses document.write().' },
  { pattern: /XMLHttpRequest/, message: 'uses XMLHttpRequest; MarkTab makes no network requests of its own.' },
  { pattern: /\bfetch\s*\(/, message: 'calls fetch(); MarkTab must never contact a server.' },
  { pattern: /google-analytics|googletagmanager|sentry|mixpanel|posthog|amplitude/i, message: 'contains analytics/telemetry code.' },
  { pattern: /sourceMappingURL/, message: 'references a source map; production builds ship without maps.' },
];

const errors = [];
const warnings = [];

async function exists(target) {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readText(target) {
  return readFile(target, 'utf8');
}

async function readJson(target) {
  return JSON.parse(await readText(target));
}

async function walk(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await walk(path.join(dir, entry.name), relative)));
    else files.push(relative);
  }
  return files;
}

if (!(await exists(extensionDir))) {
  console.error('Release validation failed:');
  console.error('- dist/extension is missing. Run `npm run build` before validating.');
  process.exit(1);
}

const files = await walk(extensionDir);
const fileSet = new Set(files);

for (const required of REQUIRED_RUNTIME_FILES) {
  if (!fileSet.has(required)) errors.push(`Missing runtime file in dist/extension: ${required}`);
}

for (const file of files) {
  if (file.endsWith('.map')) errors.push(`Source map shipped: ${file}`);
  if (file.endsWith('.ts') || file.endsWith('.tsx')) errors.push(`TypeScript source shipped: ${file}`);
  if (file.endsWith('.md')) errors.push(`Documentation shipped in the extension bundle: ${file}`);
}

let manifest;
try {
  manifest = await readJson(path.join(extensionDir, 'manifest.json'));
} catch (error) {
  errors.push(`manifest.json is not valid JSON: ${error.message}`);
}

const pkg = await readJson(path.join(root, 'package.json'));
const sourceManifest = await readJson(path.join(root, 'public', 'manifest.json'));

if (manifest) {
  if (manifest.manifest_version !== 3) errors.push('manifest_version must be 3.');
  if (manifest.version !== pkg.version) {
    errors.push(`manifest version (${manifest.version}) must match package version (${pkg.version}).`);
  }
  if (sourceManifest.version !== pkg.version) {
    errors.push(`public/manifest.json version (${sourceManifest.version}) must match package version (${pkg.version}).`);
  }

  const permissions = [...(manifest.permissions ?? [])].sort();
  const expected = [...ALLOWED_PERMISSIONS].sort();
  if (permissions.length !== expected.length || permissions.some((value, index) => value !== expected[index])) {
    errors.push(
      `Permissions must stay exactly [${expected.join(', ')}]; found [${permissions.join(', ') || 'none'}].`,
    );
  }

  if ((manifest.host_permissions ?? []).length > 0) {
    errors.push('host_permissions must stay empty: MarkTab reads no page content.');
  }
  if ((manifest.optional_permissions ?? []).length > 0) {
    errors.push('optional_permissions must stay empty.');
  }
  if ((manifest.content_scripts ?? []).length > 0) {
    errors.push('MarkTab must not inject content scripts.');
  }

  const csp = manifest.content_security_policy?.extension_pages;
  if (csp && /unsafe-eval|unsafe-inline|http:/i.test(csp)) {
    errors.push(`content_security_policy.extension_pages is too permissive: ${csp}`);
  }

  if (manifest.chrome_url_overrides?.newtab !== 'newtab.html') {
    errors.push('chrome_url_overrides.newtab must be newtab.html.');
  }
  if (manifest.action?.default_popup !== 'popup.html') {
    errors.push('action.default_popup must be popup.html.');
  }
  if (manifest.background?.service_worker !== 'background.js') {
    errors.push('background.service_worker must be background.js.');
  }
  if (manifest.background?.type !== 'module') {
    errors.push('background.type must be module.');
  }
  if (manifest.default_locale !== 'en') {
    errors.push('default_locale must be en when localized __MSG_...__ fields are used.');
  }
  if (manifest.name !== '__MSG_appName__' || manifest.description !== '__MSG_appDescription__') {
    errors.push('name and description must use the localized __MSG_...__ placeholders.');
  }

  for (const size of REQUIRED_ICON_SIZES) {
    const iconPath = manifest.icons?.[size];
    if (!iconPath) errors.push(`Missing manifest icon size ${size}.`);
    else if (!fileSet.has(iconPath)) errors.push(`Manifest icon missing from build: ${iconPath}`);
  }
}

for (const localeFile of ['_locales/en/messages.json', '_locales/zh_CN/messages.json']) {
  try {
    const messages = await readJson(path.join(extensionDir, localeFile));
    for (const key of ['appName', 'appDescription']) {
      if (!messages[key]?.message) errors.push(`${localeFile} is missing message key: ${key}`);
    }
  } catch (error) {
    errors.push(`${localeFile} is not valid JSON: ${error.message}`);
  }
}

/* ---- HTML ------------------------------------------------------------- */

for (const file of files.filter((name) => name.endsWith('.html'))) {
  const html = await readText(path.join(extensionDir, file));
  if (/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(html)) errors.push(`${file} contains an inline script block.`);
  if (/<script\b[^>]*\bsrc=["']https?:\/\//i.test(html)) errors.push(`${file} loads a remote script.`);
  if (/\son[a-z]+\s*=/i.test(html)) errors.push(`${file} contains an inline event handler.`);
  if (/javascript:/i.test(html)) errors.push(`${file} contains a javascript: URL.`);
  if (/<link\b[^>]*\bhref=["']https?:\/\//i.test(html)) errors.push(`${file} loads a remote stylesheet.`);
  if (!/\btype=["']module["']/.test(html)) errors.push(`${file} does not load its bundle as a module.`);
}

/* ---- JS/CSS ----------------------------------------------------------- */

let jsBytes = 0;
let cssBytes = 0;

for (const file of files) {
  const target = path.join(extensionDir, file);
  const info = await stat(target);
  if (file.endsWith('.js')) jsBytes += info.size;
  if (file.endsWith('.css')) cssBytes += info.size;
  if (!file.endsWith('.js')) continue;
  const source = await readText(target);
  for (const { pattern, message } of FORBIDDEN_SCRIPT_PATTERNS) {
    if (pattern.test(source)) errors.push(`dist/extension/${file} ${message}`);
  }
}

const totalBytes = (
  await Promise.all(files.map(async (file) => (await stat(path.join(extensionDir, file))).size))
).reduce((sum, size) => sum + size, 0);

if (jsBytes > BUDGETS.javascript) {
  errors.push(`JavaScript budget exceeded: ${kb(jsBytes)} > ${kb(BUDGETS.javascript)}.`);
}
if (cssBytes > BUDGETS.css) {
  errors.push(`CSS budget exceeded: ${kb(cssBytes)} > ${kb(BUDGETS.css)}.`);
}
if (totalBytes > BUDGETS.total) {
  errors.push(`Total payload budget exceeded: ${kb(totalBytes)} > ${kb(BUDGETS.total)}.`);
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

/* ---- documentation ---------------------------------------------------- */

const docFiles = ['README.md', 'PRIVACY_POLICY.md', 'CHROME_STORE_SUBMISSION.md'];
for (const file of docFiles) {
  if (!(await exists(path.join(root, file)))) {
    errors.push(`Missing required document: ${file}`);
    continue;
  }
  const text = await readText(path.join(root, file));
  for (const permission of ALLOWED_PERMISSIONS) {
    if (!text.includes(permission)) warnings.push(`${file} does not mention the ${permission} permission.`);
  }
}

if (await exists(path.join(root, 'PRIVACY_POLICY.md'))) {
  const privacy = await readText(path.join(root, 'PRIVACY_POLICY.md'));
  if (/\b(analytics|telemetry|tracking)\b/i.test(privacy) && !/no (analytics|telemetry|tracking)/i.test(privacy)) {
    warnings.push('PRIVACY_POLICY.md mentions analytics without stating that MarkTab has none.');
  }
}

if (errors.length) {
  console.error('Release validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Release validation passed.');
console.log(`Runtime payload: ${kb(totalBytes)} total (js ${kb(jsBytes)}, css ${kb(cssBytes)}) across ${files.length} files.`);
if (warnings.length) {
  console.log('Warnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

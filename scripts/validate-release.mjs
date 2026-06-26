import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredFiles = [
  'manifest.json',
  'newtab.html',
  'newtab.js',
  'styles.css',
  'popup.html',
  'popup.js',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png',
  '_locales/en/messages.json',
  '_locales/zh_CN/messages.json',
  'README.md',
  'PRIVACY_POLICY.md',
  'CHROME_STORE_SUBMISSION.md'
];

const packageFiles = [
  'manifest.json',
  'newtab.html',
  'newtab.js',
  'styles.css',
  'popup.html',
  'popup.js',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png',
  '_locales'
];

const allowedPermissions = ['activeTab', 'bookmarks', 'favicon', 'search', 'storage'];
const requiredIconSizes = ['16', '32', '48', '128'];
const htmlFiles = ['newtab.html', 'popup.html'];
const jsFiles = ['newtab.js', 'popup.js'];
const docFiles = ['README.md', 'PRIVACY_POLICY.md', 'CHROME_STORE_SUBMISSION.md'];
const migrationChecks = [
  {
    file: 'newtab.js',
    forbidden: [
      { pattern: /\bACCENTS\b/, message: 'newtab.js should not keep the removed ACCENTS registry.' },
      { pattern: /--accent-primary|--accent-rgb/, message: 'newtab.js should not inject dynamic accent CSS variables.' },
      { pattern: /\baccent\s*:/, message: 'newtab.js DEFAULTS should not keep the removed accent setting.' },
      { pattern: /settings\.accent/, message: 'newtab.js should not read or write settings.accent after accent removal.' }
    ]
  },
  {
    file: 'styles.css',
    forbidden: [
      { pattern: /--bg-page|--font-display|--accent(?!-color)|--radius-sm|--radius-md|--radius-lg|--shadow-card|--shadow-elevated|--shadow-panel/, message: 'styles.css contains old MarkTab visual tokens.' },
      { pattern: /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.(?:0[1-9]|[1-9])\s*\)/, message: 'styles.css contains pure black alpha shadows or overlays.' }
    ]
  },
  {
    file: 'cloudflare/marktab-home-worker.js',
    forbidden: [
      { pattern: /--font-display|--radius-sm|--radius-md|--radius-lg/, message: 'cloudflare/marktab-home-worker.js contains old visual tokens.' },
      { pattern: /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.(?:0[1-9]|[1-9])\s*\)/, message: 'cloudflare/marktab-home-worker.js contains pure black alpha shadows or overlays.' }
    ]
  }
];

const errors = [];
const warnings = [];

async function exists(file) {
  try {
    await access(path.join(root, file), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readText(file) {
  return readFile(path.join(root, file), 'utf8');
}

function sameSet(actual, expected) {
  return actual.length === expected.length && actual.every((item, index) => item === expected[index]);
}

for (const file of requiredFiles) {
  if (!(await exists(file))) {
    errors.push(`Missing required file: ${file}`);
  }
}

let manifest;
try {
  manifest = JSON.parse(await readText('manifest.json'));
} catch (error) {
  errors.push(`manifest.json is not valid JSON: ${error.message}`);
}

let pkg;
try {
  pkg = JSON.parse(await readText('package.json'));
} catch (error) {
  errors.push(`package.json is not valid JSON: ${error.message}`);
}

if (manifest) {
  if (manifest.manifest_version !== 3) {
    errors.push('manifest_version must stay at 3.');
  }

  if (pkg && manifest.version !== pkg.version) {
    errors.push(`manifest version (${manifest.version}) must match package version (${pkg.version}).`);
  }

  const permissions = [...(manifest.permissions || [])].sort();
  if (!sameSet(permissions, allowedPermissions)) {
    errors.push(`Permissions changed. Expected ${allowedPermissions.join(', ')}; found ${permissions.join(', ') || 'none'}.`);
  }

  if (manifest.host_permissions?.length) {
    errors.push('host_permissions should stay empty unless a feature explicitly requires them.');
  }

  for (const size of requiredIconSizes) {
    const iconPath = manifest.icons?.[size];
    if (!iconPath) {
      errors.push(`Missing manifest icon size ${size}.`);
    } else if (!(await exists(iconPath))) {
      errors.push(`Manifest icon does not exist: ${iconPath}`);
    }
  }

  if (manifest.chrome_url_overrides?.newtab !== 'newtab.html') {
    errors.push('chrome_url_overrides.newtab must point to newtab.html.');
  }

  if (manifest.action?.default_popup !== 'popup.html') {
    errors.push('action.default_popup must point to popup.html.');
  }

  if (manifest.default_locale !== 'en') {
    errors.push('manifest.default_locale must be en when localized __MSG_...__ fields are used.');
  }

  if (manifest.name !== '__MSG_appName__') {
    errors.push('manifest.name must use the localized appName message.');
  }

  if (manifest.description !== '__MSG_appDescription__') {
    errors.push('manifest.description must use the localized appDescription message.');
  }
}

for (const localeFile of ['_locales/en/messages.json', '_locales/zh_CN/messages.json']) {
  try {
    const messages = JSON.parse(await readText(localeFile));
    for (const key of ['appName', 'appDescription', 'searchBookmarksAndFolders', 'openMarktabNewTab']) {
      if (!messages[key]?.message) {
        errors.push(`${localeFile} is missing message key: ${key}`);
      }
    }
  } catch (error) {
    errors.push(`${localeFile} is not valid JSON: ${error.message}`);
  }
}

for (const file of htmlFiles) {
  const html = await readText(file);
  if (/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(html)) {
    errors.push(`${file} contains an inline script block.`);
  }
  if (/<script\b[^>]*\bsrc=["']https?:\/\//i.test(html)) {
    errors.push(`${file} loads a remote script.`);
  }
  if (/\son[a-z]+\s*=/i.test(html)) {
    errors.push(`${file} contains an inline event handler.`);
  }
}

for (const file of jsFiles) {
  const js = await readText(file);
  if (/document\.write\s*\(/.test(js)) {
    errors.push(`${file} uses document.write.`);
  }
  if (/eval\s*\(|new Function\s*\(/.test(js)) {
    errors.push(`${file} uses dynamic code execution.`);
  }
}

for (const file of docFiles) {
  const text = await readText(file);
  for (const permission of allowedPermissions) {
    if (!text.includes(permission)) {
      warnings.push(`${file} does not mention ${permission}.`);
    }
  }
}

for (const { file, forbidden } of migrationChecks) {
  const text = await readText(file);
  for (const { pattern, message } of forbidden) {
    if (pattern.test(text)) {
      errors.push(message);
    }
  }
}

const styles = await readText('styles.css');
const backdropMatches = [...styles.matchAll(/(?:-webkit-)?backdrop-filter\s*:/g)];
if (backdropMatches.length !== 2 || !/\.search-panel-overlay\s*\{[\s\S]*backdrop-filter\s*:\s*blur\(4px\)[\s\S]*-webkit-backdrop-filter\s*:\s*blur\(4px\)/.test(styles)) {
  errors.push('styles.css should only keep backdrop-filter on the Spotlight search overlay.');
}

const storeSubmission = await readText('CHROME_STORE_SUBMISSION.md');
if (/accent color|theme,\s*accent/i.test(storeSubmission)) {
  errors.push('CHROME_STORE_SUBMISSION.md still describes the removed accent color setting.');
}

const packageList = packageFiles.join(' ');
const packageScriptText = await readText('scripts/package-release.mjs');
const packageScriptHasFiles = packageFiles.every(file => packageScriptText.includes(`'${file}'`));
if (pkg?.scripts?.package && !pkg.scripts.package.includes(packageList) && !packageScriptHasFiles) {
  warnings.push('Package script does not appear to include the expected runtime file list.');
}

if (errors.length) {
  console.error('Release validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Release validation passed.');
if (warnings.length) {
  console.log('Warnings:');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

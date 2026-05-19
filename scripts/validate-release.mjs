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
  'icons/icon128.png'
];

const allowedPermissions = ['activeTab', 'bookmarks', 'favicon', 'storage'];
const requiredIconSizes = ['16', '32', '48', '128'];
const htmlFiles = ['newtab.html', 'popup.html'];
const jsFiles = ['newtab.js', 'popup.js'];
const docFiles = ['README.md', 'PRIVACY_POLICY.md', 'CHROME_STORE_SUBMISSION.md'];

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

const packageList = packageFiles.join(' ');
if (pkg?.scripts?.package && !pkg.scripts.package.includes(packageList)) {
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

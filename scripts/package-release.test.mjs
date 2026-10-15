import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageScript = path.join(root, 'scripts', 'package-release.mjs');

/** Mirrors a real `dist/extension` tree. */
const fixtureEntries = [
  ['manifest.json', '{"manifest_version":3}'],
  ['newtab.html', '<main>new tab</main>'],
  ['popup.html', '<main>popup</main>'],
  ['background.js', 'console.log("background");'],
  ['theme-boot.js', 'console.log("boot");'],
  ['assets/newtab-abc123.js', 'console.log("newtab");'],
  ['assets/newtab-def456.css', 'body {}'],
  ['icons/icon16.png', 'icon16'],
  ['icons/icon32.png', 'icon32'],
  ['icons/icon48.png', 'icon48'],
  ['icons/icon128.png', 'icon128'],
  ['_locales/en/messages.json', '{"locale":"en"}'],
  ['_locales/zh_CN/messages.json', '{"locale":"zh_CN"}']
];

async function writeFixture(fixtureRoot, entries, mtime) {
  for (const [entry, contents] of entries) {
    const sourcePath = path.join(fixtureRoot, 'dist', 'extension', ...entry.split('/'));
    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(sourcePath, contents);
    await utimes(sourcePath, mtime, mtime);
  }
}

async function packageFixture(fixtureRoot, extraEnv = {}) {
  await execFileAsync(process.execPath, [packageScript], {
    cwd: fixtureRoot,
    env: { ...process.env, npm_package_version: '9.8.7', ...extraEnv }
  });
  return path.join(fixtureRoot, 'dist', 'marktab-9.8.7.zip');
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

async function listZipEntries(file, cwd) {
  if (process.platform !== 'win32') {
    const { stdout } = await execFileAsync('unzip', ['-Z1', file], { cwd });
    return stdout.trim().split(/\r?\n/).filter(Boolean);
  }

  const command = `
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    $zip = [IO.Compression.ZipFile]::OpenRead('${file.replaceAll("'", "''")}');
    try { $zip.Entries | ForEach-Object { $_.FullName } }
    finally { $zip.Dispose() }
  `;
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command', command
  ], { cwd });
  return stdout.trim().split(/\r?\n/).filter(Boolean);
}

async function fixtureRoot(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'marktab-package-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('release package is byte-for-byte reproducible with sorted entries', async t => {
  const dir = await fixtureRoot(t);
  await writeFixture(dir, fixtureEntries, new Date('2024-01-02T03:04:05Z'));
  const firstHash = await sha256(await packageFixture(dir));

  for (const [entry] of fixtureEntries) {
    await rm(path.join(dir, 'dist', 'extension', ...entry.split('/')), { force: true });
  }
  await writeFixture(dir, [...fixtureEntries].reverse(), new Date('2025-06-07T08:09:10Z'));
  const secondZip = await packageFixture(dir);
  const entries = await listZipEntries(secondZip, dir);

  assert.equal(await sha256(secondZip), firstHash);
  assert.deepEqual(entries, [...entries].sort((a, b) => a.localeCompare(b, 'en')));
});

test('release package contains the built runtime tree and no build leftovers', async t => {
  const dir = await fixtureRoot(t);
  await writeFixture(dir, fixtureEntries, new Date('2024-01-02T03:04:05Z'));
  const zip = await packageFixture(dir);
  const entries = await listZipEntries(zip, dir);

  assert.deepEqual(entries, fixtureEntries.map(([entry]) => entry).sort((a, b) => a.localeCompare(b, 'en')));
  assert.ok(entries.includes('_locales/en/messages.json'));
  assert.ok(entries.includes('_locales/zh_CN/messages.json'));
  assert.ok(!entries.some(entry => entry.endsWith('.map') || entry.endsWith('.ts')));
});

test('release package refuses to run without a build', async t => {
  const dir = await fixtureRoot(t);
  await mkdir(path.join(dir, 'dist'), { recursive: true });

  await assert.rejects(packageFixture(dir), error => {
    assert.match(error.stderr, /dist\/extension is missing/);
    return true;
  });
});

test('release package rejects malformed SOURCE_DATE_EPOCH', async t => {
  const dir = await fixtureRoot(t);
  await writeFixture(dir, fixtureEntries, new Date('2024-01-02T03:04:05Z'));

  await assert.rejects(packageFixture(dir, { SOURCE_DATE_EPOCH: 'not-a-timestamp' }), error => {
    assert.match(error.stderr, /SOURCE_DATE_EPOCH must be a finite nonnegative integer/);
    return true;
  });
});

test('release package rejects an empty build directory', async t => {
  const dir = await fixtureRoot(t);
  await mkdir(path.join(dir, 'dist', 'extension'), { recursive: true });

  await assert.rejects(packageFixture(dir), error => {
    assert.match(error.stderr, /refusing to package an empty extension/);
    return true;
  });
});

test('checked-in manifest version matches package version', async () => {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const manifest = JSON.parse(await readFile(path.join(root, 'public', 'manifest.json'), 'utf8'));
  assert.equal(manifest.version, pkg.version);
});

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const zipPath = path.join(root, 'dist', 'marktab-1.4.1.zip');
const windowsOnlyTest = process.platform === 'win32' ? test : test.skip;
const packageScript = path.join(root, 'scripts', 'package-release.mjs');

const fixtureEntries = [
  ['styles.css', 'body {}'],
  ['popup.js', 'console.log("popup");'],
  ['_locales/zh_CN/messages.json', '{"locale":"zh_CN"}'],
  ['icons/icon48.png', 'icon48'],
  ['manifest.json', '{"manifest_version":3}'],
  ['newtab.js', 'console.log("newtab");'],
  ['icons/icon16.png', 'icon16'],
  ['popup.html', '<main>popup</main>'],
  ['_locales/en/messages.json', '{"locale":"en"}'],
  ['icons/icon128.png', 'icon128'],
  ['newtab.html', '<main>new tab</main>'],
  ['icons/icon32.png', 'icon32']
];

async function writeFixture(fixtureRoot, entries, mtime) {
  for (const [entry, contents] of entries) {
    const sourcePath = path.join(fixtureRoot, ...entry.split('/'));
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

test('release package is byte-for-byte reproducible with sorted entries', async t => {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'marktab-package-'));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));

  await writeFixture(fixtureRoot, fixtureEntries, new Date('2024-01-02T03:04:05Z'));
  const firstZip = await packageFixture(fixtureRoot);
  const firstHash = await sha256(firstZip);

  for (const [entry] of fixtureEntries) {
    await rm(path.join(fixtureRoot, ...entry.split('/')), { force: true });
  }
  await writeFixture(
    fixtureRoot,
    [...fixtureEntries].reverse(),
    new Date('2025-06-07T08:09:10Z')
  );
  const secondZip = await packageFixture(fixtureRoot);
  const secondHash = await sha256(secondZip);
  const entries = await listZipEntries(secondZip, fixtureRoot);

  assert.equal(secondHash, firstHash);
  assert.deepEqual(entries, [...entries].sort((a, b) => a.localeCompare(b, 'en')));
});

test('release package rejects malformed SOURCE_DATE_EPOCH', async t => {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'marktab-package-'));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  await writeFixture(fixtureRoot, fixtureEntries, new Date('2024-01-02T03:04:05Z'));

  await assert.rejects(
    packageFixture(fixtureRoot, { SOURCE_DATE_EPOCH: 'not-a-timestamp' }),
    error => {
      assert.match(error.stderr, /SOURCE_DATE_EPOCH must be a finite nonnegative integer/);
      return true;
    }
  );
});

windowsOnlyTest('Windows release package includes localized message files', async () => {
  await execFileAsync(process.execPath, ['scripts/package-release.mjs'], {
    cwd: root,
    env: { ...process.env, npm_package_version: '1.4.1' }
  });

  await access(zipPath);
  const command = `
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    $zip = [IO.Compression.ZipFile]::OpenRead('${zipPath.replaceAll("'", "''")}');
    try { $zip.Entries | ForEach-Object { $_.FullName } }
    finally { $zip.Dispose() }
  `;
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command', command
  ], { cwd: root });

  assert.match(stdout, /_locales\/en\/messages\.json/);
  assert.match(stdout, /_locales\/zh_CN\/messages\.json/);
});

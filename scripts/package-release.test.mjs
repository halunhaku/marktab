import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const zipPath = path.join(root, 'dist', 'marktab-1.4.1.zip');

test('Windows release package includes localized message files', async () => {
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

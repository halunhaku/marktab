import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readdir, rm, utimes } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const version = process.env.npm_package_version;

if (!version) {
  console.error('npm_package_version is required.');
  process.exit(1);
}

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

const distDir = path.resolve(root, 'dist');
const zipPath = path.join(distDir, `marktab-${version}.zip`);
// ZIP timestamps cannot represent dates before 1980. A fixed default makes
// local release retries reproducible even when SOURCE_DATE_EPOCH is not set.
const defaultArchiveEpoch = Date.UTC(1980, 0, 1) / 1000;
const maximumArchiveEpoch = Date.UTC(2107, 11, 31, 23, 59, 58) / 1000;

function resolveArchiveDate() {
  const rawEpoch = process.env.SOURCE_DATE_EPOCH;
  if (rawEpoch === undefined) return new Date(defaultArchiveEpoch * 1000);

  const epoch = rawEpoch.trim() === '' ? NaN : Number(rawEpoch);
  if (!Number.isFinite(epoch) || !Number.isInteger(epoch) || epoch < 0) {
    throw new Error('SOURCE_DATE_EPOCH must be a finite nonnegative integer.');
  }

  const zipEpoch = Math.min(maximumArchiveEpoch, Math.max(defaultArchiveEpoch, epoch));
  return new Date(zipEpoch * 1000);
}

const archiveDate = resolveArchiveDate();

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? root,
      env: options.env ?? process.env,
      stdio: 'inherit'
    });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}

async function collectFiles(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const entries = await readdir(sourcePath, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOTDIR') return null;
    throw error;
  });

  if (entries === null) return [relativePath.replaceAll(path.sep, '/')];

  const files = [];
  for (const entry of entries) {
    const childPath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(childPath));
    else if (entry.isFile()) files.push(childPath.replaceAll(path.sep, '/'));
  }
  return files;
}

const archiveEntries = (await Promise.all(packageFiles.map(collectFiles)))
  .flat()
  .sort();

await mkdir(distDir, { recursive: true });
for (const file of await readdir(distDir)) {
  if (/^marktab-\d+\.\d+\.\d+\.zip$/.test(file)) {
    await rm(path.join(distDir, file), { force: true });
  }
}

if (process.platform === 'win32') {
  const command = `
    Add-Type -AssemblyName System.IO.Compression;
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    $items = $env:MARKTAB_PACKAGE_ENTRIES | ConvertFrom-Json;
    $timestamp = [DateTimeOffset]::Parse(
      $env:MARKTAB_PACKAGE_TIMESTAMP,
      [Globalization.CultureInfo]::InvariantCulture,
      [Globalization.DateTimeStyles]::RoundtripKind
    );
    $zip = [IO.Compression.ZipFile]::Open(
      $env:MARKTAB_PACKAGE_DESTINATION,
      [IO.Compression.ZipArchiveMode]::Create
    );
    try {
      $root = (Get-Location).Path;
      foreach ($item in $items) {
        $sourcePath = [IO.Path]::GetFullPath((Join-Path $root $item.source));
        $entry = $zip.CreateEntry($item.entry, [IO.Compression.CompressionLevel]::Optimal);
        $entry.LastWriteTime = $timestamp;
        $source = [IO.File]::OpenRead($sourcePath);
        $destination = $entry.Open();
        try {
          $source.CopyTo($destination);
        } finally {
          $destination.Dispose();
          $source.Dispose();
        }
      }
    } finally {
      if ($zip) { $zip.Dispose(); }
    }
  `;
  const entriesJson = JSON.stringify(archiveEntries.map(entry => ({
    source: entry.split('/').join(path.sep),
    entry
  })));
  await run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    env: {
      ...process.env,
      MARKTAB_PACKAGE_DESTINATION: zipPath,
      MARKTAB_PACKAGE_ENTRIES: entriesJson,
      MARKTAB_PACKAGE_TIMESTAMP: archiveDate.toISOString()
    }
  });
} else {
  const stagingDir = await mkdtemp(path.join(os.tmpdir(), 'marktab-package-'));
  try {
    for (const entry of archiveEntries) {
      const stagedPath = path.join(stagingDir, ...entry.split('/'));
      await mkdir(path.dirname(stagedPath), { recursive: true });
      await copyFile(path.join(root, ...entry.split('/')), stagedPath);
      await utimes(stagedPath, archiveDate, archiveDate);
    }
    await run('zip', ['-X', zipPath, ...archiveEntries], {
      cwd: stagingDir,
      env: { ...process.env, TZ: 'UTC' }
    });
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}

console.log(`Created ${path.relative(root, zipPath)}`);

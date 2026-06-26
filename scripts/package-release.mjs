import { mkdir, readdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
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

const distDir = path.join(root, 'dist');
const zipPath = path.join(distDir, `marktab-${version}.zip`);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}

await mkdir(distDir, { recursive: true });
for (const file of await readdir(distDir)) {
  if (/^marktab-\d+\.\d+\.\d+\.zip$/.test(file)) {
    await rm(path.join(distDir, file), { force: true });
  }
}

if (process.platform === 'win32') {
  const psFiles = packageFiles.map(file => `'${file.replaceAll("'", "''")}'`).join(', ');
  const psZipPath = zipPath.replaceAll("'", "''");
  const command = `
    Add-Type -AssemblyName System.IO.Compression;
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    $zip = [IO.Compression.ZipFile]::Open('${psZipPath}', [IO.Compression.ZipArchiveMode]::Create);
    try {
      foreach ($file in @(${psFiles})) {
        $source = Join-Path (Get-Location) $file;
        $entry = $file.Replace('\\\\', '/');
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $source, $entry) | Out-Null;
      }
    } finally {
      if ($zip) { $zip.Dispose(); }
    }
  `;
  await run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]);
} else {
  await run('zip', ['-X', '-r', zipPath, ...packageFiles]);
}

console.log(`Created ${path.relative(root, zipPath)}`);

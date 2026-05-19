import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const nextVersion = process.argv[2];

if (!nextVersion || !/^\d+\.\d+\.\d+$/.test(nextVersion)) {
  console.error('Usage: npm run bump -- 1.2.3');
  process.exit(1);
}

async function readJson(file) {
  return JSON.parse(await readFile(path.join(root, file), 'utf8'));
}

async function writeJson(file, data) {
  await writeFile(path.join(root, file), `${JSON.stringify(data, null, 2)}\n`);
}

async function replaceInFile(file, replacer) {
  const filePath = path.join(root, file);
  const text = await readFile(filePath, 'utf8');
  await writeFile(filePath, replacer(text));
}

const pkg = await readJson('package.json');
pkg.version = nextVersion;
await writeJson('package.json', pkg);

const manifest = await readJson('manifest.json');
manifest.version = nextVersion;
await writeJson('manifest.json', manifest);

await replaceInFile('README.md', text => text.replace(/marktab-\d+\.\d+\.\d+\.zip/g, `marktab-${nextVersion}.zip`));
await replaceInFile('CHROME_STORE_SUBMISSION.md', text => text.replace(/marktab-\d+\.\d+\.\d+\.zip/g, `marktab-${nextVersion}.zip`));
await replaceInFile('popup.html', text => text.replace(/v\d+\.\d+\.\d+/g, `v${nextVersion}`));

console.log(`Version bumped to ${nextVersion}.`);

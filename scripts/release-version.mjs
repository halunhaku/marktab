import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Verifies that a release tag matches both version sources.
 *
 * The extension manifest lives in `public/` (it is copied verbatim into the build),
 * so it — not a root copy — is the shipped version.
 */
const MANIFEST_PATH = ['public', 'manifest.json'];

async function readJson(root, file) {
  return JSON.parse(await readFile(path.join(root, file), 'utf8'));
}

export async function validateReleaseVersion({ root = process.cwd(), tag }) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? '')) {
    throw new Error('Tag must match vX.Y.Z.');
  }

  const tagVersion = tag.slice(1);
  const [pkg, manifest] = await Promise.all([
    readJson(root, 'package.json'),
    readJson(root, path.join(...MANIFEST_PATH))
  ]);

  if (pkg.version !== tagVersion || manifest.version !== tagVersion) {
    throw new Error(
      `Version mismatch: tag=${tagVersion} package=${pkg.version} manifest=${manifest.version}`
    );
  }

  return tagVersion;
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  try {
    console.log(await validateReleaseVersion({ tag: process.argv[2] }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

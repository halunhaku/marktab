import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const workflowPath = fileURLToPath(new URL('../.github/workflows/release.yml', import.meta.url));
const ciPath = fileURLToPath(new URL('../.github/workflows/ci.yml', import.meta.url));
const chromeGuidePath = fileURLToPath(new URL('../CHROME_STORE_SUBMISSION.md', import.meta.url));
const packageJsonPath = fileURLToPath(new URL('../package.json', import.meta.url));
const readWorkflow = () => readFile(workflowPath, 'utf8');

function positionOf(source, token) {
  const position = source.indexOf(token);
  assert.notEqual(position, -1, `Expected workflow to contain: ${token}`);
  return position;
}

test('release workflow has intended triggers and controls', async () => {
  const workflow = await readWorkflow();
  assert.match(workflow, /^name: Release$/m);
  assert.match(workflow, /^on:\n  push:\n    tags:\n      - 'v\*'\n  workflow_dispatch:/m);
  assert.match(workflow, /publish_github_release_only:\n        description: .*Chrome.*\n        required: false/);
  assert.doesNotMatch(workflow, /resume_edge_upload_operation_id|skip_chrome_web_store/);
  assert.doesNotMatch(workflow, /\bEdge\b|EDGE_/);
  assert.doesNotMatch(workflow, /pull_request/);
  assert.match(workflow, /^permissions:\n  contents: write$/m);
  assert.match(workflow, /^concurrency:\n  group: browser-store-release\n  queue: max\n  cancel-in-progress: false$/m);
  assert.match(workflow, /^jobs:\n  release:\n    runs-on: ubuntu-latest\n    timeout-minutes: 30$/m);
});

test('release workflow validates an exact tag and checks it out', async () => {
  const workflow = await readWorkflow();
  assert.match(workflow, /REQUESTED_TAG: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.tag \|\| github\.ref_name \}\}/);
  assert.match(workflow, /\^v\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\$/);
  assert.match(workflow, /ref: refs\/tags\/\$\{\{ steps\.release\.outputs\.tag \}\}/);
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /run: npm ci/);
});

test('release order is install, test, build, validate, package, Chrome Web Store, then GitHub publication', async () => {
  const workflow = await readWorkflow();
  const tokens = [
    'node scripts/release-version.mjs "$TAG"', 'npm test', 'npm run build', 'npm run validate',
    'npm run package',
    'gh release create "$TAG" --verify-tag --draft',
    'gh release upload "$TAG" "dist/marktab-$VERSION.zip" --clobber',
    'npm run cws:publish -- "dist/marktab-$VERSION.zip"',
    'gh release edit "$TAG" --draft=false',
  ];
  const positions = tokens.map((token) => positionOf(workflow, token));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test('Chrome Web Store secrets are confined to the publish step', async () => {
  const workflow = await readWorkflow();
  const chromeStart = positionOf(workflow, '- name: Publish to Chrome Web Store');
  const githubStart = positionOf(workflow, '- name: Publish GitHub Release');
  const chromeStep = workflow.slice(chromeStart, githubStart);
  for (const name of ['CWS_CLIENT_ID', 'CWS_CLIENT_SECRET', 'CWS_REFRESH_TOKEN', 'CWS_PUBLISHER_ID', 'CWS_ITEM_ID']) {
    assert.equal((workflow.match(new RegExp(`\\$\\{\\{ secrets\\.${name} \\}\\}`, 'g')) ?? []).length, 1);
    assert.match(chromeStep, new RegExp(`${name}: \\$\\{\\{ secrets\\.${name} \\}\\}`));
  }
});

test('recovery skips the store and keeps failed releases as drafts', async () => {
  const workflow = await readWorkflow();
  for (const step of ['Check out release tag', 'Verify release version', 'Run tests', 'Build extension', 'Validate extension', 'Package extension', 'Prepare draft GitHub Release', 'Publish to Chrome Web Store']) {
    assert.match(workflow, new RegExp(`- name: ${step}\\n        if: steps\\.release\\.outputs\\.recovery != 'true'$`, 'm'));
  }
  assert.match(workflow, /Chrome Web Store acceptance was confirmed/i);
  assert.match(workflow, /Recovery mode skips the store submission/i);
  assert.match(workflow, /draft remains unpublished/i);
  assert.match(workflow, /timeout 60s gh release edit/);
});

test('the Chrome guide documents safe recovery and no retired Edge path', async () => {
  const chrome = await readFile(chromeGuidePath, 'utf8');
  assert.match(chrome, /publish_github_release_only/);
  assert.match(chrome, /Edge/);
  assert.match(chrome, /retired|withdrawn/i);
  assert.doesNotMatch(chrome, /resume_edge_upload_operation_id|skip_chrome_web_store|edge:publish/);
});

test('CI runs typecheck, tests, build, validation and the end-to-end suite', async () => {
  const ci = await readFile(ciPath, 'utf8');
  for (const command of ['npm ci', 'npm run typecheck', 'npm test', 'npm run build', 'npm run validate']) {
    assert.match(ci, new RegExp(`run: ${command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }
  assert.match(ci, /npx playwright install --with-deps chromium/);
  assert.match(ci, /npx playwright test/);
  assert.match(ci, /MARKTAB_E2E_CHANNEL: chromium/);
});

test('npm scripts cover the full local verification path', async () => {
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const scripts = pkg.scripts;
  for (const name of ['dev', 'build', 'typecheck', 'test', 'test:unit', 'test:scripts', 'test:e2e', 'validate', 'package']) {
    assert.equal(typeof scripts[name], 'string', `package.json is missing the ${name} script.`);
  }
  assert.match(scripts.test, /test:unit/);
  assert.match(scripts.test, /test:scripts/);
  assert.match(scripts['test:scripts'], /node --test scripts\/\*\.test\.mjs/);
  assert.match(scripts['test:e2e'], /playwright test/);
  assert.equal(scripts.package, 'node scripts/package-release.mjs');
});

test('retired v2 layout test is gone', async () => {
  await assert.rejects(access(fileURLToPath(new URL('./newtab-layout.test.mjs', import.meta.url))));
});

test('retired Edge publishing is gone from the repository', async () => {
  for (const file of [
    '../EDGE_STORE_SUBMISSION.md',
    './edge-api.mjs',
    './edge-api.test.mjs',
    './edge-publish.mjs',
    './edge-publish.test.mjs',
  ]) {
    await assert.rejects(access(fileURLToPath(new URL(file, import.meta.url))), `${file} should not exist.`);
  }
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  assert.equal(pkg.scripts['edge:publish'], undefined);
});

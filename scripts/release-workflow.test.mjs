import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const workflowPath = fileURLToPath(new URL('../.github/workflows/release.yml', import.meta.url));
const storeGuidePath = fileURLToPath(new URL('../CHROME_STORE_SUBMISSION.md', import.meta.url));

async function readWorkflow() {
  return readFile(workflowPath, 'utf8');
}

function positionOf(source, token) {
  const position = source.indexOf(token);
  assert.notEqual(position, -1, `Expected workflow to contain: ${token}`);
  return position;
}

test('release workflow has only the intended triggers and repository-wide controls', async () => {
  const workflow = await readWorkflow();

  assert.match(workflow, /^name: Release$/m);
  assert.match(workflow, /^on:\n  push:\n    tags:\n      - 'v\*'\n  workflow_dispatch:\n    inputs:/m);
  assert.match(workflow, /^      tag:\n        description: .*\n        required: true\n        type: string$/m);
  assert.match(workflow, /^      publish_github_release_only:\n        description: .*Chrome Web Store.*\n        required: false\n        default: false\n        type: boolean$/m);
  assert.match(workflow, /^        description: .*existing vX\.Y\.Z tag.*$/mi);
  assert.match(workflow, /^        description: .*retry.*$/mi);
  assert.doesNotMatch(workflow, /pull_request/);
  assert.match(workflow, /^permissions:\n  contents: write$/m);
  assert.match(workflow, /^concurrency:\n  group: chrome-web-store-release\n  queue: max\n  cancel-in-progress: false$/m);
  assert.doesNotMatch(workflow, /^  cancel-in-progress: true$/m);
  assert.match(workflow, /^jobs:\n  release:\n    runs-on: ubuntu-latest\n    timeout-minutes: 30$/m);
  assert.equal((workflow.match(/^  [a-zA-Z][\w-]*:\n    runs-on:/gm) ?? []).length, 1);
});

test('release workflow resolves and validates an exact tag before checking it out', async () => {
  const workflow = await readWorkflow();

  assert.match(workflow, /REQUESTED_TAG: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.tag \|\| github\.ref_name \}\}/);
  assert.match(workflow, /\^v\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\$/);
  assert.match(workflow, /echo "tag=\$REQUESTED_TAG" >> "\$GITHUB_OUTPUT"/);
  assert.match(workflow, /echo "version=\$\{REQUESTED_TAG#v\}" >> "\$GITHUB_OUTPUT"/);
  assert.match(workflow, /uses: actions\/checkout@v4\n        with:\n          fetch-depth: 0\n          ref: refs\/tags\/\$\{\{ steps\.release\.outputs\.tag \}\}/);
  assert.doesNotMatch(workflow, /^          ref: \$\{\{ steps\.release\.outputs\.tag \}\}$/m);
  assert.match(workflow, /uses: actions\/setup-node@v4\n        with:\n          node-version: 20/);
});

test('release workflow verifies, drafts, uploads, publishes to the store, then publishes the release', async () => {
  const workflow = await readWorkflow();
  const orderedTokens = [
    'node scripts/release-version.mjs "$TAG"',
    'npm test',
    'npm run validate',
    'npm run package',
    'gh release create "$TAG" --verify-tag --draft',
    'gh release upload "$TAG" "dist/marktab-$VERSION.zip" --clobber',
    'npm run cws:publish -- "dist/marktab-$VERSION.zip"',
    'gh release edit "$TAG" --draft=false',
  ];
  const positions = orderedTokens.map((token) => positionOf(workflow, token));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));

  assert.match(workflow, /gh release view "\$TAG" --json isDraft --jq '\.isDraft'/);
  assert.match(workflow, /existing release for \$TAG is not a draft/i);
  assert.match(workflow, /GH_TOKEN: \$\{\{ github\.token \}\}/);
});

test('Chrome Web Store secrets are all present and confined to the store step', async () => {
  const workflow = await readWorkflow();
  const secretNames = ['CWS_CLIENT_ID', 'CWS_CLIENT_SECRET', 'CWS_REFRESH_TOKEN', 'CWS_ITEM_ID'];
  const storeStart = positionOf(workflow, '- name: Publish to Chrome Web Store');
  const storeEnd = positionOf(workflow, '- name: Publish GitHub Release');
  const storeStep = workflow.slice(storeStart, storeEnd);

  for (const name of secretNames) {
    const reference = `${name}: \${{ secrets.${name} }}`;
    assert.equal((workflow.match(new RegExp(`\\$\\{\\{ secrets\\.${name} \\}\\}`, 'g')) ?? []).length, 1);
    assert.match(storeStep, new RegExp(reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(workflow.slice(0, storeStart) + workflow.slice(storeEnd), /secrets\./);
});

test('release workflow keeps failed releases as drafts and documents a safe retry path', async () => {
  const workflow = await readWorkflow();
  const failureStart = positionOf(workflow, '- name: Summarize release failure');
  const failureStep = workflow.slice(failureStart);

  assert.match(failureStep, /if: failure\(\)/);
  assert.match(failureStep, /\$GITHUB_STEP_SUMMARY/);
  assert.match(failureStep, /release stopped/i);
  assert.match(failureStep, /draft remains/i);
  assert.match(failureStep, /failed step/i);
  assert.match(failureStep, /store dashboard/i);
  assert.match(failureStep, /retry/i);
  assert.doesNotMatch(failureStep, /secrets\.|CWS_/);
});

test('release workflow can recover GitHub publication without resubmitting the store item', async () => {
  const workflow = await readWorkflow();
  assert.match(workflow, /RECOVERY_REQUESTED: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.publish_github_release_only \|\| false \}\}/);
  assert.match(workflow, /echo "recovery=\$RECOVERY_REQUESTED" >> "\$GITHUB_OUTPUT"/);

  for (const step of [
    'Check out release tag',
    'Set up Node.js',
    'Verify release version',
    'Run tests',
    'Validate extension',
    'Package extension',
    'Prepare draft GitHub Release',
    'Publish to Chrome Web Store',
  ]) {
    assert.match(
      workflow,
      new RegExp(`- name: ${step}\\n        if: steps\\.release\\.outputs\\.recovery != 'true'`),
    );
  }

  assert.match(workflow, /RECOVERY_ONLY: \$\{\{ steps\.release\.outputs\.recovery \}\}/);
  assert.match(workflow, /if \[\[ "\$RECOVERY_ONLY" == "true" \]\]; then/);
  assert.match(workflow, /Chrome Web Store acceptance was confirmed by the operator/i);
  assert.match(workflow, /for attempt in 1 2 3; do/);
  assert.match(workflow, /timeout 60s gh release edit "\$TAG" --draft=false/);
  assert.match(workflow, /recovery.*skips.*Chrome Web Store/i);
});

test('store guide distinguishes a store retry from GitHub-release-only recovery', async () => {
  const guide = await readFile(storeGuidePath, 'utf8');
  assert.match(guide, /publish_github_release_only/);
  assert.match(guide, /confirm.*Chrome Web Store.*accepted/i);
  assert.match(guide, /skip.*Chrome Web Store.*(?:upload|submission)/i);
  assert.match(guide, /existing draft/i);
});

test('npm test retains all existing tests and includes the workflow contract', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const expectedTests = [
    'scripts/newtab-layout.test.mjs',
    'scripts/package-release.test.mjs',
    'scripts/release-version.test.mjs',
    'scripts/cws-api.test.mjs',
    'scripts/cws-publish.test.mjs',
    'scripts/cws-auth.test.mjs',
    'scripts/release-workflow.test.mjs',
  ];

  for (const testPath of expectedTests) assert.match(packageJson.scripts.test, new RegExp(testPath.replaceAll('.', '\\.')));
});

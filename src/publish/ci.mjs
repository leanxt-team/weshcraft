// CI that keeps design and specs together: on every push/PR it re-extracts the manifest from the
// committed .figcraft file and fails when the committed specs or prototype no longer match it.
// Everything WeshCraft writes lives in the wcraft/ folder, so the CI watches that folder.
import { ROOT, DESIGN } from '../layout.mjs';

const PKG = process.env.WESHCRAFT_PACKAGE || 'weshcraft';

export function ciFiles(provider, { prefix = '', design, args } = {}) {
  const out = prefix || '.';
  const designArg = args || (design ? `--file ${design}` : `--file ${DESIGN}/*.figcraft`);
  if (provider === 'gitlab') {
    return [{
      path: 'ci/weshcraft.gitlab-ci.yml',
      content: `# Include from your .gitlab-ci.yml:\n#   include:\n#     - local: ci/weshcraft.gitlab-ci.yml\n# Fails the pipeline when specs or the prototype drift from the FigCraft design.\nweshcraft-parity:\n  image: node:22-alpine\n  stage: test\n  variables:\n    WESHCRAFT_PACKAGE: "${PKG}"\n  rules:\n    - changes: ["${ROOT}/**/*"]\n  script:\n    - set -o pipefail\n    - npx --yes "$WESHCRAFT_PACKAGE" check ${designArg} --out ${out} --format markdown | tee parity.md\n  artifacts:\n    when: always\n    paths: [parity.md]\n`,
    }];
  }
  return [{
    path: '.github/workflows/weshcraft-parity.yml',
    content: `# Fails the check when specs or the prototype drift from the FigCraft design.\nname: weshcraft parity\non:\n  pull_request:\n    paths: ["${ROOT}/**"]\n  push:\n    branches: [main]\n    paths: ["${ROOT}/**"]\npermissions:\n  contents: read\njobs:\n  parity:\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    env:\n      WESHCRAFT_PACKAGE: "${PKG}"\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - name: Check specs against the prototype\n        run: npx --yes "$WESHCRAFT_PACKAGE" check ${designArg} --out ${out} --format markdown >> "$GITHUB_STEP_SUMMARY"\n`,
  }];
}

export const ciPathFor = provider => (provider === 'gitlab' ? 'ci/weshcraft.gitlab-ci.yml' : '.github/workflows/weshcraft-parity.yml');

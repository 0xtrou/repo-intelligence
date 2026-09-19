import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildProfile, countLines, detectRoutes } from './profileLib';

function makeFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ri-profile-'));
  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
  };
  write('package.json', JSON.stringify({
    name: 'fixture',
    scripts: { test: 'vitest run', build: 'astro build', deploy: 'wrangler deploy' },
    dependencies: { astro: '^1.0.0' },
    devDependencies: { vitest: '^1.0.0', '@playwright/test': '^1.0.0' },
  }));
  write('package-lock.json', '{"lockfileVersion": 3}\n');
  write('AGENTS.md', '# rules\n');
  write('.github/workflows/ci.yml', 'on: push\n');
  // 3 lines each (trailing newline excluded by countLines semantics: a\nb\nc\n = 3 lines)
  write('src/lib/util.ts', 'export const a = 1;\nexport const b = 2;\nexport const c = 3;\n');
  write('src/pages/index.astro', '---\n---\n<div/>\n');
  write('src/pages/products/[slug].astro', '---\n---\n<div/>\n');
  write('src/lib/x.test.ts', 'test("x", () => {});\n');
  write('node_modules/dep/index.ts', 'const big = "' + 'x'.repeat(120) + '";\n');
  write('.maestro/flows/home.yaml', 'flow: home\n');
  return root;
}

test('countLines counts newline-separated lines including a final partial line', () => {
  assert.equal(countLines('a\nb\nc\n'), 3);
  assert.equal(countLines('a\nb\nc'), 3);
  assert.equal(countLines(''), 0);
});

test('buildProfile inventories a fixture repo', () => {
  const root = makeFixture();
  const profile = buildProfile(root);

  assert.equal(profile.target, path.basename(root));
  assert.equal(profile.schemaVersion, 1);

  // node_modules/ is skipped: util.ts (3) + two .astro pages (3+3) + x.test.ts (1) count
  assert.equal(profile.loc.total, 10);

  assert.equal(profile.routes.count, 2);
  assert.equal(profile.routes.framework, 'Astro (src/pages)');

  assert.equal(profile.tests.unitFiles, 1);
  assert.equal(profile.workflow.agentsMd, true);
  assert.deepEqual(profile.workflow.ciWorkflows, ['ci.yml']);
  assert.ok(profile.workflow.gateScripts.includes('test'));
  assert.ok(profile.workflow.gateScripts.includes('build'));
  assert.ok(profile.stack.frameworks.includes('Astro'));
  assert.ok(profile.stack.frameworks.includes('Vitest'));
  assert.ok(profile.stack.frameworks.includes('Playwright'));
  assert.ok(profile.stack.packageManagers.includes('npm'));
  assert.ok(profile.workflow.toolingPresent.includes('Maestro'));
});

test('buildProfile throws on a non-directory path', () => {
  assert.throws(() => buildProfile('/definitely/not/a/dir/xyz'));
});

test('detectRoutes falls back to Next.js app router when no src/pages exists', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ri-routes-'));
  fs.mkdirSync(path.join(root, 'app', 'about'), { recursive: true });
  fs.writeFileSync(path.join(root, 'app', 'page.tsx'), 'export default () => null;\n');
  fs.writeFileSync(path.join(root, 'app', 'about', 'page.tsx'), 'export default () => null;\n');
  const routes = detectRoutes(root);
  assert.equal(routes.count, 2);
  assert.equal(routes.framework, 'Next.js app router');
});

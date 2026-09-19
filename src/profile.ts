/**
 * Layer 1 — UNDERSTAND. Scans any repo and produces a RepoProfile artifact.
 * Generic by design: nothing here is specific to one target repo.
 *
 * Usage: npm run profile -- <repo-path> [--json] [--out <file>]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fail, parseArgs } from './lib/cli';
import { RepoProfile, SCHEMA_VERSION } from './lib/types';

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '.next', '.astro', '.output',
  '.wrangler', '.cache', 'coverage', '.venv', 'venv', '__pycache__', 'vendor',
  'target', '.pnpm-store', '.turbo', '.terraform', '.idea', '.vscode',
]);

const EXT_LANG: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript', '.mts': 'TypeScript', '.cts': 'TypeScript',
  '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript', '.jsx': 'JavaScript',
  '.py': 'Python', '.go': 'Go', '.rs': 'Rust', '.rb': 'Ruby', '.php': 'PHP',
  '.java': 'Java', '.kt': 'Kotlin', '.swift': 'Swift', '.c': 'C', '.h': 'C',
  '.cpp': 'C++', '.hpp': 'C++', '.cs': 'C#', '.sh': 'Shell', '.bash': 'Shell',
  '.astro': 'Astro', '.vue': 'Vue', '.svelte': 'Svelte', '.prisma': 'Prisma',
  '.css': 'CSS', '.scss': 'CSS', '.less': 'CSS', '.html': 'HTML', '.sql': 'SQL', '.sol': 'Solidity',
};

const FRAMEWORK_DEPS: Record<string, string> = {
  astro: 'Astro', next: 'Next.js', nuxt: 'Nuxt', '@remix-run/node': 'Remix',
  react: 'React', vue: 'Vue', svelte: 'Svelte', '@angular/core': 'Angular',
  express: 'Express', hono: 'Hono', fastify: 'Fastify', '@nestjs/core': 'NestJS',
  wrangler: 'Cloudflare Workers', '@cloudflare/workers-types': 'Cloudflare Workers',
  '@playwright/test': 'Playwright', playwright: 'Playwright', 'playwright-core': 'Playwright',
  vitest: 'Vitest', jest: 'Jest', mocha: 'Mocha', 'ts-node': 'ts-node',
  'axe-core': 'axe-core', '@axe-core/playwright': 'axe-core', '@axe-core/react': 'axe-core',
  lighthouse: 'Lighthouse', 'web-vitals': 'web-vitals',
  vite: 'Vite', webpack: 'Webpack', esbuild: 'esbuild', turbo: 'Turborepo', nx: 'Nx',
  prisma: 'Prisma', '@prisma/client': 'Prisma', 'drizzle-orm': 'Drizzle',
  typescript: 'TypeScript',
};

const PACKAGE_MANAGERS: Record<string, string> = {
  'package-lock.json': 'npm', 'bun.lock': 'bun', 'bun.lockb': 'bun',
  'yarn.lock': 'yarn', 'pnpm-lock.yaml': 'pnpm', 'go.mod': 'go modules',
  'Cargo.toml': 'cargo', 'pyproject.toml': 'pip/poetry', 'requirements.txt': 'pip',
  'Gemfile': 'bundler', 'composer.json': 'composer', 'deno.json': 'deno',
};

const MAX_FILE_BYTES = 1_000_000;

interface WalkAcc {
  locByExt: Record<string, number>;
  unitFiles: number;
  e2eFiles: number;
  yamlFlows: string[];
}

function countLines(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  if (text.length > 0 && text.charCodeAt(text.length - 1) !== 10) n++;
  return n;
}

function walk(dir: string, acc: WalkAcc): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, acc);
      continue;
    }
    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (EXT_LANG[ext] !== undefined) {
      try {
        const stat = fs.statSync(full);
        if (stat.size <= MAX_FILE_BYTES) {
          const lines = countLines(fs.readFileSync(full, 'utf8'));
          acc.locByExt[ext] = (acc.locByExt[ext] ?? 0) + lines;
        }
      } catch {
        // unreadable file — skip silently, inventory must not crash on odd files
      }
    }
    if (/(\.test\.|\.spec\.)[cm]?[jt]sx?$/.test(entry.name) || /__tests__/.test(full)) {
      acc.unitFiles++;
    }
    if (/\.e2e\.[cm]?[jt]sx?$/.test(entry.name) || /(^|[\\/])e2e[\\/]/.test(full)) {
      acc.e2eFiles++;
    }
    if (/(^|[\\/])\.maestro[\\/]flows[\\/]/.test(full) && /\.ya?ml$/.test(entry.name)) {
      acc.yamlFlows.push(full);
    }
  }
}

function collectFiles(root: string, predicate: (name: string) => boolean): string[] {
  const found: string[] = [];
  const visit = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        visit(full);
      } else if (entry.isFile() && predicate(entry.name)) {
        found.push(full);
      }
    }
  };
  visit(root);
  return found;
}

function detectRoutes(root: string): { count: number; framework: string | null; samples: string[] } {
  const summarize = (files: string[], framework: string, rootDir: string) => ({
    count: files.length,
    framework,
    samples: files.slice(0, 8).map((f) => path.relative(rootDir, f)),
  });

  const astroPages = path.join(root, 'src', 'pages');
  if (fs.existsSync(astroPages)) {
    const files = collectFiles(astroPages, (n) => n.endsWith('.astro'));
    if (files.length > 0) return summarize(files, 'Astro (src/pages)', root);
  }
  for (const appDir of [path.join(root, 'app'), path.join(root, 'src', 'app')]) {
    if (fs.existsSync(appDir)) {
      const files = collectFiles(appDir, (n) => n === 'page.tsx' || n === 'page.ts' || n === 'page.jsx' || n === 'page.js');
      if (files.length > 0) return summarize(files, 'Next.js app router', root);
    }
  }
  for (const pagesDir of [path.join(root, 'pages'), path.join(root, 'src', 'pages')]) {
    if (fs.existsSync(pagesDir)) {
      const files = collectFiles(pagesDir, (n) => /\.(tsx|ts|jsx|js)$/.test(n) && !/^_/.test(n));
      if (files.length > 0) return summarize(files, 'Next.js pages router', root);
    }
  }
  return { count: 0, framework: null, samples: [] };
}

function readPackageJson(root: string): { deps: string[]; dev: string[]; scripts: string[] } | null {
  const file = path.join(root, 'package.json');
  if (!fs.existsSync(file)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    return {
      deps: Object.keys(pkg.dependencies ?? {}),
      dev: Object.keys(pkg.devDependencies ?? {}),
      scripts: Object.keys(pkg.scripts ?? {}),
    };
  } catch {
    return null;
  }
}

function main(): void {
  const { flags, positionals } = parseArgs(process.argv.slice(2));
  const targetPath = positionals[0] ?? '.';
  const root = path.resolve(targetPath);

  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    fail(`not a directory: ${root}`, 'usage: npm run profile -- <repo-path> [--json] [--out <file>]');
  }

  const acc: WalkAcc = { locByExt: {}, unitFiles: 0, e2eFiles: 0, yamlFlows: [] };
  walk(root, acc);

  const pkg = readPackageJson(root);
  const allDeps = [...(pkg?.deps ?? []), ...(pkg?.dev ?? [])];
  const frameworks = [...new Set(allDeps.map((d) => FRAMEWORK_DEPS[d]).filter((f): f is string => f !== undefined))];

  const packageManagers = Object.entries(PACKAGE_MANAGERS)
    .filter(([marker]) => fs.existsSync(path.join(root, marker)))
    .map(([, name]) => name);

  const workflowsDir = path.join(root, '.github', 'workflows');
  const ciWorkflows = fs.existsSync(workflowsDir)
    ? fs.readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f))
    : [];

  const gateScripts = (pkg?.scripts ?? []).filter((s) =>
    /(test|check|build|lint|audit|e2e|bench|verify)/.test(s)
  );

  const toolingPresent: string[] = [...frameworks];
  if (acc.yamlFlows.length > 0 && !toolingPresent.includes('Maestro')) {
    toolingPresent.push('Maestro');
  }

  const routes = detectRoutes(root);
  const languages: Record<string, number> = {};
  for (const [ext, loc] of Object.entries(acc.locByExt)) {
    const lang = EXT_LANG[ext] ?? ext;
    languages[lang] = (languages[lang] ?? 0) + loc;
  }

  const notes: string[] = [];
  if (acc.yamlFlows.length > 0) notes.push(`${acc.yamlFlows.length} Maestro flow(s) detected`);

  const profile: RepoProfile = {
    schemaVersion: SCHEMA_VERSION,
    target: path.basename(root),
    path: root,
    profiledAt: new Date().toISOString(),
    stack: { languages, packageManagers, frameworks },
    loc: {
      total: Object.values(acc.locByExt).reduce((a, b) => a + b, 0),
      byExtension: acc.locByExt,
    },
    routes,
    tests: { unitFiles: acc.unitFiles, e2eFiles: acc.e2eFiles },
    deps: { prod: pkg?.deps ?? [], dev: pkg?.dev ?? [] },
    workflow: {
      agentsMd: fs.existsSync(path.join(root, 'AGENTS.md')),
      claudeMd: fs.existsSync(path.join(root, 'CLAUDE.md')),
      ciWorkflows,
      gateScripts,
      toolingPresent,
    },
    notes,
  };

  const json = JSON.stringify(profile, null, 2);
  const outFile = typeof flags['out'] === 'string' ? flags['out'] : undefined;
  if (outFile !== undefined) {
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(outFile, json + '\n', 'utf8');
  }

  if (flags['json'] === true) {
    console.log(json);
  } else {
    console.log(`RepoProfile — ${profile.target} (${profile.path})`);
    console.log(`  LOC:            ${profile.loc.total} across ${Object.keys(languages).length} languages`);
    const topLangs = Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log(`  Top languages:  ${topLangs.map(([l, n]) => `${l} ${n}`).join(', ') || '—'}`);
    console.log(`  Package mgrs:   ${packageManagers.join(', ') || '—'}`);
    console.log(`  Frameworks:     ${frameworks.join(', ') || '—'}`);
    console.log(`  Routes:         ${routes.count}${routes.framework ? ` (${routes.framework})` : ''}`);
    console.log(`  Tests:          ${acc.unitFiles} unit file(s), ${acc.e2eFiles} e2e file(s)`);
    console.log(`  Workflow docs:  AGENTS.md=${profile.workflow.agentsMd} CLAUDE.md=${profile.workflow.claudeMd}`);
    console.log(`  CI workflows:   ${ciWorkflows.join(', ') || '—'}`);
    console.log(`  Gate scripts:   ${gateScripts.join(', ') || '—'}`);
    console.log(`  Tooling:        ${toolingPresent.join(', ') || '—'}`);
    if (outFile !== undefined) console.log(`\nJSON written → ${outFile}`);
  }
}

main();

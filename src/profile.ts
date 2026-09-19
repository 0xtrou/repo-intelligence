/**
 * Layer 1 — UNDERSTAND. Scans any repo and produces a RepoProfile artifact.
 * Generic by design: nothing here is specific to one target repo.
 *
 * Usage: npm run profile -- <repo-path> [--json] [--out <file>]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fail, parseArgs } from './lib/cli';
import { buildProfile } from './lib/profileLib';

function main(): void {
  const { flags, positionals } = parseArgs(process.argv.slice(2));
  const targetPath = positionals[0] ?? '.';
  const root = path.resolve(targetPath);

  let profile;
  try {
    profile = buildProfile(root);
  } catch (e) {
    fail((e as Error).message, 'usage: npm run profile -- <repo-path> [--json] [--out <file>]');
  }

  const json = JSON.stringify(profile, null, 2);
  const outFile = typeof flags['out'] === 'string' ? flags['out'] : undefined;
  if (outFile !== undefined) {
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(outFile, json + '\n', 'utf8');
  }

  if (flags['json'] === true) {
    console.log(json);
  } else {
    const { routes, workflow, stack, tests } = profile;
    console.log(`RepoProfile — ${profile.target} (${profile.path})`);
    console.log(`  LOC:            ${profile.loc.total} across ${Object.keys(stack.languages).length} languages`);
    const topLangs = Object.entries(stack.languages).sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log(`  Top languages:  ${topLangs.map(([l, n]) => `${l} ${n}`).join(', ') || '—'}`);
    console.log(`  Package mgrs:   ${stack.packageManagers.join(', ') || '—'}`);
    console.log(`  Frameworks:     ${stack.frameworks.join(', ') || '—'}`);
    console.log(`  Routes:         ${routes.count}${routes.framework ? ` (${routes.framework})` : ''}`);
    console.log(`  Tests:          ${tests.unitFiles} unit file(s), ${tests.e2eFiles} e2e file(s)`);
    console.log(`  Workflow docs:  AGENTS.md=${workflow.agentsMd} CLAUDE.md=${workflow.claudeMd}`);
    console.log(`  CI workflows:   ${workflow.ciWorkflows.join(', ') || '—'}`);
    console.log(`  Gate scripts:   ${workflow.gateScripts.join(', ') || '—'}`);
    console.log(`  Tooling:        ${workflow.toolingPresent.join(', ') || '—'}`);
    const outward = profile.outward;
    if (outward !== undefined) {
      const d = outward.declares;
      console.log(`  Outward:        bin=[${d.bin.join(', ')}] private=${d.private ?? '—'} workspaces=[${d.workspaces.join(', ')}] contracts=[${outward.contractFiles.join(', ')}]`);
      console.log(`  Git remote:     ${outward.gitRemote ?? '—'}`);
    }
    if (outFile !== undefined) console.log(`\nJSON written → ${outFile}`);
  }
}

main();

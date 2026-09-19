/** Minimal argv parser — flags (--key value | --key=value | --key) + positionals. No deps by design. */

export interface ParsedArgs {
  flags: Record<string, string | boolean>;
  positionals: string[];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) break;
    if (arg === '--') {
      for (const rest of argv.slice(i + 1)) if (rest !== undefined) positionals.push(rest);
      break;
    }
    if (arg.startsWith('--') && arg.length > 2) {
      const key = arg.slice(2);
      const eq = key.indexOf('=');
      if (eq >= 0) {
        flags[key.slice(0, eq)] = key.slice(eq + 1);
        continue;
      }
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(arg);
    }
  }
  return { flags, positionals };
}

export function fail(message: string, usage?: string): never {
  console.error(`error: ${message}`);
  if (usage) console.error(`\n${usage}`);
  process.exit(1);
}

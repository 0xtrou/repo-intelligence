import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from './cli';

test('parseArgs collects plain positionals', () => {
  const { positionals, flags } = parseArgs(['a', 'b']);
  assert.deepEqual(positionals, ['a', 'b']);
  assert.deepEqual(flags, {});
});

test('parseArgs: --key value consumes the next token', () => {
  const { flags } = parseArgs(['--out', '/tmp/x.json']);
  assert.equal(flags['out'], '/tmp/x.json');
});

test('parseArgs: --key=value form', () => {
  const { flags } = parseArgs(['--tool=lighthouse']);
  assert.equal(flags['tool'], 'lighthouse');
});

test('parseArgs: valueless flag followed by another flag is boolean', () => {
  const { flags } = parseArgs(['--json', '--confirm']);
  assert.equal(flags['json'], true);
  assert.equal(flags['confirm'], true);
});

test('parseArgs: valueless flag at end of argv is boolean, not consuming nothing', () => {
  const { flags } = parseArgs(['--json']);
  assert.equal(flags['json'], true);
});

test('parseArgs: everything after -- is positional (even flag-shaped)', () => {
  const { positionals, flags } = parseArgs(['target', 'file.json', '--', '--not-a-flag']);
  assert.deepEqual(positionals, ['target', 'file.json', '--not-a-flag']);
  assert.deepEqual(flags, {});
});

test('parseArgs: mixed flags and positionals keep both in order-independent maps', () => {
  const { positionals, flags } = parseArgs(['t1', '--tool', 'x', 't2', '--json']);
  assert.deepEqual(positionals, ['t1', 't2']);
  assert.equal(flags['tool'], 'x');
  assert.equal(flags['json'], true);
});

#!/usr/bin/env node
/**
 * TypeScript error-baseline gate.
 *
 * `tsc --noEmit` currently reports a known backlog of errors (legacy
 * strictness debt). This gate fails CI only when the error count EXCEEDS the
 * recorded baseline, so the backlog can only shrink, never grow.
 *
 * When you fix errors, lower the number in scripts/typecheck-baseline.txt
 * in the same commit.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const baseline = Number(
    readFileSync(new URL('./typecheck-baseline.txt', import.meta.url), 'utf8').trim(),
);

let output = '';
try {
    output = execFileSync('npx', ['tsc', '--noEmit'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (err) {
    output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
}

const errors = output.split('\n').filter((line) => /error TS\d+/.test(line));
const count = errors.length;

if (count > baseline) {
    console.error(`\nTypeScript gate FAILED: ${count} errors (baseline allows ${baseline}).`);
    console.error('New errors were introduced. Full tsc output:\n');
    console.error(output);
    process.exit(1);
}

if (count < baseline) {
    console.log(`TypeScript errors dropped to ${count} (baseline ${baseline}).`);
    console.log('Please lower scripts/typecheck-baseline.txt to ' + count + ' in your commit.');
}

console.log(`TypeScript gate passed: ${count} error(s), baseline ${baseline}.`);

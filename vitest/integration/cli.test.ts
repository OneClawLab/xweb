import { describe, it, expect } from 'vitest';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
const CLI = 'npx tsx src/index.ts';

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCli(args: string = ''): Promise<CliResult> {
  const cmd = args ? `${CLI} ${args}` : CLI;
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: projectRoot,
      timeout: 15000,
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: e.code ?? 1,
    };
  }
}

describe('xweb CLI integration', () => {
  // Req 4.1: xweb --help exits 0 and stdout contains command description
  it('--help exits 0 and stdout contains command description', async () => {
    const result = await runCli('--help');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('xweb');
  });

  // Req 4.2: xweb --version exits 0 and output contains version number
  it('--version exits 0 and output contains version number', async () => {
    const result = await runCli('--version');
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/\d+\.\d+\.\d+/);
  });

  // Req 4.3: xweb fetch with missing required args exits 2
  it('fetch with missing required args exits 2', async () => {
    const result = await runCli('fetch');
    expect(result.exitCode).toBe(2);
  });

  // Req 4.4: xweb search with missing required args exits 2
  it('search with missing required args exits 2', async () => {
    const result = await runCli('search');
    expect(result.exitCode).toBe(2);
  });

  // Req 4.5: xweb config --show exits 0
  it('config --show exits 0', async () => {
    const result = await runCli('config --show');
    expect(result.exitCode).toBe(0);
  });

  // Req 4.6: xweb unknown-command exits non-0
  it('unknown command exits non-0', async () => {
    const result = await runCli('unknown-command-xyz');
    expect(result.exitCode).not.toBe(0);
  });
});

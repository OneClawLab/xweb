import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_PATH = join(__dirname, '..', '..', 'dist', 'index.js');

function runCli(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node "${CLI_PATH}" ${args}`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      exitCode: error.status ?? 1,
    };
  }
}

describe('CLI 单元测试', () => {
  it('--version 应输出版本号 1.0.0', () => {
    const { stdout, exitCode } = runCli('--version');
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toContain('1.0.0');
  });

  it('--help 应输出帮助信息，包含程序名和所有子命令', () => {
    const { stdout, exitCode } = runCli('--help');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('xweb');
    expect(stdout).toContain('search');
    expect(stdout).toContain('fetch');
    expect(stdout).toContain('explore');
  });

  it('未知命令应输出错误提示', () => {
    const { stdout, stderr, exitCode } = runCli('unknowncmd');
    expect(exitCode).not.toBe(0);
    const output = stdout + stderr;
    expect(output).toMatch(/error|unknown|unknowncmd/i);
  });
});

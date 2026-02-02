import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

describe('event loop scripts (smoke)', () => {
  it('01-order-basic prints expected markers', async () => {
    const script = path.resolve(
      __dirname,
      '../scripts/event-loop/01-order-basic.mjs',
    );
    const { stdout } = await execFileAsync('node', [script], { timeout: 5000 });

    // 不去断言绝对顺序（因为不同环境可能略有差异）
    // 只断言关键标记存在，确保脚本可运行、输出完整
    expect(stdout).toContain('A: sync start');
    expect(stdout).toContain('F: sync end');
    expect(stdout).toContain('process.nextTick');
  });
});

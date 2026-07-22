import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

function typescriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return typescriptFiles(path);
    return extname(entry.name) === '.ts' ? [path] : [];
  });
}

describe('Mongoose update options', () => {
  it('uses returnDocument after instead of the deprecated new option', () => {
    const sourceRoot = join(process.cwd(), 'src');
    const violations = typescriptFiles(sourceRoot)
      .filter((path) => !path.endsWith('mongoose-update-options.spec.ts'))
      .filter((path) => /\bnew\s*:\s*true\b/.test(readFileSync(path, 'utf8')));

    expect(violations).toEqual([]);
  });
});

import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const src = join(root, 'src', 'templates');
const dest = join(root, 'dist', 'templates');

if (!existsSync(src)) {
  console.warn('Warning: src/templates does not exist, skipping copy.');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('Copied src/templates -> dist/templates');

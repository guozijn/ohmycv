import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync
} from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targetConfigDir = resolve(root, 'config');
const sourceArg = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!sourceArg) {
  console.error('Usage: node scripts/copy-config.mjs <source-dir-or-config-dir> [--dry-run]');
  console.error('Example: node scripts/copy-config.mjs ../my-private-cv');
  console.error('Example: node scripts/copy-config.mjs ../my-private-cv/config --dry-run');
  process.exit(1);
}

const sourcePath = resolve(process.cwd(), sourceArg);
const sourceConfigDir = resolveSourceConfigDir(sourcePath);

if (!sourceConfigDir) {
  console.error(`Config directory not found for: ${sourceArg}`);
  console.error('Pass either a directory containing config/ or a config directory directly.');
  process.exit(1);
}

if (sourceConfigDir === targetConfigDir) {
  console.error('Source config directory is already the target config directory.');
  process.exit(1);
}

const copiedFiles = copyConfigDirectory(sourceConfigDir, targetConfigDir);
const action = dryRun ? 'Would copy' : 'Copied';

if (copiedFiles.length === 0) {
  console.log(`No files found in ${sourceConfigDir}`);
} else {
  copiedFiles.forEach(file => console.log(`${action}: ${file}`));
  console.log(`${action} ${copiedFiles.length} file(s) from ${sourceConfigDir} to config/`);
}

function resolveSourceConfigDir(sourcePath) {
  if (!existsSync(sourcePath) || !statSync(sourcePath).isDirectory()) return null;

  if (basename(sourcePath) === 'config') return sourcePath;

  const nestedConfig = resolve(sourcePath, 'config');
  if (existsSync(nestedConfig) && statSync(nestedConfig).isDirectory()) {
    return nestedConfig;
  }

  return null;
}

function copyConfigDirectory(sourceDir, targetDir, currentDir = sourceDir) {
  const copiedFiles = [];

  readdirSync(currentDir, { withFileTypes: true }).forEach(entry => {
    const sourceEntry = resolve(currentDir, entry.name);
    const relativePath = relative(sourceDir, sourceEntry);
    const targetEntry = resolve(targetDir, relativePath);

    if (entry.isDirectory()) {
      copiedFiles.push(...copyConfigDirectory(sourceDir, targetDir, sourceEntry));
      return;
    }

    if (!entry.isFile()) return;

    if (!dryRun) {
      mkdirSync(dirname(targetEntry), { recursive: true });
      copyFileSync(sourceEntry, targetEntry);
    }

    copiedFiles.push(relativePath);
  });

  return copiedFiles;
}

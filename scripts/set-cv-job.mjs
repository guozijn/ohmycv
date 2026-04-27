import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cvPath = resolve(root, 'config/cv.json');
const jobName = (process.argv[2] || process.env.CV_JOB || '').trim();

if (!jobName) {
  console.error('Usage: node scripts/set-cv-job.mjs <job-name>');
  console.error('   or: CV_JOB=<job-name> node scripts/set-cv-job.mjs');
  process.exit(1);
}

if (!/^[a-z0-9_-]+$/i.test(jobName)) {
  console.error(`Invalid job name: ${jobName}`);
  console.error('Use only letters, numbers, underscores, and hyphens.');
  process.exit(1);
}

let config = {};
if (existsSync(cvPath)) {
  config = JSON.parse(readFileSync(cvPath, 'utf8'));
}

config.active_job = jobName;
mkdirSync(dirname(cvPath), { recursive: true });
writeFileSync(cvPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Set active CV job to "${jobName}" in config/cv.json`);

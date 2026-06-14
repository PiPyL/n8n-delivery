#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'workflows');
const outputDir = path.join(root, '.n8n', 'import-ready');

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

function workflowIdFromFile(fileName) {
  return `wf${fileName
    .replace(/\.json$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')}`;
}

for (const fileName of fs.readdirSync(sourceDir).filter((file) => file.endsWith('.json')).sort()) {
  const sourcePath = path.join(sourceDir, fileName);
  const workflow = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  workflow.id = workflow.id || workflowIdFromFile(fileName);

  const outputPath = path.join(outputDir, fileName);
  fs.writeFileSync(outputPath, `${JSON.stringify(workflow, null, 2)}\n`);
  console.log(`${fileName} -> ${workflow.id}`);
}

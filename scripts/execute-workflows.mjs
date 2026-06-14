#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const n8nBin = path.join(root, 'node_modules', '.bin', 'n8n');
const userFolder = path.join(root, '.n8n');
const logDir = path.join(userFolder, 'test-runs');
const timeoutMs = Number(process.env.N8N_EXECUTE_TIMEOUT_MS ?? 30000);

const workflows = [
  ['wf01telegramgateway', '01_Telegram_Gateway'],
  ['wf02facebookgateway', '02_Facebook_Gateway'],
  ['wf03taskscheduler', '03_Task_Scheduler'],
  ['wf04mediagenerator', '04_Media_Generator'],
  ['wf05tiktoktokenrefresher', '05_TikTok_Token_Refresher'],
  ['wf06socialpublisher', '06_Social_Publisher'],
];

fs.mkdirSync(logDir, { recursive: true });

function executeWorkflow(id, name) {
  return new Promise((resolve) => {
    const logPath = path.join(logDir, `${id}.log`);
    const output = [];
    const child = spawn(n8nBin, ['execute', `--id=${id}`], {
      cwd: root,
      env: {
        ...process.env,
        N8N_USER_FOLDER: userFolder,
        N8N_HOST: process.env.N8N_HOST ?? '127.0.0.1',
        N8N_PORT: process.env.N8N_PORT ?? '5678',
        N8N_PROTOCOL: process.env.N8N_PROTOCOL ?? 'http',
        N8N_DIAGNOSTICS_ENABLED: process.env.N8N_DIAGNOSTICS_ENABLED ?? 'false',
        N8N_VERSION_NOTIFICATIONS_ENABLED: process.env.N8N_VERSION_NOTIFICATIONS_ENABLED ?? 'false',
        N8N_TEMPLATES_ENABLED: process.env.N8N_TEMPLATES_ENABLED ?? 'false',
        N8N_RUNNERS_BROKER_PORT: process.env.N8N_RUNNERS_BROKER_PORT ?? '5689',
      },
    });

    const timer = setTimeout(() => {
      output.push(`\nTIMEOUT after ${timeoutMs}ms\n`);
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk) => output.push(chunk.toString()));

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      fs.writeFileSync(logPath, output.join(''));
      resolve({ id, name, code, signal, logPath });
    });
  });
}

const results = [];
for (const [id, name] of workflows) {
  console.log(`Executing ${name} (${id})`);
  results.push(await executeWorkflow(id, name));
}

console.log('\nExecution summary');
for (const result of results) {
  const status = result.code === 0 ? 'ok' : 'failed';
  console.log(`${status} ${result.name} (${result.id}) -> ${path.relative(root, result.logPath)}`);
}

process.exit(results.some((result) => result.code !== 0) ? 1 : 0);

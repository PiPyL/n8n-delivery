#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowsDir = path.join(root, 'workflows');
const workflowFiles = fs.readdirSync(workflowsDir)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => path.join(workflowsDir, file));

const results = [];
const workflowByName = new Map();

function add(level, file, message, detail = '') {
  results.push({ level, file: path.relative(root, file), message, detail });
}

function walk(value, visitor, keyPath = []) {
  visitor(value, keyPath);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, keyPath.concat(index)));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      walk(child, visitor, keyPath.concat(key));
    }
  }
}

function hasText(value, pattern) {
  let matched = false;
  walk(value, (child) => {
    if (typeof child === 'string' && pattern.test(child)) matched = true;
  });
  return matched;
}

const workflows = workflowFiles.map((file) => {
  let workflow;
  try {
    workflow = JSON.parse(fs.readFileSync(file, 'utf8'));
    add('pass', file, 'JSON parses');
  } catch (error) {
    add('fail', file, 'Invalid JSON', error.message);
    return { file, workflow: null };
  }

  if (!workflow.name) add('fail', file, 'Workflow is missing name');
  if (!Array.isArray(workflow.nodes)) add('fail', file, 'Workflow nodes must be an array');
  if (!workflow.connections || typeof workflow.connections !== 'object') {
    add('fail', file, 'Workflow connections must be an object');
  }

  workflowByName.set(workflow.name, { file, workflow });
  return { file, workflow };
});

for (const { file, workflow } of workflows) {
  if (!workflow) continue;
  const nodes = workflow.nodes ?? [];
  const nodeNames = new Set();

  for (const node of nodes) {
    if (!node.name) add('fail', file, 'Node is missing name', JSON.stringify(node.id ?? node));
    if (!node.type) add('fail', file, `Node "${node.name}" is missing type`);
    if (nodeNames.has(node.name)) add('fail', file, `Duplicate node name "${node.name}"`);
    nodeNames.add(node.name);
  }

  for (const [source, outputs] of Object.entries(workflow.connections ?? {})) {
    if (!nodeNames.has(source)) add('fail', file, `Connection source node does not exist: ${source}`);
    for (const branchType of Object.values(outputs ?? {})) {
      for (const output of branchType ?? []) {
        for (const connection of output ?? []) {
          if (!nodeNames.has(connection.node)) {
            add('fail', file, `Connection target node does not exist: ${connection.node}`);
          }
        }
      }
    }
  }

  if (workflow.active !== true) {
    add('warn', file, 'Workflow is not active after import', 'Expected for exported templates, but not enough for 24/7 operation.');
  }

  walk(workflow, (value, keyPath) => {
    if (typeof value !== 'string') return;
    if (/^YOUR_|_KEY$|_TOKEN$/.test(value) || value.includes('YOUR_')) {
      add('warn', file, 'Placeholder value still present', `${keyPath.join('.')}: ${value}`);
    }
    if (keyPath.at(-1) === 'value' && value === '') {
      add('warn', file, 'Empty value field', keyPath.join('.'));
    }
    if (/temp-creds-/.test(value)) {
      add('warn', file, 'Temporary credential id still present', `${keyPath.join('.')}: ${value}`);
    }
  });
}

const knownSubWorkflows = [
  '01_Save_Order',
  '04_Media_Generator',
  '06_Social_Publisher',
  '06_Social_Publisher_Worker',
  '07_Fashion_Image_Generator',
  '08_Gmail_Email_Sender',
  '09_Video_Generator',
  '10_Telegram_GDrive_Reader',
  '11_Workspace_Assistant'
];
for (const name of knownSubWorkflows) {
  const entry = workflowByName.get(name);
  if (entry) {
    const hasExecuteTrigger = entry.workflow.nodes.some((n) => n.type === 'n8n-nodes-base.executeWorkflowTrigger');
    if (!hasExecuteTrigger) {
      add('fail', entry.file, `Sub-workflow "${name}" is called by Execute Workflow but has no Execute Sub-workflow Trigger`);
    }
  }
}


const facebook = workflowByName.get('02_Facebook_Gateway');
if (facebook) {
  const webhookMethods = facebook.workflow.nodes
    .filter((node) => node.type === 'n8n-nodes-base.webhook')
    .map((node) => node.parameters?.httpMethod ?? 'GET');
  if (!webhookMethods.includes('GET')) {
    add('fail', facebook.file, 'Facebook webhook has no GET verification workflow for hub.challenge');
  }
  if (hasText(facebook.workflow, /YOUR_PAGE_ACCESS_TOKEN/)) {
    add('fail', facebook.file, 'Facebook send/reply nodes cannot run with placeholder page access token');
  }
}

const scheduler = workflowByName.get('03_Task_Scheduler');
if (scheduler && hasText(scheduler.workflow, /YOUR_ADMIN_TELEGRAM_CHAT_ID/)) {
  add('fail', scheduler.file, 'Daily reminder cannot run with placeholder Telegram chat id');
}

const mediaEntry = workflowByName.get('04_Media_Generator');
if (mediaEntry) {
  if (hasText(mediaEntry.workflow, /gemini-3\.1-flash-image:predict/)) {
    add('fail', mediaEntry.file, 'Image generation endpoint uses legacy/non-current predict shape; verify against Gemini image generation API');
  }
  if (hasText(mediaEntry.workflow, /YOUR_GEMINI_API_KEY/)) {
    add('fail', mediaEntry.file, 'Media workflow cannot run with placeholder Gemini API key');
  }
  add('pass', mediaEntry.file, 'WF04 Media Generator structure OK');
}

const videoGenerator = workflowByName.get('09_Video_Generator');
if (videoGenerator) {
  const veoNode = videoGenerator.workflow.nodes.find((node) => node.name === 'Call Veo API');
  const url = veoNode?.parameters?.url ?? '';
  if (!/veo-3\.1-generate-preview/i.test(url)) {
    add('fail', videoGenerator.file, 'Veo request does not use the required veo-3.1-generate-preview model');
  }
  const promptNode = videoGenerator.workflow.nodes.find((node) => node.name === 'Build Prompt and Base64');
  const code = promptNode?.parameters?.jsCode ?? '';
  if (!/image|bytesBase64Encoded|base64|binary/i.test(code)) {
    add('fail', videoGenerator.file, 'Veo request building does not include image base64 data for image-to-video input');
  }
  if (!/catwalk|orbit|windy|lifestyle/i.test(code)) {
    add('fail', videoGenerator.file, 'Veo request building is missing the fashion movement presets (catwalk, orbit, windy, lifestyle)');
  }
  if (hasText(videoGenerator.workflow, /YOUR_GEMINI_API_KEY/)) {
    add('fail', videoGenerator.file, 'Video Generator workflow cannot run with placeholder Gemini API key');
  }
  add('pass', videoGenerator.file, 'WF09 Video Generator structure OK');
}

const tiktok = workflowByName.get('05_TikTok_Token_Refresher');
if (tiktok) {
  if (hasText(tiktok.workflow, /YOUR_TIKTOK_/)) {
    add('fail', tiktok.file, 'TikTok token refresh cannot run with placeholder OAuth values');
  }
  // WF05: Must have interval trigger (12h)
  const hasTrigger = tiktok.workflow.nodes.some((n) => n.type === 'n8n-nodes-base.intervalTrigger' || n.type === 'n8n-nodes-base.scheduleTrigger');
  if (!hasTrigger) {
    add('fail', tiktok.file, 'TikTok Token Refresher must have a time-based trigger (interval or schedule)');
  }
  // WF05: Must save token to Google Sheets
  const hasSheetsUpdate = tiktok.workflow.nodes.some((n) => n.type === 'n8n-nodes-base.googleSheets' && n.parameters?.operation === 'update');
  if (!hasSheetsUpdate) {
    add('fail', tiktok.file, 'TikTok Token Refresher must save refreshed tokens to Google Sheets (update operation)');
  }
}

// ─── WF06: Social Publisher ────────────────────────────────────────────────
const social = workflowByName.get('06_Social_Publisher');
const socialWorker = workflowByName.get('06_Social_Publisher_Worker');
if (social) {
  // Must have executeWorkflowTrigger as entry point
  const hasExecTrigger = social.workflow.nodes.some((n) => n.type === 'n8n-nodes-base.executeWorkflowTrigger');
  if (!hasExecTrigger) {
    add('fail', social.file, 'Social Publisher must have Execute Workflow Trigger (called by Telegram Gateway)');
  }
  // Must contain approval mechanism
  if (!hasText(social.workflow, /approval_id|DUYỆT_BÀI|pendingPosts/)) {
    add('fail', social.file, 'Social Publisher missing approval/pending post mechanism');
  }
  
  // Check publishing nodes on either social or socialWorker
  const targetWf = socialWorker ? socialWorker.workflow : social.workflow;
  const targetFile = socialWorker ? socialWorker.file : social.file;
  
  if (!hasText(targetWf, /graph\.facebook\.com/)) {
    add('fail', targetFile, 'Social Publisher missing Facebook Graph API call');
  }
  if (!hasText(targetWf, /open\.tiktokapis\.com/)) {
    add('fail', targetFile, 'Social Publisher missing TikTok API call');
  }
  // Must use Wait node for scheduled publishing
  const hasWaitNode = targetWf.nodes.some((n) => n.type === 'n8n-nodes-base.wait');
  if (!hasWaitNode) {
    add('fail', targetFile, 'Social Publisher must use Wait node for scheduled publishing time');
  }
  // Must have Telegram notification after publishing
  const telegramNodes = targetWf.nodes.filter((n) => n.type === 'n8n-nodes-base.telegram');
  if (telegramNodes.length < 1) {
    add('warn', targetFile, 'Social Publisher should have Telegram notification node (publish confirm)');
  }
  add('pass', social.file, 'WF06 Social Publisher structure OK');
  if (socialWorker) {
    add('pass', socialWorker.file, 'WF06 Social Publisher Worker structure OK');
  }
}

// ─── WF07: Fashion Image Generator ────────────────────────────────────────
const fashion = workflowByName.get('07_Fashion_Image_Generator');
if (fashion) {
  // Must have executeWorkflowTrigger AND webhook trigger (dual entry)
  const hasExecTrigger = fashion.workflow.nodes.some((n) => n.type === 'n8n-nodes-base.executeWorkflowTrigger');
  const hasWebhook = fashion.workflow.nodes.some((n) => n.type === 'n8n-nodes-base.webhook');
  if (!hasExecTrigger) add('fail', fashion.file, 'Fashion Image Generator must have Execute Workflow Trigger');
  if (!hasWebhook) add('warn', fashion.file, 'Fashion Image Generator should have Webhook Trigger for direct HTTP testing');

  // Must have Telegram file download flow
  if (!hasText(fashion.workflow, /api\.telegram\.org.*getFile/)) {
    add('fail', fashion.file, 'Fashion Image Generator must call Telegram getFile API to retrieve uploaded photo');
  }
  if (!hasText(fashion.workflow, /api\.telegram\.org\/file\//)) {
    add('fail', fashion.file, 'Fashion Image Generator must download photo binary from Telegram servers');
  }

  // Must call Gemini image generation API
  if (!hasText(fashion.workflow, /generativelanguage\.googleapis\.com/)) {
    add('fail', fashion.file, 'Fashion Image Generator must call Gemini API for image generation');
  }
  if (!hasText(fashion.workflow, /gemini.*image|image.*gemini/i)) {
    add('warn', fashion.file, 'Fashion Image Generator should use Gemini image generation model');
  }

  // Must have error handling branch
  const hasIfNode = fashion.workflow.nodes.some((n) => n.type === 'n8n-nodes-base.if');
  if (!hasIfNode) {
    add('fail', fashion.file, 'Fashion Image Generator must have IF node for error handling (success vs failure branch)');
  }

  // Must send result photo via Telegram
  const telegramSendPhoto = fashion.workflow.nodes.some((n) =>
    n.type === 'n8n-nodes-base.telegram' && n.parameters?.operation === 'sendPhoto',
  );
  if (!telegramSendPhoto) {
    add('fail', fashion.file, 'Fashion Image Generator must send generated photo via Telegram (sendPhoto operation)');
  }

  // Check workflow ID matches what Telegram Gateway expects
  const expectedId = 'wf07fashionimagegenerator';
  if (fashion.workflow.id && fashion.workflow.id !== expectedId) {
    add('warn', fashion.file, `Fashion Image Generator ID "${fashion.workflow.id}" does not match expected "${expectedId}" — Telegram Gateway call may fail`);
  }

  add('pass', fashion.file, 'WF07 Fashion Image Generator structure OK');
}

// ─── WF08: Gmail Email Sender ──────────────────────────────────────────────
const gmail = workflowByName.get('08_Gmail_Email_Sender');
if (gmail) {
  // Must have executeWorkflowTrigger
  const hasExecTrigger = gmail.workflow.nodes.some((n) => n.type === 'n8n-nodes-base.executeWorkflowTrigger');
  if (!hasExecTrigger) {
    add('fail', gmail.file, 'Gmail Email Sender must have Execute Workflow Trigger (called by Telegram Gateway)');
  }

  // Must have Gmail send node
  const hasGmailNode = gmail.workflow.nodes.some((n) => n.type === 'n8n-nodes-base.gmail');
  if (!hasGmailNode) {
    add('fail', gmail.file, 'Gmail Email Sender must have Gmail node to actually send emails');
  }

  // Must have contact lookup from Google Sheets
  const hasSheetsRead = gmail.workflow.nodes.some((n) =>
    n.type === 'n8n-nodes-base.googleSheets' &&
    (n.parameters?.operation === 'getAll' || n.parameters?.operation === 'read'),
  );
  if (!hasSheetsRead) {
    add('fail', gmail.file, 'Gmail Email Sender must read contacts from Google Sheets');
  }

  // Must call Gemini to compose email
  if (!hasText(gmail.workflow, /generativelanguage\.googleapis\.com/)) {
    add('fail', gmail.file, 'Gmail Email Sender must use Gemini API to compose email content');
  }

  // Must have IF node to check if email was found
  const ifNodes = gmail.workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.if');
  if (ifNodes.length < 2) {
    add('warn', gmail.file, 'Gmail Email Sender should have at least 2 IF nodes: direct email check + contact found check');
  }

  // Must send Telegram notification after email sent
  const hasTelegramConfirm = gmail.workflow.nodes.some((n) =>
    n.type === 'n8n-nodes-base.telegram' && hasText({ nodes: [n] }, /thành công|sent|Confirm|✅/i),
  );
  if (!hasTelegramConfirm) {
    add('warn', gmail.file, 'Gmail Email Sender should notify user via Telegram after email is sent');
  }

  // Note: workflow may be inactive for template export
  if (gmail.workflow.active !== true) {
    add('warn', gmail.file, 'Gmail Email Sender is not active — requires Gmail OAuth2 credential to be configured before activation');
  }

  add('pass', gmail.file, 'WF08 Gmail Email Sender structure OK');
}

// ─── Cross-workflow: executeWorkflow ID resolution ─────────────────────────
const workflowById = new Map();
for (const { file, workflow } of workflows) {
  if (workflow?.id) workflowById.set(workflow.id, { file, workflow });
}

// Check all executeWorkflow nodes use IDs that exist
for (const { file, workflow } of workflows) {
  if (!workflow) continue;
  const execNodes = workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.executeWorkflow');
  for (const node of execNodes) {
    const targetId = node.parameters?.workflowId;
    if (!targetId) {
      add('fail', file, `Execute Workflow node "${node.name}" is missing workflowId parameter`);
      continue;
    }
    // Check by workflow ID
    if (workflowById.has(targetId)) {
      add('pass', file, `Execute Workflow "${node.name}" → target ID "${targetId}" found`);
    } else if (workflowByName.has(targetId)) {
      add('pass', file, `Execute Workflow "${node.name}" → target name "${targetId}" found`);
    } else {
      add('fail', file, `Execute Workflow "${node.name}" references "${targetId}" — not found by ID or name in any workflow file`);
    }
  }
}

// ─── Cross-workflow: required workflow count ───────────────────────────────
const expectedWorkflows = [
  '01_Telegram_AI_Agent',
  '02_Facebook_Gateway',
  '03_Task_Scheduler',
  '04_Media_Generator',
  '05_TikTok_Token_Refresher',
  '06_Social_Publisher',
  '06_Social_Publisher_Worker',
  '07_Fashion_Image_Generator',
  '08_Gmail_Email_Sender',
  '09_Video_Generator',
  '10_Telegram_GDrive_Reader',
];

for (const name of expectedWorkflows) {
  if (workflowByName.has(name)) {
    add('pass', path.join(root, 'workflows'), `Required workflow "${name}" present`);
  } else {
    add('fail', path.join(root, 'workflows'), `Required workflow "${name}" is MISSING from workflows/ directory`);
  }
}

// ─── Cross-workflow: Telegram Gateway routing completeness ─────────────────
const telegramGateway = workflowByName.get('01_Telegram_Gateway');
if (telegramGateway) {
  const switchNode = telegramGateway.workflow.nodes.find((n) => n.name === 'Switch Routing');
  if (switchNode) {
    const rules = switchNode.parameters?.rules?.rules || [];
    const requiredIntents = ['LƯU_ĐƠN', 'TẠO_MEDIA', 'TẠO_VIDEO', 'TẠO_SHEET', 'LÊN_LỊCH_BÀI', 'DUYỆT_BÀI', 'CHAT', 'GỬI_EMAIL', 'ĐỌC_FILE'];
    const configuredIntents = rules.map((r) => r.value2);
    for (const intent of requiredIntents) {
      if (configuredIntents.includes(intent)) {
        add('pass', telegramGateway.file, `Switch Routing: intent "${intent}" is routed`);
      } else {
        add('fail', telegramGateway.file, `Switch Routing: intent "${intent}" is NOT configured — bot will not handle this intent`);
      }
    }
  } else {
    add('warn', telegramGateway.file, 'Could not find Switch Routing node in Telegram Gateway to verify intent routing');
  }

  const loadStateNode = telegramGateway.workflow.nodes.find((n) => n.name === 'Load Conversation State');
  if (!loadStateNode) {
    add('fail', telegramGateway.file, 'Telegram Gateway must load conversation state before Gemini routing');
  } else if (!/telegramSessions|workflow_catalog|routing_rules/.test(loadStateNode.parameters?.jsCode || '')) {
    add('fail', telegramGateway.file, 'Load Conversation State must provide telegramSessions, workflow catalog, and routing rules');
  } else {
    add('pass', telegramGateway.file, 'Telegram Gateway conversation state + workflow catalog present');
  }

  const parseIntentNode = telegramGateway.workflow.nodes.find((n) => n.name === 'Parse Intent');
  if (parseIntentNode && !/Không bao giờ|activeIntent === 'LÊN_LỊCH_BÀI'|persistSession/.test(parseIntentNode.parameters?.jsCode || '')) {
    add('fail', telegramGateway.file, 'Parse Intent must preserve pending social-post context before photo media routing');
  }
}

if (!workflows.some(({ workflow }) => hasText(workflow, /post\/publish\/video\/init|post\/publish\/status\/fetch|creator_info|video\/init/i))) {
  add('fail', path.join(root, 'workflows'), 'TikTok posting workflow is missing');
}

if (!workflows.some(({ workflow }) => hasText(workflow, /\/feed|\/photos|\/videos|scheduled_publish_time|published=false/i))) {
  add('fail', path.join(root, 'workflows'), 'Facebook scheduled posting workflow is missing');
}

if (!workflows.some(({ workflow }) => hasText(workflow, /approval|phê duyệt|duyet|duyệt|approve/i))) {
  add('warn', path.join(root, 'workflows'), 'No Telegram approval step found for scheduled social posting');
}

// ─── WF01: Telegram AI Agent ───────────────────────────────────────────────
const aiAgentWf = workflowByName.get('01_Telegram_AI_Agent');
if (aiAgentWf) {
  const nodes = aiAgentWf.workflow.nodes || [];
  
  // Kiểm tra sự tồn tại của AI Agent node
  const hasAgentNode = nodes.some((n) => n.type === '@n8n/n8n-nodes-langchain.agent');
  if (!hasAgentNode) {
    add('fail', aiAgentWf.file, 'Telegram AI Agent workflow must contain an AI Agent node');
  }

  // Kiểm tra model Gemini 3.1 Flash Lite
  const geminiNode = nodes.find((n) => n.type === '@n8n/n8n-nodes-langchain.lmChatGoogleGemini');
  if (!geminiNode) {
    add('fail', aiAgentWf.file, 'Telegram AI Agent workflow must contain a Google Gemini Chat Model node');
  } else {
    const modelName = geminiNode.parameters?.modelName || '';
    if (modelName !== 'gemini-3.1-flash-lite' && modelName !== 'models/gemini-3.1-flash-lite') {
      add('fail', aiAgentWf.file, `Telegram AI Agent must use gemini-3.1-flash-lite or models/gemini-3.1-flash-lite, found: ${modelName}`);
    }
  }

  // Kiểm tra Window Buffer Memory
  const hasMemory = nodes.some((n) => n.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow');
  if (!hasMemory) {
    add('fail', aiAgentWf.file, 'Telegram AI Agent workflow must contain a Window Buffer Memory node');
  }

  // Kiểm tra các tools
  const tools = nodes.filter((n) => n.type === '@n8n/n8n-nodes-langchain.toolWorkflow');
  const toolNames = tools.map((t) => t.parameters?.name);
  const expectedTools = [
    'media_generator',
    'fashion_image_generator',
    'video_generator',
    'facebook_smart_publisher',
    'gmail_sender',
    'gdrive_reader',
    'workspace_assistant',
    'save_order',
    'nhatky_hoadon_assistant',
    'calendar_assistant'
  ];

  for (const tool of expectedTools) {
    if (toolNames.includes(tool)) {
      add('pass', aiAgentWf.file, `Telegram AI Agent: tool "${tool}" is configured`);
    } else {
      add('fail', aiAgentWf.file, `Telegram AI Agent: tool "${tool}" is MISSING`);
    }
  }
  
  add('pass', aiAgentWf.file, '01_Telegram_AI_Agent structure checked');
}

// ─── WF01: Save Order ───────────────────────────────────────────────────────
const saveOrderWf = workflowByName.get('01_Save_Order');
if (saveOrderWf) {
  const nodes = saveOrderWf.workflow.nodes || [];
  const hasExecTrigger = nodes.some((n) => n.type === 'n8n-nodes-base.executeWorkflowTrigger');
  if (!hasExecTrigger) {
    add('fail', saveOrderWf.file, 'Save Order workflow must contain an Execute Workflow Trigger');
  }

  const hasSheets = nodes.some((n) => n.type === 'n8n-nodes-base.googleSheets');
  if (!hasSheets) {
    add('fail', saveOrderWf.file, 'Save Order workflow must contain a Google Sheets node');
  }

  add('pass', saveOrderWf.file, '01_Save_Order structure checked');
}

// ─── Output ────────────────────────────────────────────────────────────────
const levels = ['fail', 'warn', 'pass'];
for (const level of levels) {
  const group = results.filter((result) => result.level === level);
  if (group.length === 0) continue;
  console.log(`\n${level.toUpperCase()} (${group.length})`);
  for (const result of group) {
    const suffix = result.detail ? ` - ${result.detail}` : '';
    console.log(`[${result.file}] ${result.message}${suffix}`);
  }
}

const failCount = results.filter((result) => result.level === 'fail').length;
const warnCount = results.filter((result) => result.level === 'warn').length;
console.log(`\nSummary: ${failCount} fail, ${warnCount} warn, ${results.filter((r) => r.level === 'pass').length} pass`);

process.exit(failCount > 0 ? 1 : 0);

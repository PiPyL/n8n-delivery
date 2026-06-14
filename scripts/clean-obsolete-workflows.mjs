#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'workflows');

// Xác định N8N_USER_FOLDER giống như trong n8n-env.sh
let n8nUserFolder = process.env.N8N_USER_FOLDER || path.join(root, '.n8n');
if (!path.isAbsolute(n8nUserFolder)) {
  n8nUserFolder = path.resolve(root, n8nUserFolder);
}

// Tìm đường dẫn thực tế của tệp database.sqlite
// Thường n8n sẽ tạo thư mục con `.n8n` bên trong user folder để chứa db
const dbPaths = [
  path.join(n8nUserFolder, '.n8n', 'database.sqlite'),
  path.join(n8nUserFolder, 'database.sqlite')
];

let dbPath = '';
for (const p of dbPaths) {
  if (fs.existsSync(p)) {
    dbPath = p;
    break;
  }
}

if (!dbPath) {
  console.log('Database file not found yet. Skipping cleanup (will be created on n8n start).');
  // Vẫn tạo file active_ids.txt để script import hoạt động
  writeActiveIds([]);
  process.exit(0);
}

console.log(`Using database: ${dbPath}`);

function workflowIdFromFile(fileName) {
  return `wf${fileName
    .replace(/\.json$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')}`;
}

// Thu thập danh sách ID của các workflow hợp lệ trong folder workflows/
const validIds = [];
try {
  const files = fs.readdirSync(sourceDir).filter((file) => file.endsWith('.json'));
  for (const fileName of files) {
    const sourcePath = path.join(sourceDir, fileName);
    const workflow = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const id = workflow.id || workflowIdFromFile(fileName);
    validIds.push(id);
  }
} catch (e) {
  console.error('Error reading workflows directory:', e.message);
  process.exit(1);
}

if (validIds.length === 0) {
  console.log('No workflows found in workflows/ folder. Skipping cleanup to protect database.');
  writeActiveIds([]);
  process.exit(0);
}

console.log(`Found ${validIds.length} valid workflow(s) in workflows/ folder:`, validIds);

// Xây dựng câu lệnh SQL xóa các workflow không hợp lệ và reset trạng thái archive của các workflow hợp lệ
const idsPlaceholder = validIds.map(id => `'${id}'`).join(',');
const sqlQueries = [
  `DELETE FROM shared_workflow WHERE workflowId NOT IN (${idsPlaceholder});`,
  `DELETE FROM workflows_tags WHERE workflowId NOT IN (${idsPlaceholder});`,
  `DELETE FROM workflow_entity WHERE id NOT IN (${idsPlaceholder});`,
  `UPDATE workflow_entity SET isArchived = 0;`
];

// Thực thi lệnh xóa qua sqlite3 CLI
try {
  for (const query of sqlQueries) {
    console.log(`Executing SQL: ${query}`);
    // Sử dụng sqlite3 CLI có sẵn trên macOS
    execSync(`sqlite3 "${dbPath}" "${query}"`, { stdio: 'inherit' });
  }
  console.log('Successfully cleaned up obsolete workflows from database.');
} catch (e) {
  console.error('Failed to clean database via sqlite3 CLI:', e.message);
  // Không exit với lỗi để tránh làm gián đoạn toàn bộ quá trình build nếu sqlite3 gặp trục trặc tạm thời
}

// Ghi danh sách các active ID ra file tạm thời để shell script đọc
writeActiveIds(validIds);

function writeActiveIds(ids) {
  try {
    fs.mkdirSync(n8nUserFolder, { recursive: true });
    const activeIdsFile = path.join(n8nUserFolder, 'active_ids.txt');
    fs.writeFileSync(activeIdsFile, ids.join('\n') + '\n', 'utf8');
    console.log(`Written active IDs to ${activeIdsFile}`);
  } catch (e) {
    console.error('Failed to write active_ids.txt:', e.message);
  }
}

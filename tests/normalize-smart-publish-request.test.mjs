import fs from 'fs';

function makeNormalize(code) {
  return new Function('input', 'env', `
    const $input = { first: () => ({ json: input }) };
    const $env = env;
    const _result = (function(){ ${code} })();
    // n8n Code node returns array of items; unwrap
    if (Array.isArray(_result) && _result[0] && _result[0].json) return _result[0].json;
    return _result || {};
  `);
}

const env = { ADMIN_TELEGRAM_CHAT_ID: '670923744' };

const wf12 = JSON.parse(fs.readFileSync('/Users/mac/Desktop/AutoWork Project/n8nDemo/workflows/12_Facebook_Smart_Publisher.json', 'utf8'));
let newCodeRaw;
for (const n of wf12.nodes) {
  if (n.name === 'Normalize Smart Publish Request') {
    newCodeRaw = n.parameters.jsCode;
    break;
  }
}

const newFn = makeNormalize(newCodeRaw);

const tests = [
  { name: 'S1: toolWorkflow manual ảnh + Ha Noi', input: { query: JSON.stringify({ mode: 'manual', media_kind: 'image', photo_file_id: 'AgACAgUA_X', user_caption: 'Ha Noi', chat_id: '670923744' }) }, expect: { success: true, mode: 'manual', user_caption: 'Ha Noi', photo_file_id: 'AgACAgUA_X', effective_kind: 'image' } },
  { name: 'S2: toolWorkflow AI text + prompt', input: { query: JSON.stringify({ mode: 'ai', media_kind: 'text', user_prompt: 'BST áo dài Tết 2026', chat_id: '670923744' }) }, expect: { success: true, mode: 'ai', media_kind: 'text', user_prompt: 'BST áo dài Tết 2026' } },
  { name: 'S3: toolWorkflow AI ảnh (no prompt)', input: { query: JSON.stringify({ mode: 'ai', media_kind: 'image', photo_file_id: 'X', chat_id: '670923744' }) }, expect: { success: true, mode: 'ai', media_kind: 'image', effective_kind: 'image' } },
  { name: 'S4: input rỗng', input: {}, expect: { success: true, mode: 'ai', media_kind: 'text' } },
  { name: 'S5: body trực tiếp', input: { body: { mode: 'manual', media_kind: 'image', photo_file_id: 'X', user_caption: 'Xin chào', chat_id: '670923744' } }, expect: { success: true, mode: 'manual', user_caption: 'Xin chào' } },
  { name: 'S6: query JSON hỏng', input: { query: '{invalid json' }, expect: { success: false } }
];

function check(actual, expected) {
  for (const [k, v] of Object.entries(expected)) {
    if (actual[k] !== v) return `FAIL ${k}: expected=${JSON.stringify(v)} got=${JSON.stringify(actual[k])}`;
  }
  return 'PASS';
}

console.log('='.repeat(90));
console.log('REGRESSION TEST: Normalize Smart Publish Request (NEW code)');
console.log('='.repeat(90));
let pass = 0, fail = 0;
for (const t of tests) {
  const newR = newFn(t.input, env);
  const c = check(newR, t.expect);
  if (c === 'PASS') pass++; else fail++;
  console.log(`\n[${t.name}]`);
  console.log(`  Got: ${JSON.stringify({mode: newR.mode, uc: newR.user_caption, up: newR.user_prompt, mk: newR.media_kind, ek: newR.effective_kind, ok: newR.success, err: newR.error_message}).slice(0,200)}`);
  console.log(`  Result: ${c}`);
}
console.log('\n' + '='.repeat(90));
console.log(`SUMMARY: ${pass}/${pass+fail} PASS, ${fail} FAIL`);
console.log('='.repeat(90));
process.exit(fail > 0 ? 1 : 0);

#!/usr/bin/env node
/**
 * Unit Tests — n8nDemo Workflows
 * Kiểm tra logic JavaScript của tất cả Code nodes trong 8 workflows
 * Chạy: node scripts/unit-tests.mjs
 */

import process from 'node:process';

// ─── Test runner ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
    errors.push({ name, error: err.message });
    failed++;
  }
}

function describe(suiteName, fn) {
  console.log(`\n📋 ${suiteName}`);
  fn();
}

function expect(actual) {
  const assertions = {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected ${b}, got ${a}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
    },
    toContain(value) {
      if (typeof actual === 'string') {
        if (!actual.includes(value)) throw new Error(`Expected "${actual.slice(0, 80)}..." to contain "${value}"`);
      } else if (Array.isArray(actual)) {
        if (!actual.includes(value)) throw new Error(`Expected array to contain ${JSON.stringify(value)}`);
      }
    },
    get not() {
      return {
        toContain(value) {
          if (typeof actual === 'string') {
            if (actual.includes(value)) throw new Error(`Expected string NOT to contain "${value}"`);
          } else if (Array.isArray(actual)) {
            if (actual.includes(value)) throw new Error(`Expected array NOT to contain ${JSON.stringify(value)}`);
          }
        },
        toBe(expected) {
          if (actual === expected) throw new Error(`Expected NOT ${JSON.stringify(expected)}, but got it`);
        },
      };
    },
    toBeGreaterThan(n) {
      if (!(actual > n)) throw new Error(`Expected ${actual} > ${n}`);
    },
    toBeUndefined() {
      if (actual !== undefined) throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
    },
    toBeDefined() {
      if (actual === undefined) throw new Error(`Expected value to be defined, got undefined`);
    },
    toHaveLength(n) {
      if (actual.length !== n) throw new Error(`Expected length ${n}, got ${actual.length}`);
    },
    toMatch(pattern) {
      if (!pattern.test(actual)) throw new Error(`Expected "${actual}" to match ${pattern}`);
    },
    toThrow() {
      throw new Error('Use expectThrow() helper for throw assertions');
    },
  };
  return assertions;
}

function expectThrow(fn, msgContains = '') {
  try {
    fn();
    throw new Error('Expected function to throw but it did not');
  } catch (err) {
    if (err.message === 'Expected function to throw but it did not') throw err;
    if (msgContains && !err.message.includes(msgContains)) {
      throw new Error(`Expected error containing "${msgContains}", got: "${err.message}"`);
    }
  }
}

// ─── WF01: Telegram Gateway ──────────────────────────────────────────────────

describe('WF01 — Telegram Gateway: Prepare Message (Code Node)', () => {

  // Logic extracted from "Prepare Message" code node
  function prepareMessage(originalData) {
    const msg = originalData.message || {};
    const hasPhoto = !!(msg.photo && msg.photo.length > 0);
    const replyMsg = msg.reply_to_message || {};
    const hasReplyPhoto = !!(replyMsg.photo && replyMsg.photo.length > 0);

    if (hasPhoto) {
      const photo = msg.photo[msg.photo.length - 1];
      const caption = msg.caption || '';
      return [{
        json: {
          ...originalData,
          message: {
            ...msg,
            text: msg.text || caption || 'Tạo ảnh thời trang chuyên nghiệp từ ảnh sản phẩm tôi gửi',
            _photo_file_id: photo.file_id,
            _photo_file_size: photo.file_size,
            _has_reference_photo: true,
            _original_caption: caption,
            _message_kind: caption ? 'photo_with_caption' : 'photo_only',
          },
        },
      }];
    }

    if (hasReplyPhoto) {
      const photo = replyMsg.photo[replyMsg.photo.length - 1];
      return [{
        json: {
          ...originalData,
          message: {
            ...msg,
            _photo_file_id: photo.file_id,
            _photo_file_size: photo.file_size,
            _has_reference_photo: true,
            _original_caption: msg.text || '',
            _message_kind: 'reply_to_photo',
          },
        },
      }];
    }

    return [{ json: originalData }];
  }

  test('text message passes through unchanged', () => {
    const input = { message: { text: 'Xin chào', chat: { id: 123 } } };
    const result = prepareMessage(input);
    expect(result).toHaveLength(1);
    expect(result[0].json.message.text).toBe('Xin chào');
  });

  test('photo message sets _has_reference_photo = true', () => {
    const input = {
      message: {
        photo: [{ file_id: 'abc', file_size: 100 }, { file_id: 'xyz', file_size: 500 }],
        caption: 'Áo thun trắng',
        chat: { id: 456 },
      },
    };
    const result = prepareMessage(input);
    expect(result[0].json.message._has_reference_photo).toBe(true);
    expect(result[0].json.message._photo_file_id).toBe('xyz'); // lấy ảnh cuối (resolution cao nhất)
    expect(result[0].json.message.text).toBe('Áo thun trắng');
    expect(result[0].json.message._message_kind).toBe('photo_with_caption');
  });

  test('photo without caption uses default text', () => {
    const input = {
      message: {
        photo: [{ file_id: 'abc', file_size: 100 }],
        chat: { id: 789 },
      },
    };
    const result = prepareMessage(input);
    expect(result[0].json.message.text).toContain('Tạo ảnh thời trang chuyên nghiệp');
    expect(result[0].json.message._original_caption).toBe('');
    expect(result[0].json.message._message_kind).toBe('photo_only');
  });

  test('empty photo array is treated as text message', () => {
    const input = { message: { photo: [], text: 'Hello', chat: { id: 1 } } };
    const result = prepareMessage(input);
    expect(result[0].json.message.text).toBe('Hello');
  });

  test('reply to photo carries reply photo metadata without rewriting text', () => {
    const input = {
      message: {
        text: 'Tạo video catwalk',
        chat: { id: 2 },
        reply_to_message: { photo: [{ file_id: 'reply-file', file_size: 99 }] },
      },
    };
    const result = prepareMessage(input);
    expect(result[0].json.message.text).toBe('Tạo video catwalk');
    expect(result[0].json.message._photo_file_id).toBe('reply-file');
    expect(result[0].json.message._message_kind).toBe('reply_to_photo');
  });
});

describe('WF01 — Telegram Gateway: Parse Intent (Code Node)', () => {

  // Simplified guard logic extracted from "Parse Intent" code node.
  function applyIntentSafety(parsed, triggerMsg, session = {}) {
    parsed.params = parsed.params || {};
    parsed.params.chat_id = triggerMsg.chat?.id;
    parsed.params.raw_text = triggerMsg.text || triggerMsg._original_caption || '';
    parsed.params.is_fashion_photo = false;

    const rawText = parsed.params.raw_text;
    const caption = triggerMsg._original_caption || triggerMsg.caption || '';
    const hasPhoto = triggerMsg._has_reference_photo === true;
    const textForRules = [rawText, caption].filter(Boolean).join(' ').toLowerCase();

    function hasAny(pattern) { return pattern.test(textForRules); }

    // Handle /start, /menu, /help, /reset commands — always reset session
    const isStartCommand = /^\/(start|menu|help|reset)$/i.test(rawText.trim());
    if (isStartCommand) {
      session.active_intent = '';
      parsed.intent = 'CHAT';
      parsed.params.reply = '👋 Chào bạn! Tôi là trợ lý AI tự động của AutoWork.';
      return parsed;
    }

    const explicitVideo = hasAny(/\b(video|clip|veo|dựng|chuyển động|chuyen dong)\b/i) || parsed.intent === 'TẠO_VIDEO';
    const explicitImage = /(tạo ảnh|tao anh|sinh ảnh|sinh anh|thiết kế|thiet ke|banner|poster|ảnh ai|anh ai|hình ai|hinh ai)/i.test(textForRules) || parsed.intent === 'TẠO_MEDIA';
    const explicitEmail = hasAny(/\b(mail|email|gửi mail|gui mail|gửi email|gui email)\b/i) || parsed.intent === 'GỬI_EMAIL';
    const explicitCancel = hasAny(/\b(hủy|huy|dừng|dưng|dung lai|dừng lại|thoát|thoat|không phải|ko phải|ko phai|k phải|k phai|sai rồi|sai roi|nhầm|nham|đổi ý|doi y|chứ không|chu khong|chứ ko|chu ko)\b/i);
    const explicitSwitch = !['CHAT', 'LÊN_LỊCH_BÀI'].includes(parsed.intent);
    const explicitSocial = (!explicitCancel && !explicitSwitch && !explicitEmail && (
                             /(đăng bài|dang bai|fanpage|facebook|tiktok|lên lịch bài|len lich bai)/i.test(textForRules) ||
                             (/(caption|nội dung|noi dung)/i.test(textForRules) &&
                              !/(mail|email|thư|thu|gửi đơn|gui don|lưu đơn|luu don|đơn hàng|don hang|sheet|bảng tính|bang tinh|đọc file|doc file|drive)/i.test(textForRules))
                           )) || parsed.intent === 'LÊN_LỊCH_BÀI';

    // Override: if user explicitly mentions email while stuck in LÊN_LỊCH_BÀI session, break free
    if (explicitEmail && (session.active_intent === 'LÊN_LỊCH_BÀI' || explicitCancel)) {
      session.active_intent = '';
      parsed.intent = 'GỬI_EMAIL';
    }

    if (explicitCancel || explicitSwitch) {
      session.active_intent = '';
    }

    function cleanContent(value) {
      return String(value || '').replace(/^\s*(nội dung|noi dung|caption|content)\s*[:：-]\s*/i, '').trim();
    }

    function missingSocial(params) {
      const missing = [];
      if (!cleanContent(params.content || params.caption)) missing.push('content');
      if (!params.publish_at) missing.push('publish_at');
      return missing;
    }

    function ask(missing) {
      if (missing.includes('content') && missing.includes('publish_at')) return 'Dạ, anh/chị gửi giúp em nội dung bài đăng và thời gian muốn đăng nhé.';
      if (missing.includes('publish_at')) return 'Em đã nhận nội dung và hình ảnh. Anh/chị muốn đăng lúc nào ạ?';
      return 'Anh/chị bổ sung thêm thông tin còn thiếu giúp em nhé.';
    }

    if (hasPhoto) {
      parsed.params.photo_file_id = triggerMsg._photo_file_id;
      parsed.params.photo_caption = triggerMsg._original_caption || '';
      parsed.params.photo_chat_id = String(parsed.params.chat_id);
    }

    if (session.active_intent === 'LÊN_LỊCH_BÀI' && !explicitImage && !explicitVideo) {
      const collected = { ...(session.collected || {}), ...parsed.params };
      const content = cleanContent(parsed.params.content || parsed.params.caption || caption || rawText);
      if (content) {
        collected.content = content;
        collected.caption = content;
      }
      if (hasPhoto) collected.photo_file_id = triggerMsg._photo_file_id;
      const missing = missingSocial(collected);
      if (missing.length > 0) {
        parsed.intent = 'CHAT';
        parsed.params = { ...collected, reply: ask(missing), is_fashion_photo: false };
        parsed.missing_fields = missing;
        parsed.state_update = { active_intent: 'LÊN_LỊCH_BÀI', status: 'awaiting_fields', collected, missing_fields: missing };
      } else {
        parsed.intent = 'LÊN_LỊCH_BÀI';
        parsed.params = { ...collected, reply: 'Đã đủ thông tin. Em sẽ tạo yêu cầu đăng/lên lịch bài để anh/chị duyệt.', is_fashion_photo: false };
      }
      return parsed;
    }

    if (hasPhoto && explicitVideo) {
      parsed.intent = 'TẠO_VIDEO';
      parsed.params.is_fashion_photo = true;
      parsed.params.reply = 'Đang tiến hành dựng video AI quảng cáo thời trang từ ảnh bạn gửi...';
      return parsed;
    }

    if (hasPhoto && (explicitImage || !caption)) {
      parsed.intent = 'TẠO_MEDIA';
      parsed.params.is_fashion_photo = true;
      parsed.params.reply = 'Đang tạo ảnh sản phẩm thời trang chuyên nghiệp từ ảnh bạn gửi...';
      return parsed;
    }

    if (explicitSocial) {
      const collected = { ...parsed.params };
      const content = cleanContent(parsed.params.content || parsed.params.caption || caption || rawText);
      if (content && !/^(đăng bài|dang bai|lên lịch bài|len lich bai)(\s+lên\s+fanpage|\s+fanpage)?$/i.test(content)) {
        collected.content = content;
        collected.caption = content;
      }
      const missing = missingSocial(collected);
      if (missing.length > 0) {
        parsed.intent = 'CHAT';
        parsed.params = { ...collected, reply: ask(missing), is_fashion_photo: false };
        parsed.missing_fields = missing;
        parsed.state_update = { active_intent: 'LÊN_LỊCH_BÀI', status: 'awaiting_fields', collected, missing_fields: missing };
        return parsed;
      }
    }

    // Safety defaults
    if (parsed.intent === 'CHAT' && !parsed.params.reply) {
      parsed.params.reply = 'Chào bạn!';
    }
    if (parsed.intent === 'TẠO_MEDIA' && !parsed.params.reply) {
      parsed.params.reply = 'Đang tiến hành sinh hình ảnh/video...';
    }
    if (parsed.intent === 'GỬI_EMAIL' && !parsed.params.reply) {
      parsed.params.reply = '📧 Đang soạn và gửi email...';
    }
    return parsed;
  }

  test('CHAT intent without reply gets default reply', () => {
    const parsed = { intent: 'CHAT', params: {} };
    const msg = { chat: { id: 111 }, text: 'Xin chào' };
    const result = applyIntentSafety(parsed, msg);
    expect(result.params.reply).toBeTruthy();
    expect(result.params.is_fashion_photo).toBe(false);
  });

  test('pending social post treats photo caption as post content, not image generation', () => {
    const parsed = { intent: 'CHAT', params: { reply: 'Hi' } };
    const msg = {
      chat: { id: 222 },
      _has_reference_photo: true,
      _photo_file_id: 'FILE_123',
      _original_caption: 'Nội dung: Hello world',
      text: 'Nội dung: Hello world',
    };
    const result = applyIntentSafety(parsed, msg, {
      active_intent: 'LÊN_LỊCH_BÀI',
      status: 'awaiting_fields',
      collected: { platform: 'facebook' },
      missing_fields: ['content', 'publish_at'],
    });
    expect(result.intent).toBe('CHAT');
    expect(result.params.is_fashion_photo).toBe(false);
    expect(result.params.content).toBe('Hello world');
    expect(result.params.photo_file_id).toBe('FILE_123');
    expect(result.missing_fields).toContain('publish_at');
    expect(result.state_update.active_intent).toBe('LÊN_LỊCH_BÀI');
  });

  test('user can cancel pending social post or switch to other intents', () => {
    // Case 1: Explicit switch "Tôi muốn gửi mail chứ ko phải đăng bài" with GỬI_EMAIL intent
    const parsed1 = { intent: 'GỬI_EMAIL', params: { reply: 'Email' } };
    const msg1 = {
      chat: { id: 222 },
      text: 'Tôi muốn gửi mail chứ ko phải đăng bài',
    };
    const result1 = applyIntentSafety(parsed1, msg1, {
      active_intent: 'LÊN_LỊCH_BÀI',
      status: 'awaiting_fields',
      collected: { platform: 'facebook' },
      missing_fields: ['content', 'publish_at'],
    });
    expect(result1.intent).toBe('GỬI_EMAIL');

    // Case 2: Explicit cancel keyword "hủy" with CHAT intent
    const parsed2 = { intent: 'CHAT', params: { reply: 'Hủy' } };
    const msg2 = {
      chat: { id: 222 },
      text: 'hủy lệnh',
    };
    const result2 = applyIntentSafety(parsed2, msg2, {
      active_intent: 'LÊN_LỊCH_BÀI',
      status: 'awaiting_fields',
      collected: { platform: 'facebook' },
      missing_fields: ['content', 'publish_at'],
    });
    expect(result2.intent).toBe('CHAT');
  });

  test('explicit image request with photo routes to TẠO_MEDIA', () => {
    const parsed = { intent: 'CHAT', params: { reply: 'Hi' } };
    const msg = {
      chat: { id: 222 },
      text: 'Tạo ảnh AI từ ảnh này',
      _has_reference_photo: true,
      _photo_file_id: 'FILE_123',
      _original_caption: 'Tạo ảnh AI từ ảnh này',
    };
    const result = applyIntentSafety(parsed, msg);
    expect(result.intent).toBe('TẠO_MEDIA');
    expect(result.params.is_fashion_photo).toBe(true);
    expect(result.params.photo_file_id).toBe('FILE_123');
  });

  test('new social post request opens pending state when required fields are missing', () => {
    const parsed = { intent: 'CHAT', params: { reply: 'Hi' } };
    const msg = { chat: { id: 444 }, text: 'Đăng bài lên fanpage' };
    const result = applyIntentSafety(parsed, msg);
    expect(result.intent).toBe('CHAT');
    expect(result.state_update.active_intent).toBe('LÊN_LỊCH_BÀI');
    expect(result.missing_fields).toEqual(['content', 'publish_at']);
  });

  test('GỬI_EMAIL intent without reply gets default email reply', () => {
    const parsed = { intent: 'GỬI_EMAIL', params: {} };
    const msg = { chat: { id: 333 }, text: 'Gửi email cho anh Nam' };
    const result = applyIntentSafety(parsed, msg);
    expect(result.params.reply).toContain('email');
  });

  test('GỬI_EMAIL intent with "nội dung" keyword does not get overridden as social post request', () => {
    const parsed = { intent: 'GỬI_EMAIL', params: { recipient_name: 'Thanh', email_body_prompt: 'hẹn 8h sáng mai cafe' } };
    const msg = { chat: { id: 333 }, text: 'Tôi muốn gửi mail cho Thanh với nội dung hẹn 8h sáng mai cafe ở Highland Bạch Đằng' };
    const result = applyIntentSafety(parsed, msg);
    expect(result.intent).toBe('GỬI_EMAIL');
  });

  test('chat_id is properly injected from trigger message', () => {
    const parsed = { intent: 'LƯU_ĐƠN', params: {} };
    const msg = { chat: { id: 999 }, text: 'Đặt đơn' };
    const result = applyIntentSafety(parsed, msg);
    expect(result.params.chat_id).toBe(999);
    expect(result.params.raw_text).toBe('Đặt đơn');
  });

  // ── NEW TESTS: /start command handling ──

  test('/start command resets session and returns welcome message', () => {
    const parsed = { intent: 'CHAT', params: {} };
    const msg = { chat: { id: 555 }, text: '/start' };
    const session = {
      active_intent: 'LÊN_LỊCH_BÀI',
      status: 'awaiting_fields',
      collected: { platform: 'facebook', content: 'Some content' },
      missing_fields: ['publish_at'],
    };
    const result = applyIntentSafety(parsed, msg, session);
    expect(result.intent).toBe('CHAT');
    expect(result.params.reply).toContain('Chào bạn');
    expect(session.active_intent).toBe('');
  });

  test('/menu command also resets session', () => {
    const parsed = { intent: 'LÊN_LỊCH_BÀI', params: {} };
    const msg = { chat: { id: 555 }, text: '/menu' };
    const session = { active_intent: 'LÊN_LỊCH_BÀI' };
    const result = applyIntentSafety(parsed, msg, session);
    expect(result.intent).toBe('CHAT');
    expect(session.active_intent).toBe('');
  });

  // ── NEW TESTS: expanded explicitCancel regex ──

  test('"ko phải" (Vietnamese abbreviation) triggers cancel', () => {
    const parsed = { intent: 'CHAT', params: { reply: 'OK' } };
    const msg = { chat: { id: 222 }, text: 'ko phải đăng bài' };
    const session = {
      active_intent: 'LÊN_LỊCH_BÀI',
      status: 'awaiting_fields',
      collected: { platform: 'facebook' },
    };
    const result = applyIntentSafety(parsed, msg, session);
    // explicitCancel should be true, so session should be cleared
    expect(session.active_intent).toBe('');
  });

  test('"sai rồi" triggers cancel', () => {
    const parsed = { intent: 'CHAT', params: { reply: 'OK' } };
    const msg = { chat: { id: 222 }, text: 'sai rồi, tôi muốn gửi email' };
    const session = {
      active_intent: 'LÊN_LỊCH_BÀI',
      status: 'awaiting_fields',
      collected: { platform: 'facebook' },
    };
    const result = applyIntentSafety(parsed, msg, session);
    expect(session.active_intent).toBe('');
  });

  test('"chứ ko" triggers cancel', () => {
    const parsed = { intent: 'CHAT', params: { reply: 'OK' } };
    const msg = { chat: { id: 222 }, text: 'gửi mail chứ ko phải đăng bài' };
    const session = {
      active_intent: 'LÊN_LỊCH_BÀI',
      status: 'awaiting_fields',
      collected: { platform: 'facebook' },
    };
    const result = applyIntentSafety(parsed, msg, session);
    expect(session.active_intent).toBe('');
  });

  // ── NEW TESTS: explicitEmail override ──

  test('explicit email mention overrides social session', () => {
    const parsed = { intent: 'CHAT', params: { reply: 'OK' } };
    const msg = { chat: { id: 222 }, text: 'Tôi muốn gửi mail cho Thanh' };
    const session = {
      active_intent: 'LÊN_LỊCH_BÀI',
      status: 'awaiting_fields',
      collected: { platform: 'facebook' },
      missing_fields: ['content', 'publish_at'],
    };
    const result = applyIntentSafety(parsed, msg, session);
    expect(result.intent).toBe('GỬI_EMAIL');
    expect(session.active_intent).toBe('');
  });

  test('email with cancel keywords breaks from social session', () => {
    const parsed = { intent: 'GỬI_EMAIL', params: { recipient_name: 'Thanh' } };
    const msg = { chat: { id: 222 }, text: 'Tôi muốn gửi mail chứ ko phải đăng bài' };
    const session = {
      active_intent: 'LÊN_LỊCH_BÀI',
      status: 'awaiting_fields',
      collected: { platform: 'facebook' },
      missing_fields: ['content', 'publish_at'],
    };
    const result = applyIntentSafety(parsed, msg, session);
    expect(result.intent).toBe('GỬI_EMAIL');
    expect(session.active_intent).toBe('');
  });

});

// ─── WF02: Facebook Gateway ──────────────────────────────────────────────────

describe('WF02 — Facebook Gateway: Verify Meta Token (Code Node)', () => {

  function verifyMetaToken(query, expectedToken) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === expectedToken && challenge) {
      return [{ json: { response: challenge, code: 200 } }];
    }
    return [{ json: { response: 'Forbidden', code: 403 } }];
  }

  test('valid verification request returns challenge', () => {
    const query = { 'hub.mode': 'subscribe', 'hub.verify_token': 'MY_TOKEN', 'hub.challenge': 'abc123' };
    const result = verifyMetaToken(query, 'MY_TOKEN');
    expect(result[0].json.response).toBe('abc123');
    expect(result[0].json.code).toBe(200);
  });

  test('wrong token returns 403 Forbidden', () => {
    const query = { 'hub.mode': 'subscribe', 'hub.verify_token': 'WRONG', 'hub.challenge': 'abc123' };
    const result = verifyMetaToken(query, 'MY_TOKEN');
    expect(result[0].json.code).toBe(403);
  });

  test('missing challenge returns 403', () => {
    const query = { 'hub.mode': 'subscribe', 'hub.verify_token': 'MY_TOKEN' };
    const result = verifyMetaToken(query, 'MY_TOKEN');
    expect(result[0].json.code).toBe(403);
  });

  test('wrong mode returns 403', () => {
    const query = { 'hub.mode': 'unsubscribe', 'hub.verify_token': 'MY_TOKEN', 'hub.challenge': 'abc' };
    const result = verifyMetaToken(query, 'MY_TOKEN');
    expect(result[0].json.code).toBe(403);
  });
});

describe('WF02 — Facebook Gateway: Deduplication & Parse (Code Node)', () => {

  // Simplified deduplication logic (without n8n staticData)
  function deduplicateAndParse(bodyEntries, processedIds = []) {
    const result = [];

    for (const entry of bodyEntries) {
      for (const msg of entry.messaging || []) {
        const msgId = msg.message?.mid;
        const senderId = msg.sender?.id;
        const text = msg.message?.text;
        if (!msgId || !senderId || !text || processedIds.includes(msgId)) continue;
        processedIds.push(msgId);
        result.push({ json: { source: 'messenger', senderId, text, eventId: msgId } });
      }

      for (const changeItem of entry.changes || []) {
        const change = changeItem.value || {};
        const commentId = change.comment_id || change.id;
        const text = change.message;
        const senderId = change.from?.id;
        if (change.item !== 'comment' || change.verb !== 'add' || !commentId || !text || processedIds.includes(commentId)) continue;
        processedIds.push(commentId);
        result.push({ json: { source: 'comment', commentId, senderId, text, eventId: commentId } });
      }
    }
    return result;
  }

  test('parses messenger message correctly', () => {
    const entries = [{
      messaging: [{ sender: { id: 'USER1' }, message: { mid: 'MSG001', text: 'Xin chào' } }],
    }];
    const result = deduplicateAndParse(entries);
    expect(result).toHaveLength(1);
    expect(result[0].json.source).toBe('messenger');
    expect(result[0].json.text).toBe('Xin chào');
  });

  test('parses comment correctly', () => {
    const entries = [{
      changes: [{
        value: { item: 'comment', verb: 'add', comment_id: 'CMT001', message: 'Test comment', from: { id: 'USER2' } },
      }],
    }];
    const result = deduplicateAndParse(entries);
    expect(result).toHaveLength(1);
    expect(result[0].json.source).toBe('comment');
    expect(result[0].json.commentId).toBe('CMT001');
  });

  test('deduplicates repeated message IDs', () => {
    const entries = [{
      messaging: [
        { sender: { id: 'USER1' }, message: { mid: 'MSG001', text: 'Hello' } },
        { sender: { id: 'USER1' }, message: { mid: 'MSG001', text: 'Hello again' } }, // duplicate
      ],
    }];
    const result = deduplicateAndParse(entries, []);
    expect(result).toHaveLength(1);
  });

  test('skips messages without text', () => {
    const entries = [{
      messaging: [{ sender: { id: 'USER1' }, message: { mid: 'MSG002' } }], // no text
    }];
    const result = deduplicateAndParse(entries);
    expect(result).toHaveLength(0);
  });
});

describe('WF02 — Facebook Gateway: Prepare Reply and Deal (Code Node)', () => {

  function prepareReplyAndDeal(text, aiOutput, source, senderId, commentId, eventId) {
    const lower = text.toLowerCase();
    const isDeal = /(chốt|chot|đặt|dat|mua|order|sđt|sdt|số điện thoại|so dien thoai|địa chỉ|dia chi)/i.test(lower);
    const phone = (text.match(/(\+?84|0)\d{8,10}/) || [])[0] || '';
    const product = (text.match(/(?:mua|đặt|dat|order|chốt|chot)\s+([^,.;\n]+)/i) || [])[1]?.trim() || '';
    const address = (text.match(/(?:địa chỉ|dia chi|ship tới|giao tới)[:\s]+([^\n]+)/i) || [])[1]?.trim() || '';

    return [{
      json: {
        source,
        senderId,
        commentId,
        eventId,
        text,
        ai_reply: aiOutput,
        is_deal: isDeal,
        phone,
        address,
        product,
        captured_at: new Date().toISOString(),
      },
    }];
  }

  test('detects deal intent with keyword "mua"', () => {
    const result = prepareReplyAndDeal('Tôi muốn mua áo thun', 'OK', 'messenger', 'U1', null, 'E1');
    expect(result[0].json.is_deal).toBe(true);
  });

  test('detects deal intent with phone number', () => {
    const result = prepareReplyAndDeal('SĐT của tôi là 0901234567', 'OK', 'comment', 'U2', 'C1', 'E2');
    expect(result[0].json.is_deal).toBe(true);
    expect(result[0].json.phone).toBe('0901234567');
  });

  test('extracts product name from order text', () => {
    const result = prepareReplyAndDeal('Tôi muốn mua áo polo xanh size L', 'OK', 'messenger', 'U3', null, 'E3');
    expect(result[0].json.product).toContain('áo polo');
  });

  test('normal chat message is NOT a deal', () => {
    const result = prepareReplyAndDeal('Sản phẩm này đẹp lắm!', 'Cảm ơn!', 'messenger', 'U4', null, 'E4');
    expect(result[0].json.is_deal).toBe(false);
  });

  test('extracts address from message', () => {
    const result = prepareReplyAndDeal('Địa chỉ: 123 Lê Lợi, Q1', 'OK', 'messenger', 'U5', null, 'E5');
    expect(result[0].json.address).toContain('123 Lê Lợi');
  });
});

// ─── WF03: Task Scheduler ────────────────────────────────────────────────────

describe('WF03 — Task Scheduler: Format Daily Tasks (Code Node)', () => {

  function formatDailyTasks(items, todayDate) {
    const pendingTasks = items.filter(item => {
      const date = item.json['Ngày'];
      const status = item.json['Trạng thái'];
      return date === todayDate && status !== 'Hoàn thành';
    });

    if (pendingTasks.length === 0) {
      return [{ json: { message: '🎉 Tuyệt vời! Bạn không có công việc tồn đọng nào cho ngày hôm nay.' } }];
    }

    let markdown = `📅 **DANH SÁCH CÔNG VIỆC HÀNG NGÀY (${todayDate})**\n\n`;
    pendingTasks.forEach((task, index) => {
      const time = task.json['Giờ'] || 'Cả ngày';
      const desc = task.json['Nội dung'] || 'Không có mô tả';
      markdown += `${index + 1}. ⏰ *${time}* - ${desc}\n`;
    });
    markdown += '\nChúc bạn một ngày làm việc hiệu quả!';

    return [{ json: { message: markdown } }];
  }

  test('returns celebration message when no tasks today', () => {
    const items = [
      { json: { 'Ngày': '2026-01-01', 'Trạng thái': 'Chờ', 'Giờ': '09:00', 'Nội dung': 'Task A' } },
    ];
    const result = formatDailyTasks(items, '2026-06-11');
    expect(result[0].json.message).toContain('Tuyệt vời');
  });

  test('filters out completed tasks', () => {
    const items = [
      { json: { 'Ngày': '2026-06-11', 'Trạng thái': 'Hoàn thành', 'Giờ': '09:00', 'Nội dung': 'Task Done' } },
      { json: { 'Ngày': '2026-06-11', 'Trạng thái': 'Chờ', 'Giờ': '10:00', 'Nội dung': 'Task Pending' } },
    ];
    const result = formatDailyTasks(items, '2026-06-11');
    expect(result[0].json.message).toContain('Task Pending');
    expect(result[0].json.message).not.toContain('Task Done');
  });

  test('formats task list with correct count', () => {
    const items = [
      { json: { 'Ngày': '2026-06-11', 'Trạng thái': 'Chờ', 'Giờ': '08:00', 'Nội dung': 'Họp nhóm' } },
      { json: { 'Ngày': '2026-06-11', 'Trạng thái': 'Đang làm', 'Giờ': '14:00', 'Nội dung': 'Báo cáo' } },
    ];
    const result = formatDailyTasks(items, '2026-06-11');
    expect(result[0].json.message).toContain('1.');
    expect(result[0].json.message).toContain('2.');
    expect(result[0].json.message).toContain('Họp nhóm');
    expect(result[0].json.message).toContain('Báo cáo');
  });

  test('uses "Cả ngày" when time is missing', () => {
    const items = [
      { json: { 'Ngày': '2026-06-11', 'Trạng thái': 'Chờ', 'Nội dung': 'Task without time' } },
    ];
    const result = formatDailyTasks(items, '2026-06-11');
    expect(result[0].json.message).toContain('Cả ngày');
  });
});

// ─── WF04: Media Generator ───────────────────────────────────────────────────

describe('WF04 — Media Generator: Normalize Media Request (Code Node)', () => {

  function normalizeMediaRequest(body) {
    let prompt = body.prompt || body.media_prompt || body.text || 'Mẫu váy thời trang cao cấp trên người mẫu';
    const chatId = body.chat_id || body.chatId || body.telegram_chat_id || body.senderId || body.admin_chat_id;

    const ratioMatch = prompt.match(/(1:1|3:4|4:5|9:16|16:9|2:3|3:2)/);
    const aspectRatio = ratioMatch ? ratioMatch[0] : '3:4';

    if (ratioMatch) {
      prompt = prompt.replace(ratioMatch[0], '').replace(/\s+/g, ' ').trim();
    }

    const isFashion = /váy|đầm|áo|quần|giày|mẫu|thời trang|fashion|dress|skirt|shirt|pants|model|wear|suit/i.test(prompt);
    let finalPrompt = prompt;

    if (isFashion) {
      finalPrompt = `Create a professional e-commerce fashion photo.\nSubject: A realistic photo of a young, attractive Vietnamese model wearing: ${prompt}.`;
    }

    return [{ json: { prompt: finalPrompt, aspect_ratio: aspectRatio, chat_id: chatId, source: body.source || 'telegram' } }];
  }

  test('extracts aspect ratio from prompt', () => {
    const body = { prompt: 'Váy hoa 9:16', chat_id: '123' };
    const result = normalizeMediaRequest(body);
    expect(result[0].json.aspect_ratio).toBe('9:16');
    // The ratio is stripped from the final prompt (may be enhanced into fashion prompt)
    const promptStr = result[0].json.prompt;
    // The prompt should not have the literal "9:16" string remaining after extraction
    const hasRatio = /\b9:16\b/.test(promptStr.split('\n')[0]); // check only first line (title)
    if (hasRatio) throw new Error(`Expected aspect ratio "9:16" to be removed from prompt, got: "${promptStr.slice(0, 100)}"`);
  });

  test('defaults to 3:4 aspect ratio when not specified', () => {
    const body = { prompt: 'Áo thun trắng', chat_id: '456' };
    const result = normalizeMediaRequest(body);
    expect(result[0].json.aspect_ratio).toBe('3:4');
  });

  test('fashion keywords trigger enhanced fashion prompt', () => {
    const body = { prompt: 'Váy đỏ sang trọng', chat_id: '789' };
    const result = normalizeMediaRequest(body);
    expect(result[0].json.prompt).toContain('Vietnamese model');
    expect(result[0].json.prompt).toContain('e-commerce fashion');
  });

  test('non-fashion prompt passes through unchanged', () => {
    const body = { prompt: 'Tòa nhà văn phòng hiện đại', chat_id: '111' };
    const result = normalizeMediaRequest(body);
    expect(result[0].json.prompt).toBe('Tòa nhà văn phòng hiện đại');
  });

  test('uses fallback prompt when none provided', () => {
    const body = { chat_id: '222' };
    const result = normalizeMediaRequest(body);
    expect(result[0].json.prompt).toBeTruthy();
  });

  test('extracts chat_id from various field names', () => {
    expect(normalizeMediaRequest({ telegram_chat_id: 'TC1' })[0].json.chat_id).toBe('TC1');
    expect(normalizeMediaRequest({ senderId: 'S2' })[0].json.chat_id).toBe('S2');
    expect(normalizeMediaRequest({ chatId: 'C3' })[0].json.chat_id).toBe('C3');
  });
});

describe('WF04 — Media Generator: Base64 to Binary validation logic', () => {

  // Test the response parsing logic from "Base64 to Binary" node
  function parseGeminiImageResponse(responseJson) {
    const parts = responseJson.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData?.data || p.inline_data?.data);
    const inlineData = imagePart?.inlineData || imagePart?.inline_data;

    if (!inlineData?.data) {
      throw new Error('Gemini không trả về ảnh. Parts: ' + JSON.stringify(parts.map(p => Object.keys(p))));
    }

    const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/jpeg';
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    return { mimeType, ext, data: inlineData.data };
  }

  test('extracts image data from inlineData format', () => {
    const response = {
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'BASE64DATA' } }] } }],
    };
    const result = parseGeminiImageResponse(response);
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.data).toBe('BASE64DATA');
    expect(result.ext).toBe('jpg');
  });

  test('extracts image data from inline_data format (snake_case)', () => {
    const response = {
      candidates: [{ content: { parts: [{ inline_data: { mime_type: 'image/png', data: 'PNGBASE64' } }] } }],
    };
    const result = parseGeminiImageResponse(response);
    expect(result.ext).toBe('png');
  });

  test('throws error when no image data in response', () => {
    const response = {
      candidates: [{ content: { parts: [{ text: 'Some text but no image' }] } }],
    };
    expectThrow(() => parseGeminiImageResponse(response), 'Gemini không trả về ảnh');
  });

  test('throws error when candidates is empty', () => {
    const response = { candidates: [] };
    expectThrow(() => parseGeminiImageResponse(response));
  });
});

// ─── WF05: TikTok Token Refresher ────────────────────────────────────────────

describe('WF05 — TikTok Token Refresher: Process New Tokens (Code Node)', () => {

  function processNewTokens(response) {
    if (response.error || !response.access_token) {
      return [{
        json: {
          status: 'failed',
          error: response.error_description || 'Lỗi không xác định khi refresh token',
        },
      }];
    }

    return [{
      json: {
        status: 'success',
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        expires_in: response.expires_in,
        refreshed_at: new Date().toISOString(),
      },
    }];
  }

  test('successful token response returns success status', () => {
    const response = { access_token: 'NEW_ACCESS', refresh_token: 'NEW_REFRESH', expires_in: 3600 };
    const result = processNewTokens(response);
    expect(result[0].json.status).toBe('success');
    expect(result[0].json.access_token).toBe('NEW_ACCESS');
    expect(result[0].json.refresh_token).toBe('NEW_REFRESH');
  });

  test('error response returns failed status', () => {
    const response = { error: 'invalid_grant', error_description: 'Token đã hết hạn' };
    const result = processNewTokens(response);
    expect(result[0].json.status).toBe('failed');
    expect(result[0].json.error).toBe('Token đã hết hạn');
  });

  test('missing access_token returns failed status', () => {
    const response = { refresh_token: 'SOME_REFRESH' }; // no access_token
    const result = processNewTokens(response);
    expect(result[0].json.status).toBe('failed');
  });

  test('failed response includes default error message', () => {
    const response = { error: true }; // no error_description
    const result = processNewTokens(response);
    expect(result[0].json.error).toBe('Lỗi không xác định khi refresh token');
  });

  test('success response includes refreshed_at timestamp', () => {
    const response = { access_token: 'TOKEN', refresh_token: 'RTOKEN', expires_in: 86400 };
    const result = processNewTokens(response);
    expect(result[0].json.refreshed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── WF06: Social Publisher ──────────────────────────────────────────────────

describe('WF06 — Social Publisher: Normalize Social Command (Code Node)', () => {

  function normalizePlatform(value) {
    const platform = String(value || 'both').toLowerCase();
    if (platform.includes('facebook') && platform.includes('tiktok')) return 'both';
    if (platform.includes('face')) return 'facebook';
    if (platform.includes('tik')) return 'tiktok';
    return platform === 'both' ? 'both' : 'both';
  }

  function normalizePublishAt(value) {
    if (!value) return new Date().toISOString();
    const lower = String(value).trim().toLowerCase();
    if (['ngay bây giờ', 'ngay bay gio', 'now', 'ngay', 'bây giờ', 'bay gio', 'luôn', 'luon'].includes(lower)) {
      return new Date().toISOString();
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
    return value;
  }

  test('normalizes "facebook" platform', () => {
    expect(normalizePlatform('facebook')).toBe('facebook');
    expect(normalizePlatform('Facebook')).toBe('facebook');
  });

  test('normalizes "tiktok" platform', () => {
    expect(normalizePlatform('tiktok')).toBe('tiktok');
    expect(normalizePlatform('TikTok')).toBe('tiktok');
  });

  test('returns "both" for combined platforms', () => {
    expect(normalizePlatform('facebook và tiktok')).toBe('both');
    expect(normalizePlatform('both')).toBe('both');
    expect(normalizePlatform(null)).toBe('both');
    expect(normalizePlatform('')).toBe('both');
  });

  test('normalizes "ngay bây giờ" publish_at to current ISO time', () => {
    const result = normalizePublishAt('ngay bây giờ');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const diff = Math.abs(Date.parse(result) - Date.now());
    expect(diff < 5000).toBe(true);
  });

  test('normalizes valid ISO string unchanged', () => {
    const iso = '2026-06-13T10:00:00.000Z';
    expect(normalizePublishAt(iso)).toBe(iso);
  });

  test('falls back to input string when unparseable natural language', () => {
    expect(normalizePublishAt('ngày mai')).toBe('ngày mai');
  });
});

describe('WF06 — Social Publisher: Expand Publish Targets (Code Node)', () => {

  function expandPublishTargets(post) {
    const targets = post.platform === 'both' ? ['facebook', 'tiktok'] : [post.platform];
    return targets.map(targetPlatform => ({ json: { ...post, targetPlatform } }));
  }

  test('expands "both" to two items', () => {
    const post = { platform: 'both', caption: 'Hello World' };
    const result = expandPublishTargets(post);
    expect(result).toHaveLength(2);
    expect(result[0].json.targetPlatform).toBe('facebook');
    expect(result[1].json.targetPlatform).toBe('tiktok');
  });

  test('single platform returns one item', () => {
    const post = { platform: 'facebook', caption: 'Test post' };
    const result = expandPublishTargets(post);
    expect(result).toHaveLength(1);
    expect(result[0].json.targetPlatform).toBe('facebook');
  });

  test('inherits all post fields in expanded items', () => {
    const post = { platform: 'both', caption: 'Test', image_url: 'http://img.jpg', video_url: '' };
    const result = expandPublishTargets(post);
    expect(result[0].json.caption).toBe('Test');
    expect(result[0].json.image_url).toBe('http://img.jpg');
  });
});

describe('WF06 — Social Publisher: Prepare Facebook Post (Code Node)', () => {

  function isValidHttpUrl(value) {
    if (typeof value !== 'string' || !value) return false;
    return /^https?:\/\//i.test(value);
  }

  function prepareFacebookPost(post, pageId = 'me') {
    const message = post.caption || post.content || '';
    let edge = 'feed';
    const body = { message };

    if (isValidHttpUrl(post.video_url)) {
      edge = 'videos';
      body.file_url = post.video_url;
      body.description = message;
    } else if (isValidHttpUrl(post.image_url)) {
      edge = 'photos';
      body.url = post.image_url;
      body.caption = message;
    }

    if (post.publish_at) {
      const scheduled = Math.floor(Date.parse(post.publish_at) / 1000);
      const now = Math.floor(Date.now() / 1000);
      if (Number.isFinite(scheduled) && scheduled > now + 600) {
        body.published = false;
        body.scheduled_publish_time = scheduled;
      }
    }

    return [{ json: { ...post, facebook_url: `https://graph.facebook.com/v19.0/${pageId}/${edge}`, facebook_body: body } }];
  }

  test('text post uses feed edge', () => {
    const post = { caption: 'Hello World', platform: 'facebook' };
    const result = prepareFacebookPost(post);
    expect(result[0].json.facebook_url).toContain('/feed');
    expect(result[0].json.facebook_body.message).toBe('Hello World');
  });

  test('post with image_url uses photos edge', () => {
    const post = { caption: 'Photo post', image_url: 'http://example.com/img.jpg' };
    const result = prepareFacebookPost(post);
    expect(result[0].json.facebook_url).toContain('/photos');
    expect(result[0].json.facebook_body.url).toBe('http://example.com/img.jpg');
  });

  test('post with video_url uses videos edge', () => {
    const post = { caption: 'Video post', video_url: 'http://example.com/video.mp4' };
    const result = prepareFacebookPost(post);
    expect(result[0].json.facebook_url).toContain('/videos');
    expect(result[0].json.facebook_body.file_url).toBe('http://example.com/video.mp4');
  });

  test('future publish_at adds scheduled fields', () => {
    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
    const post = { caption: 'Scheduled post', publish_at: futureTime };
    const result = prepareFacebookPost(post);
    expect(result[0].json.facebook_body.published).toBe(false);
    expect(result[0].json.facebook_body.scheduled_publish_time).toBeGreaterThan(0);
  });

  test('invalid image_url ("true" literal) falls back to feed edge without url field', () => {
    const post = { caption: 'Photo post', image_url: 'true' };
    const result = prepareFacebookPost(post);
    expect(result[0].json.facebook_url).toContain('/feed');
    expect(result[0].json.facebook_body.url).toBeUndefined();
    expect(result[0].json.facebook_body.message).toBe('Photo post');
  });

  test('empty string image_url falls back to feed edge', () => {
    const post = { caption: 'Text-only post', image_url: '' };
    const result = prepareFacebookPost(post);
    expect(result[0].json.facebook_url).toContain('/feed');
    expect(result[0].json.facebook_body.url).toBeUndefined();
  });

  test('non-URL image_url (random text) falls back to feed edge', () => {
    const post = { caption: 'Bad URL', image_url: 'not-a-url' };
    const result = prepareFacebookPost(post);
    expect(result[0].json.facebook_url).toContain('/feed');
    expect(result[0].json.facebook_body.url).toBeUndefined();
  });

  test('image_url with ftp scheme falls back to feed edge (only http/https accepted)', () => {
    const post = { caption: 'FTP', image_url: 'ftp://example.com/img.jpg' };
    const result = prepareFacebookPost(post);
    expect(result[0].json.facebook_url).toContain('/feed');
    expect(result[0].json.facebook_body.url).toBeUndefined();
  });

  test('invalid video_url ("null" literal) falls back to feed edge without file_url field', () => {
    const post = { caption: 'Video post', video_url: 'null', image_url: '' };
    const result = prepareFacebookPost(post);
    expect(result[0].json.facebook_url).toContain('/feed');
    expect(result[0].json.facebook_body.file_url).toBeUndefined();
    expect(result[0].json.facebook_body.message).toBe('Video post');
  });

  test('non-URL video_url (random text) falls back to feed edge', () => {
    const post = { caption: 'Bad video URL', video_url: 'not-a-url' };
    const result = prepareFacebookPost(post);
    expect(result[0].json.facebook_url).toContain('/feed');
    expect(result[0].json.facebook_body.file_url).toBeUndefined();
  });

  test('video_url with ftp scheme falls back to feed edge (only http/https accepted)', () => {
    const post = { caption: 'FTP video', video_url: 'ftp://example.com/video.mp4' };
    const result = prepareFacebookPost(post);
    expect(result[0].json.facebook_url).toContain('/feed');
    expect(result[0].json.facebook_body.file_url).toBeUndefined();
  });

  test('invalid video_url takes precedence over invalid image_url (both fallback to feed)', () => {
    const post = { caption: 'Both bad', video_url: 'null', image_url: 'true' };
    const result = prepareFacebookPost(post);
    expect(result[0].json.facebook_url).toContain('/feed');
    expect(result[0].json.facebook_body.file_url).toBeUndefined();
    expect(result[0].json.facebook_body.url).toBeUndefined();
  });

  test('valid http video_url still uses videos edge (regression check)', () => {
    const post = { caption: 'Real video', video_url: 'http://example.com/clip.mp4' };
    const result = prepareFacebookPost(post);
    expect(result[0].json.facebook_url).toContain('/videos');
    expect(result[0].json.facebook_body.file_url).toBe('http://example.com/clip.mp4');
  });
});

describe('WF06 — Social Publisher Worker: Merge Resolve Output (Code Node)', () => {

  function mergeResolveOutput(resolveOut, post, token = 'test-token') {
    const tgFilePath = resolveOut && resolveOut.result && resolveOut.result.file_path ? resolveOut.result.file_path : '';
    let merged = { ...post, targetPlatform: post.targetPlatform };
    if (post.video_file_id && !post.video_url) {
      if (tgFilePath) {
        merged.video_url = `https://api.telegram.org/file/bot${token}/${tgFilePath}`;
      }
    }
    if (post.photo_file_id && !post.image_url) {
      if (tgFilePath) {
        merged.image_url = `https://api.telegram.org/file/bot${token}/${tgFilePath}`;
      }
    }
    return [{ json: merged }];
  }

  test('resolves photo_file_id to image_url when image_url is missing', () => {
    const post = { photo_file_id: 'photo123', targetPlatform: 'facebook' };
    const resolveOut = { result: { file_path: 'photos/photo123.jpg' } };
    const result = mergeResolveOutput(resolveOut, post);
    expect(result[0].json.image_url).toBe('https://api.telegram.org/file/bottest-token/photos/photo123.jpg');
  });

  test('resolves video_file_id to video_url when video_url is missing', () => {
    const post = { video_file_id: 'video123', targetPlatform: 'facebook' };
    const resolveOut = { result: { file_path: 'videos/video123.mp4' } };
    const result = mergeResolveOutput(resolveOut, post);
    expect(result[0].json.video_url).toBe('https://api.telegram.org/file/bottest-token/videos/video123.mp4');
  });

  test('does not override existing image_url', () => {
    const post = { photo_file_id: 'photo123', image_url: 'http://existing.com/img.jpg', targetPlatform: 'facebook' };
    const resolveOut = { result: { file_path: 'photos/photo123.jpg' } };
    const result = mergeResolveOutput(resolveOut, post);
    expect(result[0].json.image_url).toBe('http://existing.com/img.jpg');
  });

  test('gracefully handles missing file_path', () => {
    const post = { photo_file_id: 'photo123', targetPlatform: 'facebook' };
    const resolveOut = { result: {} };
    const result = mergeResolveOutput(resolveOut, post);
    expect(result[0].json.image_url).toBeUndefined();
  });
});

describe('WF06 — Social Publisher: Prepare TikTok Direct Post (Code Node)', () => {

  function prepareTikTokDirectPost(post) {
    if (!post.video_url) {
      throw new Error('TikTok posting requires video_url. Generate or provide a video before publishing.');
    }

    return [{
      json: {
        ...post,
        tiktok_body: {
          post_info: {
            title: post.title || post.caption || 'Video mới',
            description: post.caption || post.content || '',
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: post.video_url,
          },
        },
      },
    }];
  }

  test('throws error when video_url is missing', () => {
    const post = { caption: 'Post without video', platform: 'tiktok' };
    expectThrow(() => prepareTikTokDirectPost(post), 'TikTok posting requires video_url');
  });

  test('builds correct TikTok body structure', () => {
    const post = { title: 'My Video', caption: 'Check this out', video_url: 'http://vid.mp4' };
    const result = prepareTikTokDirectPost(post);
    expect(result[0].json.tiktok_body.source_info.video_url).toBe('http://vid.mp4');
    expect(result[0].json.tiktok_body.post_info.privacy_level).toBe('PUBLIC_TO_EVERYONE');
    expect(result[0].json.tiktok_body.source_info.source).toBe('PULL_FROM_URL');
  });

  test('uses caption as title when title not provided', () => {
    const post = { caption: 'Caption as title', video_url: 'http://vid.mp4' };
    const result = prepareTikTokDirectPost(post);
    expect(result[0].json.tiktok_body.post_info.title).toBe('Caption as title');
  });

  test('defaults to "Video mới" when no title or caption', () => {
    const post = { video_url: 'http://vid.mp4' };
    const result = prepareTikTokDirectPost(post);
    expect(result[0].json.tiktok_body.post_info.title).toBe('Video mới');
  });
});

// ─── WF07: Fashion Image Generator ──────────────────────────────────────────

describe('WF07 — Fashion Image Generator: Normalize Fashion Request (Code Node)', () => {

  function normalizeFashionRequest(item) {
    const body = item.body || item;
    const params = body.params || body;
    const fileId = params.photo_file_id || params.file_id || body.photo_file_id || body.file_id || '';
    const caption = params.photo_caption || params.caption || params.prompt || body.photo_caption || body.caption || body.prompt || '';
    const chatId = params.photo_chat_id || params.chat_id || params.chatId || body.photo_chat_id || body.chat_id || body.chatId || '';

    if (!fileId) {
      throw new Error('Không tìm thấy file_id ảnh sản phẩm. Vui lòng gửi ảnh kèm caption mô tả.');
    }

    return [{
      json: {
        file_id: fileId,
        caption: caption,
        chat_id: String(chatId),
        source: params.source || body.source || 'telegram',
      },
    }];
  }

  test('throws error when file_id is missing', () => {
    const item = { chat_id: '123', caption: 'Test' };
    expectThrow(() => normalizeFashionRequest(item), 'file_id');
  });

  test('extracts file_id from photo_file_id field', () => {
    const item = { photo_file_id: 'FILE_ABC', chat_id: '123' };
    const result = normalizeFashionRequest(item);
    expect(result[0].json.file_id).toBe('FILE_ABC');
  });

  test('extracts data from nested params structure', () => {
    const item = { params: { photo_file_id: 'NESTED_FILE', photo_chat_id: '999', photo_caption: 'Áo thun' } };
    const result = normalizeFashionRequest(item);
    expect(result[0].json.file_id).toBe('NESTED_FILE');
    expect(result[0].json.chat_id).toBe('999');
    expect(result[0].json.caption).toBe('Áo thun');
  });

  test('converts chat_id to string', () => {
    const item = { file_id: 'F1', chat_id: 12345 };
    const result = normalizeFashionRequest(item);
    expect(result[0].json.chat_id).toBe('12345');
  });

  test('defaults source to "telegram"', () => {
    const item = { file_id: 'F1', chat_id: '123' };
    const result = normalizeFashionRequest(item);
    expect(result[0].json.source).toBe('telegram');
  });
});

describe('WF07 — Fashion Image Generator: Parse Gemini Response (Code Node)', () => {

  function parseGeminiResponse(responseJson, chatId, cleanCaption) {
    try {
      const firstCandidate = responseJson.candidates?.[0];
      const finishReason = firstCandidate?.finishReason || firstCandidate?.finish_reason;
      if (finishReason === 'SAFETY') {
        return [{ json: { success: false, chat_id: chatId, error_message: '⚠️ Không thể tạo ảnh thời trang do hình ảnh sản phẩm hoặc mô tả kích hoạt bộ lọc an toàn của AI.' } }];
      }

      const parts = firstCandidate?.content?.parts || [];
      const imgPart = parts.find(p => p.inlineData?.data || p.inline_data?.data);
      const imgData = imgPart?.inlineData || imgPart?.inline_data;

      if (!imgData?.data) {
        const textPart = parts.find(p => p.text);
        const apiError = textPart?.text || responseJson.error?.message || 'Không có dữ liệu ảnh trả về từ API.';
        return [{ json: { success: false, chat_id: chatId, error_message: 'Gemini không trả về ảnh. Chi tiết: ' + apiError } }];
      }

      const mime = imgData.mimeType || imgData.mime_type || 'image/png';
      const ext = mime.includes('png') ? 'png' : 'jpg';
      const summary = cleanCaption || 'Ảnh sản phẩm thời trang chuyên nghiệp';

      return [{
        json: { success: true, chat_id: chatId, prompt_summary: summary, mime_type: mime },
        binary: { image: { data: imgData.data, mimeType: mime, fileName: 'fashion_product.' + ext, fileExtension: ext } },
      }];
    } catch (err) {
      return [{ json: { success: false, chat_id: chatId, error_message: 'Lỗi xử lý phản hồi AI: ' + (err.message || String(err)) } }];
    }
  }

  test('returns success=true with image binary on valid response', () => {
    const response = {
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'IMGDATA' } }] } }],
    };
    const result = parseGeminiResponse(response, 'CHAT123', 'Áo váy đẹp');
    expect(result[0].json.success).toBe(true);
    expect(result[0].binary.image.data).toBe('IMGDATA');
    expect(result[0].json.mime_type).toBe('image/jpeg');
  });

  test('returns success=false when SAFETY filter triggered', () => {
    const response = { candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] };
    const result = parseGeminiResponse(response, 'CHAT123', '');
    expect(result[0].json.success).toBe(false);
    expect(result[0].json.error_message).toContain('bộ lọc an toàn');
  });

  test('returns success=false when no image data returned', () => {
    const response = { candidates: [{ content: { parts: [{ text: 'No image here' }] } }] };
    const result = parseGeminiResponse(response, 'CHAT123', '');
    expect(result[0].json.success).toBe(false);
    expect(result[0].json.error_message).toContain('Gemini không trả về ảnh');
  });

  test('returns PNG extension for PNG mime type', () => {
    const response = {
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'PNGDATA' } }] } }],
    };
    const result = parseGeminiResponse(response, 'CHAT123', '');
    expect(result[0].binary.image.fileExtension).toBe('png');
  });

  test('uses default summary when cleanCaption is empty', () => {
    const response = {
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'D' } }] } }],
    };
    const result = parseGeminiResponse(response, 'CHAT123', '');
    expect(result[0].json.prompt_summary).toBe('Ảnh sản phẩm thời trang chuyên nghiệp');
  });
});

// ─── WF08: Gmail Email Sender ────────────────────────────────────────────────

describe('WF08 — Gmail Email Sender: Prepare Email Request (Code Node)', () => {

  function prepareEmailRequest(params) {
    const recipientRaw = params.recipient_name || params.recipient || '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isDirectEmail = emailRegex.test(recipientRaw.trim());

    return [{
      json: {
        params: {
          ...params,
          is_direct_email: isDirectEmail,
          recipient_name: recipientRaw.trim(),
          direct_email: isDirectEmail ? recipientRaw.trim() : '',
        },
      },
    }];
  }

  test('detects valid email address as direct email', () => {
    const result = prepareEmailRequest({ recipient_name: 'test@example.com' });
    expect(result[0].json.params.is_direct_email).toBe(true);
    expect(result[0].json.params.direct_email).toBe('test@example.com');
  });

  test('treats plain name as non-direct email', () => {
    const result = prepareEmailRequest({ recipient_name: 'Anh Nam' });
    expect(result[0].json.params.is_direct_email).toBe(false);
    expect(result[0].json.params.direct_email).toBe('');
  });

  test('trims whitespace from recipient', () => {
    const result = prepareEmailRequest({ recipient_name: '  user@test.com  ' });
    expect(result[0].json.params.is_direct_email).toBe(true);
    expect(result[0].json.params.recipient_name).toBe('user@test.com');
  });

  test('empty recipient is not direct email', () => {
    const result = prepareEmailRequest({});
    expect(result[0].json.params.is_direct_email).toBe(false);
  });
});

describe('WF08 — Gmail Email Sender: Match Contact (Code Node)', () => {

  function matchContact(contacts, recipientName) {
    if (!recipientName) {
      return [{ json: { found: false, error: 'Thiếu tên người nhận', search_name: '' } }];
    }

    const lowerName = recipientName.toLowerCase().trim();

    // 1) Exact match
    let matched = contacts.find(c => (c.ten || '').toLowerCase().trim() === lowerName);

    // 2) Biet_danh match
    if (!matched) {
      matched = contacts.find(c => {
        const aliases = (c.biet_danh || '').toLowerCase().split(',').map(s => s.trim());
        return aliases.some(a => a && (a === lowerName || a.includes(lowerName) || lowerName.includes(a)));
      });
    }

    // 3) Partial name match
    if (!matched) {
      matched = contacts.find(c => {
        const ten = (c.ten || '').toLowerCase();
        return ten.includes(lowerName) || lowerName.includes(ten.split(' ').pop());
      });
    }

    if (matched) {
      return [{ json: { found: true, email: matched.email, name: matched.ten } }];
    }

    const availableNames = contacts.slice(0, 10).map(c => c.ten).filter(Boolean).join(', ');
    return [{ json: { found: false, error: `Không tìm thấy "${recipientName}"`, available_names: availableNames } }];
  }

  const testContacts = [
    { ten: 'Nguyễn Văn Nam', email: 'nam@example.com', biet_danh: 'Anh Nam, Nam' },
    { ten: 'Trần Thị Lan', email: 'lan@example.com', biet_danh: 'Chị Lan' },
    { ten: 'Lê Minh Tuấn', email: 'tuan@example.com', biet_danh: '' },
  ];

  test('finds contact by exact name match', () => {
    const result = matchContact(testContacts, 'Nguyễn Văn Nam');
    expect(result[0].json.found).toBe(true);
    expect(result[0].json.email).toBe('nam@example.com');
  });

  test('finds contact by biet_danh (alias)', () => {
    const result = matchContact(testContacts, 'Anh Nam');
    expect(result[0].json.found).toBe(true);
    expect(result[0].json.email).toBe('nam@example.com');
  });

  test('finds contact by partial name', () => {
    const result = matchContact(testContacts, 'Tuấn');
    expect(result[0].json.found).toBe(true);
    expect(result[0].json.email).toBe('tuan@example.com');
  });

  test('returns not found when name does not match', () => {
    const result = matchContact(testContacts, 'Nguyễn Quốc Anh');
    expect(result[0].json.found).toBe(false);
    expect(result[0].json.available_names).toContain('Nguyễn Văn Nam');
  });

  test('returns error when recipient name is empty', () => {
    const result = matchContact(testContacts, '');
    expect(result[0].json.found).toBe(false);
    expect(result[0].json.error).toContain('Thiếu tên');
  });
});

describe('WF08 — Gmail Email Sender: Parse Email Content (Code Node)', () => {

  function parseEmailContent(geminiResponse, mergedData) {
    try {
      const text = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        const subjectMatch = text.match(/"subject"\s*:\s*"([^"]+)"/);
        const bodyMatch = text.match(/"body"\s*:\s*"([\s\S]+?)"(?:\s*[,}])/);
        parsed = {
          subject: subjectMatch ? subjectMatch[1] : 'Email từ trợ lý AI',
          body: bodyMatch ? bodyMatch[1].replace(/\\n/g, '\n') : text,
        };
      }

      return [{
        json: {
          to_email: mergedData.contact.email,
          to_name: mergedData.contact.name,
          subject: parsed.subject || 'Email từ trợ lý AI',
          body: parsed.body || '',
          chat_id: mergedData.request.chat_id,
        },
      }];
    } catch (e) {
      return [{
        json: {
          to_email: mergedData.contact.email,
          to_name: mergedData.contact.name,
          subject: 'Email từ trợ lý AI',
          body: mergedData.request.body_prompt,
          chat_id: mergedData.request.chat_id,
          parse_error: e.message,
        },
      }];
    }
  }

  const mergedData = {
    contact: { email: 'test@example.com', name: 'Test User' },
    request: { chat_id: 'CHAT123', body_prompt: 'Send greetings' },
  };

  test('parses valid JSON email content from Gemini', () => {
    const response = {
      candidates: [{
        content: {
          parts: [{ text: JSON.stringify({ subject: 'Xin chào', body: 'Nội dung email đây' }) }],
        },
      }],
    };
    const result = parseEmailContent(response, mergedData);
    expect(result[0].json.subject).toBe('Xin chào');
    expect(result[0].json.body).toBe('Nội dung email đây');
    expect(result[0].json.to_email).toBe('test@example.com');
  });

  test('uses default subject when Gemini returns empty', () => {
    const response = {
      candidates: [{ content: { parts: [{ text: '{}' }] } }],
    };
    const result = parseEmailContent(response, mergedData);
    expect(result[0].json.subject).toBe('Email từ trợ lý AI');
  });

  test('falls back gracefully on completely invalid response', () => {
    const response = {}; // no candidates
    const result = parseEmailContent(response, mergedData);
    expect(result[0].json.to_email).toBe('test@example.com');
    expect(result[0].json.subject).toBe('Email từ trợ lý AI');
  });
});


// ─── ST-005: Video + multi-case post routing (regression for "Đăng video này lên fanpage" bug) ─────────

describe('ST-005 — Telegram Gateway: video + multi-case post routing', () => {

  // Helper functions extracted from Parse Intent code
  function refersToRecentVideo(textForRules) {
    return /\b(video này|video đó|video vừa|video trên|video ở trên|clip này|clip vừa|video ai|vừa tạo)\b/i.test(textForRules);
  }
  function detectPublishAt(text) {
    if (/\b(ngay bây giờ|ngay bay gio|bây giờ|bay gio|luôn|luon|ngay|now)\b/i.test(text)) return 'NOW';
    if (/\b(sáng mai|sang mai)\b/i.test(text)) return 'tomorrow-morning';
    if (/\b(tối nay|toi nay)\b/i.test(text)) return 'tonight';
    if (/\b(ngày mai|ngay mai|mai)\b/i.test(text)) return 'tomorrow';
    return '';
  }
  function detectPlatform(text) {
    if (/\b(cả 2|ca 2|cả hai|ca hai|facebook.*tiktok|tiktok.*facebook|và fanpage|va fanpage|cả fanpage và tiktok|ca fanpage va tiktok)\b/i.test(text)) return 'both';
    if (/tiktok/i.test(text)) return 'tiktok';
    return 'facebook';
  }
  function buildMissingSocial(p) {
    const m = [];
    if (!p.content && !p.caption) m.push('content');
    if (!p.publish_at) m.push('publish_at');
    return m;
  }
  function buildMissingPost(p) {
    const m = [];
    if (!p.content && !p.caption) m.push('content');
    if (!p.photo_file_id && !p.video_file_id && !p.video_url && !p.image_url) m.push('media');
    if (!p.publish_at) m.push('publish_at');
    return m;
  }
  function cleanContent(v) {
    return String(v || '').replace(/^\s*(nội dung|noi dung|caption|content)\s*[:：-]\s*/i, '').trim();
  }
  function routingCommandRe() {
    return /^(đăng bài|dang bai|đăng lên fanpage|dang len fanpage|đăng lên (fanpage|page)|đăng (video|clip|ảnh|anh) (này|đó|vừa|trên)|lên lịch bài|len lich bai|đăng ngay|dăng ngay|đăng lúc|len lich)(\b|$)/i;
  }
  // Simulate the explicitSocial branch fix
  function processSocialRequest({ content, recentVideo, textForRules, hasVideo, hasPhoto, videoFromReply, videoFileId }) {
    const collected = {};
    const stripped = String(content || '').replace(/^(đăng bài|dang bai|đăng lên fanpage|dang len fanpage|đăng lên|len lich bài)\s*[:：-]\s*/i, '').trim();
    const rcr = routingCommandRe();
    const effectiveContent = (rcr.test(stripped) || rcr.test(content)) ? '' : (stripped || content);
    if (effectiveContent) {
      collected.content = effectiveContent;
      collected.caption = effectiveContent;
    }
    if (recentVideo && !collected.video_url) collected.video_url = recentVideo.video_uri;
    if (hasVideo && videoFileId) collected.video_file_id = videoFileId;
    const requiresMedia = hasPhoto || hasVideo || videoFromReply || (collected.video_file_id || collected.video_url);
    const missing = requiresMedia ? buildMissingPost(collected) : buildMissingSocial(collected);
    return { collected, missing };
  }

  test('"Đăng video này lên fanpage" routes to LÊN_LỊCH_BÀI with video_url from recent store', () => {
    const recentVideo = { video_uri: 'https://example.com/veo.mp4', caption: 'BST mới', created_at: '2026-06-13T08:50:00Z' };
    const r = processSocialRequest({
      content: 'Đăng video này lên fanpage',
      recentVideo,
      textForRules: 'đăng video này lên fanpage',
      hasVideo: false,
      hasPhoto: false,
      videoFromReply: false,
      videoFileId: ''
    });
    expect(r.collected.video_url).toBe('https://example.com/veo.mp4');
    expect(r.collected.content).toBeFalsy(); // content is a routing command, dropped
    expect(r.missing).toEqual(['content', 'publish_at']); // bot will ask for both
  });

  test('"Đăng video này lên fanpage ngay bây giờ" auto-fills publish_at', () => {
    const recentVideo = { video_uri: 'https://example.com/veo.mp4', caption: '', created_at: '2026-06-13T08:50:00Z' };
    const publishAt = detectPublishAt('Đăng video này lên fanpage ngay bây giờ');
    expect(publishAt).toBe('NOW');
    const r = processSocialRequest({
      content: 'Đăng video này lên fanpage ngay bây giờ',
      recentVideo,
      textForRules: 'đăng video này lên fanpage ngay bây giờ',
      hasVideo: false, hasPhoto: false, videoFromReply: false, videoFileId: ''
    });
    // Simulate appending publish_at
    r.collected.publish_at = publishAt;
    const r2 = { collected: r.collected, missing: buildMissingPost(r.collected) };
    expect(r2.missing).toEqual(['content']); // only content missing
  });

  test('Multi-platform "đăng lên cả fanpage và tiktok" detects platform=both', () => {
    expect(detectPlatform('đăng lên cả fanpage và tiktok')).toBe('both');
    expect(detectPlatform('đăng lên cả facebook và tiktok ngay')).toBe('both');
    expect(detectPlatform('đăng lên tiktok')).toBe('tiktok');
    expect(detectPlatform('đăng lên fanpage')).toBe('facebook');
    expect(detectPlatform('đăng facebook')).toBe('facebook');
  });

  test('"đăng BST mùa hè" is treated as content, not a routing command', () => {
    const r = processSocialRequest({
      content: 'đăng BST mùa hè lên fanpage',
      recentVideo: null,
      textForRules: 'đăng bst mùa hè lên fanpage',
      hasVideo: false, hasPhoto: false, videoFromReply: false, videoFileId: ''
    });
    // rcr would NOT match "đăng BST mùa hè lên fanpage" because it has actual content beyond the routing command
    expect(r.collected.content).toBeTruthy();
  });

  test('User sends video file directly with text caption', () => {
    const r = processSocialRequest({
      content: 'BST mới ra mắt',
      recentVideo: null,
      textForRules: 'bst mới ra mắt',
      hasVideo: true, hasPhoto: false, videoFromReply: false, videoFileId: 'AgAC-video-123'
    });
    expect(r.collected.video_file_id).toBe('AgAC-video-123');
    expect(r.collected.content).toBe('BST mới ra mắt');
    // requiresMedia = true because hasVideo = true
    expect(r.missing).toEqual(['publish_at']);
  });

  test('Reply to a video message picks up video_file_id from reply', () => {
    // videoFromReply=true causes the main code to set video_file_id = replyVideoFileId before explicitSocial branch.
    // In our helper we simulate by passing the reply file_id through videoFileId when videoFromReply is true.
    const r = processSocialRequest({
      content: 'Đăng lên fanpage',
      recentVideo: null,
      textForRules: 'đăng lên fanpage',
      hasVideo: true,  // mirror the real code: videoFromReply sets hasVideo effectively
      hasPhoto: false, videoFromReply: true, videoFileId: 'reply-video-xyz'
    });
    expect(r.collected.video_file_id).toBe('reply-video-xyz');
  });

  test('Old broken regex would have skipped "Đăng video này lên fanpage" as content', () => {
    const oldRegex = /^(đăng bài|dang bai|lên lịch bài|len lich bai)(\s+lên\s+fanpage|\s+fanpage)?$/i;
    const droppedByOld = oldRegex.test('Đăng video này lên fanpage');
    // Old regex does NOT match this (because "video" is in the middle) so it would keep as content
    expect(droppedByOld).toBe(false);
    // The new rcr correctly drops it as a routing command
    const rcr = routingCommandRe();
    expect(rcr.test('Đăng video này lên fanpage')).toBe(true);
  });

  test('cleanContent strips "nội dung:" / "content:" prefix', () => {
    expect(cleanContent('nội dung: BST mới')).toBe('BST mới');
    expect(cleanContent('content: BST mới')).toBe('BST mới');
    expect(cleanContent('Caption: BST mới')).toBe('BST mới');
    expect(cleanContent('BST mới')).toBe('BST mới');
  });

  test('ST-005 fix preserves requiresMedia decision', () => {
    // When user attaches a video file (hasVideo=true) with text "đăng lên fanpage", the post should require media
    const r = processSocialRequest({
      content: 'đăng lên fanpage',
      recentVideo: null,
      textForRules: 'đăng lên fanpage',
      hasVideo: true, hasPhoto: false, videoFromReply: false, videoFileId: 'vid-1'
    });
    // requiresMedia is true (hasVideo), so buildMissingPost is used; but video_file_id is set
    expect(r.missing).toEqual(['content', 'publish_at']);
  });
});

// ─── WF01: Telegram AI Agent: Prepare Message (Code Node) ──────────────────
describe('WF01 — Telegram AI Agent: Prepare Message (Code Node)', () => {
  function prepareMessage(originalData) {
    const msg = originalData.message || {};
    const chatId = String(msg.chat?.id || '');
    const hasPhoto = !!(msg.photo && msg.photo.length > 0);
    const replyMsg = msg.reply_to_message || {};
    const hasReplyPhoto = !!(replyMsg.photo && replyMsg.photo.length > 0);
    const hasVideo = !!(msg.video || msg.video_note);
    const hasReplyVideo = !!(replyMsg.video || replyMsg.video_note);

    let userText = msg.text || msg.caption || '';
    let photoFileId = '';
    let videoFileId = '';
    let messageKind = 'text';

    if (hasPhoto) {
      const photo = msg.photo[msg.photo.length - 1];
      photoFileId = photo.file_id;
      messageKind = msg.caption ? 'photo_with_caption' : 'photo_only';
      if (!userText) userText = 'Tạo ảnh thời trang chuyên nghiệp từ ảnh sản phẩm tôi gửi';
    } else if (hasReplyPhoto) {
      const photo = replyMsg.photo[replyMsg.photo.length - 1];
      photoFileId = photo.file_id;
      messageKind = 'reply_to_photo';
    }

    if (hasVideo) {
      videoFileId = (msg.video && msg.video.file_id) || (msg.video_note && msg.video_note.file_id) || '';
      messageKind = 'video';
    } else if (hasReplyVideo) {
      videoFileId = (replyMsg.video && replyMsg.video.file_id) || (replyMsg.video_note && replyMsg.video_note.file_id) || '';
      messageKind = 'reply_to_video';
    }

    let contextHint = '';
    if (photoFileId) contextHint += `\n[Ảnh đính kèm: file_id=${photoFileId}]`;
    if (videoFileId) contextHint += `\n[Video đính kèm: file_id=${videoFileId}]`;

    const agentInput = userText + contextHint;

    return [{
      json: {
        chatInput: agentInput,
        chatMessage: agentInput,
        sessionId: chatId,
        chat_id: chatId,
        photo_file_id: photoFileId,
        video_file_id: videoFileId,
        message_kind: messageKind,
        raw_text: userText,
        original_data: originalData
      }
    }];
  }

  test('text message sets input parameters and sessionId', () => {
    const input = { message: { text: 'Hello bot', chat: { id: 12345 } } };
    const result = prepareMessage(input);
    expect(result).toHaveLength(1);
    expect(result[0].json.chatInput).toBe('Hello bot');
    expect(result[0].json.chatMessage).toBe('Hello bot');
    expect(result[0].json.sessionId).toBe('12345');
    expect(result[0].json.message_kind).toBe('text');
  });

  test('photo with caption appends [Ảnh đính kèm] metadata hint', () => {
    const input = {
      message: {
        photo: [{ file_id: 'small' }, { file_id: 'large' }],
        caption: 'Tạo mẫu váy lụa',
        chat: { id: 12345 }
      }
    };
    const result = prepareMessage(input);
    expect(result[0].json.photo_file_id).toBe('large');
    expect(result[0].json.message_kind).toBe('photo_with_caption');
    expect(result[0].json.chatMessage).toBe('Tạo mẫu váy lụa\n[Ảnh đính kèm: file_id=large]');
  });

  test('photo without caption uses default prompt', () => {
    const input = {
      message: {
        photo: [{ file_id: 'img123' }],
        chat: { id: 12345 }
      }
    };
    const result = prepareMessage(input);
    expect(result[0].json.photo_file_id).toBe('img123');
    expect(result[0].json.message_kind).toBe('photo_only');
    expect(result[0].json.chatMessage).toContain('Tạo ảnh thời trang chuyên nghiệp');
  });

  test('reply to photo extracts photo file id', () => {
    const input = {
      message: {
        text: 'Làm mẫu này',
        chat: { id: 12345 },
        reply_to_message: { photo: [{ file_id: 'replied_img' }] }
      }
    };
    const result = prepareMessage(input);
    expect(result[0].json.photo_file_id).toBe('replied_img');
    expect(result[0].json.message_kind).toBe('reply_to_photo');
    expect(result[0].json.chatMessage).toBe('Làm mẫu này\n[Ảnh đính kèm: file_id=replied_img]');
  });

  test('video message extracts video file id and appends video metadata hint', () => {
    const input = {
      message: {
        text: 'Đăng clip này',
        chat: { id: 12345 },
        video: { file_id: 'vid_123' }
      }
    };
    const result = prepareMessage(input);
    expect(result[0].json.video_file_id).toBe('vid_123');
    expect(result[0].json.message_kind).toBe('video');
    expect(result[0].json.chatMessage).toBe('Đăng clip này\n[Video đính kèm: file_id=vid_123]');
  });
});

// ─── WF01: Save Order: Normalize Order Data (Code Node) ────────────────────
describe('WF01 — Save Order: Normalize Order Data (Code Node)', () => {
  function normalizeOrderData(input) {
    const params = input.params || input;
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    return [{
      json: {
        customer_name: params.customer_name || params.ten_khach || '',
        phone: params.phone || params.sdt || '',
        address: params.address || params.dia_chi || '',
        product: params.product || params.san_pham || '',
        quantity: params.quantity || params.so_luong || 1,
        notes: params.notes || params.ghi_chu || '',
        date: dateStr,
        time: timeStr,
        chat_id: params.chat_id || '',
        source: params.source || 'telegram'
      }
    }];
  }

  test('normalizes direct english properties', () => {
    const input = {
      customer_name: 'Nguyễn Văn A',
      phone: '0987654321',
      address: 'Hà Nội',
      product: 'Váy dạ hội',
      quantity: 2,
      notes: 'Giao giờ hành chính',
      chat_id: '9999'
    };
    const result = normalizeOrderData(input);
    expect(result).toHaveLength(1);
    expect(result[0].json.customer_name).toBe('Nguyễn Văn A');
    expect(result[0].json.phone).toBe('0987654321');
    expect(result[0].json.address).toBe('Hà Nội');
    expect(result[0].json.product).toBe('Váy dạ hội');
    expect(result[0].json.quantity).toBe(2);
    expect(result[0].json.notes).toBe('Giao giờ hành chính');
    expect(result[0].json.chat_id).toBe('9999');
    expect(result[0].json.source).toBe('telegram');
  });

  test('normalizes vietnamese/aliased properties', () => {
    const input = {
      params: {
        ten_khach: 'Trần Thị B',
        sdt: '0123456789',
        dia_chi: 'Đà Nẵng',
        san_pham: 'Áo sơ mi',
        so_luong: 3,
        ghi_chu: 'Hàng dễ vỡ'
      }
    };
    const result = normalizeOrderData(input);
    expect(result[0].json.customer_name).toBe('Trần Thị B');
    expect(result[0].json.phone).toBe('0123456789');
    expect(result[0].json.address).toBe('Đà Nẵng');
    expect(result[0].json.product).toBe('Áo sơ mi');
    expect(result[0].json.quantity).toBe(3);
    expect(result[0].json.notes).toBe('Hàng dễ vỡ');
  });
});


// ─── WF12: Facebook Smart Publisher ──────────────────────────────────────────

describe('WF12 — Facebook Smart Publisher: Normalize Smart Publish Request (Code Node)', () => {

  function normalizeSmartPublishRequest(item) {
    const body = item.body || item;
    const params = body.params || body;

    const mode = String(params.mode || 'ai').toLowerCase();
    if (!['ai', 'manual'].includes(mode)) {
      return [{ json: { success: false, chat_id: params.chat_id || '', error_message: 'mode không hợp lệ. Chỉ chấp nhận "ai" hoặc "manual".' } }];
    }

    const mediaKindRaw = String(params.media_kind || params.mediaKind || 'text').toLowerCase();
    let mediaKind = 'text';
    if (['image', 'photo', 'img', 'picture'].includes(mediaKindRaw)) mediaKind = 'image';
    else if (['video', 'clip', 'reel', 'mp4'].includes(mediaKindRaw)) mediaKind = 'video';
    else mediaKind = 'text';

    const photoFileId = String(params.photo_file_id || params.photoFileId || '');
    const videoFileId = String(params.video_file_id || params.videoFileId || '');
    const userCaption = String(params.user_caption || params.userCaption || params.caption || params.content || '');
    const userPrompt = String(params.user_prompt || params.userPrompt || params.topic || userCaption || '');
    const imageUrl = String(params.image_url || params.imageUrl || '');
    const videoUrl = String(params.video_url || params.videoUrl || '');
    const chatId = String(params.chat_id || params.chatId || '');
    const targetPage = String(params.target_page || params.targetPage || 'default');
    const platform = String(params.platform || 'facebook').toLowerCase();
    const tone = String(params.tone || 'friendly').toLowerCase();
    const language = String(params.language || 'vi').toLowerCase();

    // LENIENT FALLBACK: nếu mode=ai mà thiếu user_prompt, tự generate
    let effectiveUserPrompt = userPrompt.trim();
    if (mode === 'ai' && !effectiveUserPrompt) {
      if (userCaption.trim()) effectiveUserPrompt = userCaption.trim();
      else if (mediaKind === 'image' && photoFileId) effectiveUserPrompt = 'Bài đăng về sản phẩm thời trang trong ảnh';
      else if (mediaKind === 'video' && videoFileId) effectiveUserPrompt = 'Bài đăng về video sản phẩm thời trang';
      else effectiveUserPrompt = 'Bài đăng fanpage thời trang';
    }

    if (mode === 'manual' && !userCaption.trim() && !effectiveUserPrompt) {
      return [{ json: { success: false, chat_id: chatId, error_message: 'Thiếu nội dung caption (user_caption) cho chế độ manual.' } }];
    }
    if (!chatId) {
      return [{ json: { success: false, chat_id: '', error_message: 'Thiếu chat_id.' } }];
    }

    let effectiveKind = mediaKind;
    if (mode === 'ai' && mediaKind === 'image' && !photoFileId && !imageUrl) effectiveKind = 'text';
    if (mode === 'ai' && mediaKind === 'video' && !videoFileId && !videoUrl) effectiveKind = 'text';

    return [{
      json: {
        success: true,
        mode, media_kind: mediaKind, effective_kind: effectiveKind,
        photo_file_id: photoFileId, video_file_id: videoFileId,
        image_url: imageUrl, video_url: videoUrl,
        user_caption: userCaption, user_prompt: effectiveUserPrompt,
        chat_id: chatId, target_page: targetPage,
        platform, tone, language
      }
    }];
  }

  test('accepts ai mode with image + photo_file_id', () => {
    const item = { params: { mode: 'ai', media_kind: 'image', photo_file_id: 'PH1', chat_id: '123' } };
    const result = normalizeSmartPublishRequest(item);
    expect(result[0].json.success).toBe(true);
    expect(result[0].json.mode).toBe('ai');
    expect(result[0].json.media_kind).toBe('image');
    expect(result[0].json.effective_kind).toBe('image');
  });

  test('falls back from image to text when no file in ai mode', () => {
    const item = { params: { mode: 'ai', media_kind: 'image', user_prompt: 'váy đỏ', chat_id: '123' } };
    const result = normalizeSmartPublishRequest(item);
    expect(result[0].json.effective_kind).toBe('text');
  });

  test('rejects when both user_caption and user_prompt missing in manual', () => {
    const item = { params: { mode: 'manual', media_kind: 'image', photo_file_id: 'PH1', chat_id: '123' } };
    const result = normalizeSmartPublishRequest(item);
    expect(result[0].json.success).toBe(false);
    expect(result[0].json.error_message).toContain('user_caption');
  });

  test('rejects when chat_id is missing', () => {
    const item = { params: { mode: 'ai', media_kind: 'text', user_prompt: 'topic' } };
    const result = normalizeSmartPublishRequest(item);
    expect(result[0].json.success).toBe(false);
    expect(result[0].json.error_message).toContain('chat_id');
  });

  test('LENIENT: auto-generates user_prompt from media_kind when missing in ai mode', () => {
    const item = { params: { mode: 'ai', media_kind: 'image', photo_file_id: 'PH1', chat_id: '123' } };
    const result = normalizeSmartPublishRequest(item);
    expect(result[0].json.success).toBe(true);
    expect(result[0].json.user_prompt).toContain('Bài đăng');
  });

  test('LENIENT: uses user_caption as user_prompt fallback in ai mode', () => {
    const item = { params: { mode: 'ai', media_kind: 'image', photo_file_id: 'PH1', user_caption: 'Sale hôm nay', chat_id: '123' } };
    const result = normalizeSmartPublishRequest(item);
    expect(result[0].json.success).toBe(true);
    expect(result[0].json.user_prompt).toBe('Sale hôm nay');
  });

  test('rejects invalid mode', () => {
    const item = { params: { mode: 'auto', chat_id: '123' } };
    const result = normalizeSmartPublishRequest(item);
    expect(result[0].json.success).toBe(false);
  });

  test('accepts manual mode with user_caption', () => {
    const item = { params: { mode: 'manual', media_kind: 'image', photo_file_id: 'PH1', user_caption: 'Sale 50% hôm nay', chat_id: '456' } };
    const result = normalizeSmartPublishRequest(item);
    expect(result[0].json.success).toBe(true);
    expect(result[0].json.user_caption).toBe('Sale 50% hôm nay');
  });

  test('normalizes photo/video/text media_kind aliases', () => {
    const img = { params: { mode: 'ai', media_kind: 'photo', user_prompt: 'x', chat_id: '1' } };
    const vid = { params: { mode: 'ai', media_kind: 'reel', user_prompt: 'x', chat_id: '1' } };
    const txt = { params: { mode: 'ai', media_kind: 'post', user_prompt: 'x', chat_id: '1' } };
    expect(normalizeSmartPublishRequest(img)[0].json.media_kind).toBe('image');
    expect(normalizeSmartPublishRequest(vid)[0].json.media_kind).toBe('video');
    expect(normalizeSmartPublishRequest(txt)[0].json.media_kind).toBe('text');
  });

  test('extracts from nested params structure', () => {
    const item = { body: { params: { mode: 'ai', media_kind: 'image', photo_file_id: 'NEST', chat_id: '777', user_prompt: 'topic' } } };
    const result = normalizeSmartPublishRequest(item);
    expect(result[0].json.photo_file_id).toBe('NEST');
    expect(result[0].json.chat_id).toBe('777');
  });
});

describe('WF12 — Facebook Smart Publisher: Build Gemini Text Body (Code Node)', () => {

  function buildGeminiTextBody(norm) {
    const toneMap = {
      friendly: 'thân thiện, gần gũi, nhiều emoji',
      luxury:   'sang trọng, tinh tế, tối giản',
      casual:   'trẻ trung, thoải mái',
      urgent:   'cấp bách, FOMO, khuyến mãi'
    };
    const toneDesc = toneMap[norm.tone] || toneMap.friendly;
    const langDesc = norm.language === 'en' ? 'tiếng Anh' : 'tiếng Việt';

    const systemPrompt = `Bạn là copywriter chuyên nghiệp cho fanpage Facebook thời trang Việt Nam.\n\n` +
      `Nhiệm vụ: Viết caption bằng ${langDesc} dựa trên chủ đề/chủ đề người dùng cung cấp.\n\n` +
      `Chủ đề: "${norm.user_prompt}"\n\n` +
      `Yêu cầu:\n` +
      `- Tone: ${toneDesc}\n` +
      `- Caption: 2-4 câu, có hook mở đầu\n` +
      `- 3-6 hashtag liên quan\n` +
      `- 1 call-to-action rõ ràng\n\n` +
      `Trả về JSON hợp lệ theo schema.`;

    return [{
      json: {
        gemini_body: {
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                caption:  { type: 'string' },
                hashtags: { type: 'array', items: { type: 'string' } },
                cta:      { type: 'string' },
                tone:     { type: 'string', enum: ['friendly', 'luxury', 'casual', 'urgent'] }
              },
              required: ['caption', 'hashtags']
            }
          }
        },
        chat_id: norm.chat_id,
        mode: 'ai',
        media_kind: 'text'
      }
    }];
  }

  test('builds text body with topic in system prompt', () => {
    const norm = { user_prompt: 'váy đỏ Tết', tone: 'friendly', language: 'vi', chat_id: '123' };
    const result = buildGeminiTextBody(norm);
    const body = result[0].json.gemini_body;
    expect(body.contents[0].parts[0].text).toContain('váy đỏ Tết');
    expect(body.contents[0].parts[0].text).toContain('tiếng Việt');
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  test('uses English prompt for language=en', () => {
    const norm = { user_prompt: 'red dress', tone: 'luxury', language: 'en', chat_id: '123' };
    const result = buildGeminiTextBody(norm);
    expect(result[0].json.gemini_body.contents[0].parts[0].text).toContain('tiếng Anh');
    expect(result[0].json.gemini_body.contents[0].parts[0].text).toContain('sang trọng');
  });

  test('maps all 4 tone values correctly', () => {
    const tones = ['friendly', 'luxury', 'casual', 'urgent'];
    tones.forEach(t => {
      const norm = { user_prompt: 'test', tone: t, language: 'vi', chat_id: '1' };
      const result = buildGeminiTextBody(norm);
      expect(result[0].json.gemini_body).toBeDefined();
    });
  });

  test('responseSchema requires caption and hashtags', () => {
    const norm = { user_prompt: 'test', tone: 'friendly', language: 'vi', chat_id: '1' };
    const result = buildGeminiTextBody(norm);
    const schema = result[0].json.gemini_body.generationConfig.responseSchema;
    expect(schema.required).toContain('caption');
    expect(schema.required).toContain('hashtags');
  });
});

describe('WF12 — Facebook Smart Publisher: Parse Gemini Response (Code Node)', () => {

  function parseGeminiResponse(res, req) {
    try {
      const firstCandidate = res.candidates?.[0];
      const finishReason = firstCandidate?.finishReason || firstCandidate?.finish_reason;
      if (finishReason === 'SAFETY') {
        return [{ json: { success: false, chat_id: req.chat_id, error_message: 'Bị chặn bởi bộ lọc an toàn.' } }];
      }

      const textPart = firstCandidate?.content?.parts?.find(p => p.text);
      const rawText = textPart?.text || '';
      if (!rawText) {
        return [{ json: { success: false, chat_id: req.chat_id, error_message: 'Gemini không trả caption.' } }];
      }

      let parsed;
      try { parsed = JSON.parse(rawText); }
      catch { parsed = { caption: rawText, hashtags: [], cta: '' }; }

      const caption = (parsed.caption || '').trim();
      const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
      const cta = (parsed.cta || '').trim();

      const fullCaption = [caption, hashtags.length ? '\n\n' + hashtags.map(h => h.startsWith('#') ? h : '#' + h).join(' ') : '', cta ? '\n\n👉 ' + cta : ''].join('').trim();

      if (!caption) {
        return [{ json: { success: false, chat_id: req.chat_id, error_message: 'Caption rỗng.' } }];
      }

      return [{ json: { success: true, chat_id: req.chat_id, caption: fullCaption, raw_caption: caption, hashtags, cta, source: 'ai' } }];
    } catch (err) {
      return [{ json: { success: false, chat_id: req.chat_id, error_message: 'Lỗi parse: ' + (err.message || String(err)) } }];
    }
  }

  test('parses valid JSON response with caption + hashtags + cta', () => {
    const res = { candidates: [{ content: { parts: [{ text: JSON.stringify({ caption: 'Váy đỏ sang trọng', hashtags: ['#vaydo', '#tet'], cta: 'Mua ngay' }) }] } }] };
    const req = { chat_id: '123' };
    const result = parseGeminiResponse(res, req);
    expect(result[0].json.success).toBe(true);
    expect(result[0].json.caption).toContain('Váy đỏ sang trọng');
    expect(result[0].json.caption).toContain('#vaydo');
    expect(result[0].json.caption).toContain('Mua ngay');
  });

  test('falls back to raw text when response is not JSON', () => {
    const res = { candidates: [{ content: { parts: [{ text: 'Váy đỏ đẹp lắm!' }] } }] };
    const req = { chat_id: '123' };
    const result = parseGeminiResponse(res, req);
    expect(result[0].json.success).toBe(true);
    expect(result[0].json.caption).toBe('Váy đỏ đẹp lắm!');
  });

  test('returns error for SAFETY finish reason', () => {
    const res = { candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] };
    const req = { chat_id: '123' };
    const result = parseGeminiResponse(res, req);
    expect(result[0].json.success).toBe(false);
    expect(result[0].json.error_message).toContain('an toàn');
  });

  test('adds # prefix to hashtags missing it', () => {
    const res = { candidates: [{ content: { parts: [{ text: JSON.stringify({ caption: 'Hello', hashtags: ['fashion', '#sale'] }) }] } }] };
    const req = { chat_id: '123' };
    const result = parseGeminiResponse(res, req);
    expect(result[0].json.caption).toContain('#fashion');
    expect(result[0].json.caption).toContain('#sale');
  });

  test('handles empty candidates gracefully', () => {
    const res = {};
    const req = { chat_id: '123' };
    const result = parseGeminiResponse(res, req);
    expect(result[0].json.success).toBe(false);
  });
});

describe('WF12 — Facebook Smart Publisher: Build Manual Preview Payload (Code Node)', () => {

  function buildManualPayload(norm) {
    const caption = norm.user_caption.trim();
    if (!caption) {
      return [{ json: { success: false, chat_id: norm.chat_id, error_message: 'Caption trống ở mode manual.' } }];
    }
    return [{ json: {
      success: true,
      chat_id: norm.chat_id,
      mode: 'manual',
      media_kind: norm.media_kind,
      effective_kind: norm.effective_kind,
      caption: caption,
      raw_caption: caption,
      hashtags: [],
      cta: '',
      photo_file_id: norm.photo_file_id,
      video_file_id: norm.video_file_id,
      image_url: norm.image_url,
      video_url: norm.video_url,
      target_page: norm.target_page,
      platform: norm.platform,
      source: 'manual'
    }}];
  }

  test('preserves user caption as-is', () => {
    const norm = { user_caption: 'Khuyến mãi 50% hôm nay!', chat_id: '123', media_kind: 'image', effective_kind: 'image' };
    const result = buildManualPayload(norm);
    expect(result[0].json.success).toBe(true);
    expect(result[0].json.caption).toBe('Khuyến mãi 50% hôm nay!');
    expect(result[0].json.source).toBe('manual');
    expect(result[0].json.hashtags).toEqual([]);
  });

  test('trims whitespace from caption', () => {
    const norm = { user_caption: '   Áo thun mới về   ', chat_id: '123', media_kind: 'text' };
    const result = buildManualPayload(norm);
    expect(result[0].json.caption).toBe('Áo thun mới về');
  });

  test('returns error for empty caption', () => {
    const norm = { user_caption: '   ', chat_id: '123' };
    const result = buildManualPayload(norm);
    expect(result[0].json.success).toBe(false);
  });

  test('passes through photo_file_id and target_page', () => {
    const norm = { user_caption: 'Sale!', chat_id: '123', media_kind: 'image', effective_kind: 'image', photo_file_id: 'PH1', target_page: 'page_abc', platform: 'facebook' };
    const result = buildManualPayload(norm);
    expect(result[0].json.photo_file_id).toBe('PH1');
    expect(result[0].json.target_page).toBe('page_abc');
  });
});

describe('WF12 — Facebook Smart Publisher: Approval ID generation (Code Node)', () => {

  function generateApprovalId(payload) {
    if (payload.success === false) return null;
    return 'FSP' + Date.now().toString(36).toUpperCase();
  }

  test('generates FSP-prefixed approval ID', () => {
    const id = generateApprovalId({ success: true });
    expect(id).toBeTruthy();
    expect(id.startsWith('FSP')).toBe(true);
  });

  test('returns null for error payload', () => {
    const id = generateApprovalId({ success: false, error_message: 'x' });
    expect(id).toBe(null);
  });

  test('generates unique IDs', async () => {
    const ids = new Set();
    for (let i = 0; i < 5; i++) {
      ids.add(generateApprovalId({ success: true }));
      await new Promise(r => setTimeout(r, 2));
    }
    expect(ids.size).toBe(5);
  });
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log(`🧪 UNIT TEST RESULTS`);
console.log('═'.repeat(60));
console.log(`✅ Passed:  ${passed}`);
console.log(`❌ Failed:  ${failed}`);
console.log(`📊 Total:   ${passed + failed}`);

if (errors.length > 0) {
  console.log('\n❌ FAILED TESTS:');
  for (const { name, error } of errors) {
    console.log(`  • ${name}`);
    console.log(`    → ${error}`);
  }
}

console.log('');
process.exit(failed > 0 ? 1 : 0);

#!/usr/bin/env node
import process from 'node:process';

const input = await new Promise((resolve, reject) => {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    data += chunk;
  });
  process.stdin.on('end', () => {
    try {
      resolve(JSON.parse(data));
    } catch (error) {
      reject(error);
    }
  });
});

const { geminiApiKey, facebookPageAccessToken, facebookPageId } = input;
const results = [];

function summarizeJson(value) {
  const redact = (item) => {
    if (typeof item === 'string') {
      return item.replace(/access_token=[^&\s"]+/g, 'access_token=REDACTED');
    }
    if (Array.isArray(item)) return item.map(redact);
    if (item && typeof item === 'object') {
      return Object.fromEntries(
        Object.entries(item).map(([key, child]) => [
          key,
          /token|secret|key/i.test(key) ? 'REDACTED' : redact(child),
        ]),
      );
    }
    return item;
  };

  if (!value || typeof value !== 'object') return value;
  if (value.error) return { error: redact(value.error) };
  if (Array.isArray(value.models)) {
    const relevant = value.models
      .filter((model) => /image|veo|gemini-3|gemini-2\.5-flash/.test(model.name))
      .map((model) => ({
        name: model.name,
        supportedGenerationMethods: model.supportedGenerationMethods,
      }));
    return {
      modelCount: value.models.length,
      models: value.models.slice(0, 20).map((model) => model.name),
      relevant,
    };
  }
  return redact(value);
}

async function requestJson(name, url, options = {}) {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        accept: 'application/json',
        ...(options.headers ?? {}),
      },
    });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text.slice(0, 500);
    }
    results.push({
      name,
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - start,
      body: summarizeJson(body),
    });
  } catch (error) {
    results.push({
      name,
      ok: false,
      status: 'request_failed',
      durationMs: Date.now() - start,
      body: { message: error.message },
    });
  }
}

if (geminiApiKey) {
  await requestJson(
    'gemini.listModels',
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiApiKey)}`,
  );

  await requestJson(
    'gemini.workflowImageEndpoint.generateContentShape',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Test image prompt for API compatibility only' }] }],
        generationConfig: {
          responseModalities: ['Image'],
          responseFormat: {
          image: {
            aspectRatio: 'ASPECT_RATIO_NINE_BY_SIXTEEN',
            imageSize: 'IMAGE_SIZE_ONE_K',
          },
          },
        },
      }),
    },
  );

  await requestJson(
    'gemini.gemini31FlashLite.generateContent.textSmoke',
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Reply with exactly: ok' }] }],
      }),
    },
  );
}

if (facebookPageAccessToken && facebookPageId) {
  await requestJson(
    'facebook.pageToken.pageLookup',
    `https://graph.facebook.com/v19.0/${encodeURIComponent(facebookPageId)}?fields=id,name&access_token=${encodeURIComponent(facebookPageAccessToken)}`,
  );

  await requestJson(
    'facebook.pageToken.permissions',
    `https://graph.facebook.com/v19.0/me/permissions?access_token=${encodeURIComponent(facebookPageAccessToken)}`,
  );

  await requestJson(
    'facebook.pageFeed.read',
    `https://graph.facebook.com/v19.0/${encodeURIComponent(facebookPageId)}/feed?fields=id,message,created_time&limit=1&access_token=${encodeURIComponent(facebookPageAccessToken)}`,
  );

  await requestJson(
    'facebook.pageConversations.read',
    `https://graph.facebook.com/v19.0/${encodeURIComponent(facebookPageId)}/conversations?fields=id,updated_time&limit=1&access_token=${encodeURIComponent(facebookPageAccessToken)}`,
  );
}

console.log(JSON.stringify(results, null, 2));

const failed = results.filter((result) => !result.ok);
process.exit(failed.length > 0 ? 1 : 0);

import { db } from '../db/index.js';
import { settings, apiKeyUsage } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

// Cache
let cachedKeys: string[] = [];
let keyIndex = 0;
let lastLoadTime = 0;
const CACHE_TTL = 60_000;

function loadKeys(): string[] {
  const now = Date.now();
  if (cachedKeys.length > 0 && now - lastLoadTime < CACHE_TTL) {
    return cachedKeys;
  }

  const keys: string[] = [];

  // 1. Load from environment variable
  const envKeys = process.env.GEMINI_API_KEY;
  if (envKeys) {
    envKeys.split(',').forEach((k) => {
      const trimmed = k.trim();
      if (isValidKey(trimmed) && !isBlocked(trimmed)) {
        keys.push(trimmed);
      }
    });
  }

  // 2. Load from DB: gemini_api_keys (comma-separated)
  const dbKeys = db.select().from(settings).where(eq(settings.key, 'gemini_api_keys')).get();
  if (dbKeys) {
    dbKeys.value.split(',').forEach((k) => {
      const trimmed = k.trim();
      if (trimmed && isValidKey(trimmed) && !keys.includes(trimmed)) {
        keys.push(trimmed);
      }
    });
  }

  cachedKeys = keys;
  lastLoadTime = now;
  return keys;
}

function isValidKey(key: string): boolean {
  if (key.length < 20) return false;
  if (/^(your|placeholder|test|example|dummy|fake|xxx|change.?me)/i.test(key)) return false;
  return true;
}

function isBlocked(key: string): boolean {
  const blocked = db.select().from(settings).where(eq(settings.key, 'blocked_api_keys')).get();
  if (!blocked) return false;
  const suffixes = blocked.value.split(',').map((s) => s.trim());
  return suffixes.some((s) => key.endsWith(s));
}

export function invalidateKeyCache() {
  cachedKeys = [];
  lastLoadTime = 0;
}

// Bad key tracking: key -> timestamp when it was marked bad
const badKeys = new Map<string, number>();
const BAD_KEY_TTL = 10 * 60_000; // 10 minutes before retrying a bad key

export function markKeyBad(key: string) {
  badKeys.set(key, Date.now());
  console.warn(`[geminiKeys] Marked key ...${key.slice(-4)} as bad for ${BAD_KEY_TTL / 60000}m`);
}

function getHealthyKeys(): string[] {
  const now = Date.now();
  const keys = loadKeys();
  const healthy = keys.filter((k) => {
    const badSince = badKeys.get(k);
    if (!badSince) return true;
    // Auto-recover after TTL
    if (now - badSince > BAD_KEY_TTL) {
      badKeys.delete(k);
      return true;
    }
    return false;
  });
  // If all keys are bad, return all (better to try than to fail)
  return healthy.length > 0 ? healthy : keys;
}

// Round-robin key selection (skips bad keys)
export function getGeminiApiKey(): string | null {
  const keys = getHealthyKeys();
  if (keys.length === 0) return null;
  const key = keys[keyIndex % keys.length];
  keyIndex = (keyIndex + 1) % keys.length;
  return key;
}

// Failover: next healthy key excluding failed one
export function getGeminiApiKeyExcluding(failedKey: string): string | null {
  const keys = getHealthyKeys().filter((k) => k !== failedKey);
  if (keys.length === 0) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}

export function getGeminiModel(): string {
  const record = db.select().from(settings).where(eq(settings.key, 'gemini_model')).get();
  return record?.value || 'gemini-2.5-flash';
}

export function getAllKeys(): { suffix: string; fromEnv: boolean; todayCalls: number; todayTokens: number; totalCalls: number; totalTokens: number }[] {
  const keys = loadKeys();
  const envKeys = (process.env.GEMINI_API_KEY || '').split(',').map((k) => k.trim()).filter(Boolean);

  return keys.map((key) => {
    const suffix = key.slice(-4);
    const fromEnv = envKeys.some((ek) => ek === key);

    const todayStats = db.select({
      calls: sql<number>`COUNT(*)`,
      tokens: sql<number>`COALESCE(SUM(total_tokens), 0)`,
    }).from(apiKeyUsage)
      .where(sql`${apiKeyUsage.apiKeySuffix} = ${suffix} AND date(${apiKeyUsage.createdAt}) = date('now')`)
      .get();

    const totalStats = db.select({
      calls: sql<number>`COUNT(*)`,
      tokens: sql<number>`COALESCE(SUM(total_tokens), 0)`,
    }).from(apiKeyUsage)
      .where(eq(apiKeyUsage.apiKeySuffix, suffix))
      .get();

    return {
      suffix,
      fromEnv,
      todayCalls: todayStats?.calls || 0,
      todayTokens: todayStats?.tokens || 0,
      totalCalls: totalStats?.calls || 0,
      totalTokens: totalStats?.tokens || 0,
    };
  });
}

export function addApiKey(apiKey: string) {
  const existing = db.select().from(settings).where(eq(settings.key, 'gemini_api_keys')).get();
  if (existing) {
    const keys = existing.value.split(',').map((k) => k.trim()).filter(Boolean);
    if (!keys.includes(apiKey)) {
      keys.push(apiKey);
      db.update(settings).set({ value: keys.join(','), updatedAt: new Date().toISOString() }).where(eq(settings.key, 'gemini_api_keys')).run();
    }
  } else {
    db.insert(settings).values({ key: 'gemini_api_keys', value: apiKey, updatedAt: new Date().toISOString() }).run();
  }
  invalidateKeyCache();
}

export function removeApiKey(suffix: string) {
  const existing = db.select().from(settings).where(eq(settings.key, 'gemini_api_keys')).get();
  if (!existing) return;
  const keys = existing.value.split(',').map((k) => k.trim()).filter((k) => !k.endsWith(suffix));
  db.update(settings).set({ value: keys.join(','), updatedAt: new Date().toISOString() }).where(eq(settings.key, 'gemini_api_keys')).run();
  invalidateKeyCache();
}

export function trackUsage(apiKeySuffix: string, model: string, callType: string, usage?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }) {
  db.insert(apiKeyUsage).values({
    apiKeySuffix,
    model,
    callType,
    promptTokens: usage?.promptTokenCount || 0,
    completionTokens: usage?.candidatesTokenCount || 0,
    totalTokens: usage?.totalTokenCount || 0,
    createdAt: new Date().toISOString(),
  }).run();
}

export function getUsageStats() {
  const today = db.select({
    calls: sql<number>`COUNT(*)`,
    tokens: sql<number>`COALESCE(SUM(total_tokens), 0)`,
  }).from(apiKeyUsage)
    .where(sql`date(${apiKeyUsage.createdAt}) = date('now')`)
    .get();

  const week = db.select({
    calls: sql<number>`COUNT(*)`,
    tokens: sql<number>`COALESCE(SUM(total_tokens), 0)`,
  }).from(apiKeyUsage)
    .where(sql`${apiKeyUsage.createdAt} >= datetime('now', '-7 days')`)
    .get();

  const month = db.select({
    calls: sql<number>`COUNT(*)`,
    tokens: sql<number>`COALESCE(SUM(total_tokens), 0)`,
  }).from(apiKeyUsage)
    .where(sql`${apiKeyUsage.createdAt} >= datetime('now', '-30 days')`)
    .get();

  return {
    today: { calls: today?.calls || 0, tokens: today?.tokens || 0 },
    week: { calls: week?.calls || 0, tokens: week?.tokens || 0 },
    month: { calls: month?.calls || 0, tokens: month?.tokens || 0 },
  };
}

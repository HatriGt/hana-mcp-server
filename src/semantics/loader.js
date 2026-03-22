/**
 * Load optional business semantics JSON from HANA_SEMANTICS_PATH or HANA_SEMANTICS_URL.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { logger } = require('../utils/logger');
const { config } = require('../utils/config');

let cache = {
  data: null,
  loadedAt: 0,
  sourceKey: '',
  fileMtimeMs: null
};

function isPlainObject(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

/**
 * @returns {object} normalized { tables: Record<string, object> }
 */
function normalizeSemantics(raw) {
  if (!isPlainObject(raw)) {
    return { tables: {} };
  }
  const tables = raw.tables && isPlainObject(raw.tables) ? raw.tables : {};
  return { tables };
}

async function loadFromUrl(url, ttlMs) {
  const res = await axios.get(url, {
    timeout: 30000,
    responseType: 'json',
    validateStatus: (s) => s >= 200 && s < 300
  });
  return normalizeSemantics(res.data);
}

function loadFromFile(filePath, ttlMs) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`HANA_SEMANTICS_PATH file not found: ${abs}`);
  }
  const stat = fs.statSync(abs);
  const mtime = stat.mtimeMs;
  const key = `${abs}:${mtime}`;
  if (
    ttlMs > 0 &&
    cache.data &&
    cache.sourceKey === key &&
    Date.now() - cache.loadedAt < ttlMs
  ) {
    return cache.data;
  }
  const text = fs.readFileSync(abs, 'utf8');
  const parsed = JSON.parse(text);
  const data = normalizeSemantics(parsed);
  cache = { data, loadedAt: Date.now(), sourceKey: key, fileMtimeMs: mtime };
  return data;
}

/**
 * @returns {Promise<{ tables: Record<string, object> }>}
 */
async function loadSemantics() {
  const ttlMs = config.getQueryLimits().semanticsTtlMs;
  const filePath = process.env.HANA_SEMANTICS_PATH;
  const url = process.env.HANA_SEMANTICS_URL;

  if (!filePath && !url) {
    return { tables: {} };
  }

  try {
    if (filePath) {
      return loadFromFile(filePath, ttlMs);
    }
    if (url) {
      if (
        ttlMs > 0 &&
        cache.data &&
        cache.sourceKey === `url:${url}` &&
        Date.now() - cache.loadedAt < ttlMs
      ) {
        return cache.data;
      }
      const data = await loadFromUrl(url, ttlMs);
      cache = { data, loadedAt: Date.now(), sourceKey: `url:${url}`, fileMtimeMs: null };
      return data;
    }
  } catch (e) {
    logger.warn('Semantics load failed:', e.message);
    return { tables: {} };
  }

  return { tables: {} };
}

/**
 * @param {string} schemaName
 * @param {string} tableName
 * @param {string|null|undefined} catalogDatabase optional MDC DB for keys like HSP.SAPABAP1.TABLE
 * @returns {Promise<object|null>}
 */
async function getTableSemantics(schemaName, tableName, catalogDatabase) {
  const { tables } = await loadSemantics();
  const db =
    catalogDatabase != null && typeof catalogDatabase === 'string' && catalogDatabase.trim()
      ? catalogDatabase.trim()
      : '';
  const keys = [];
  if (db) {
    keys.push(
      `${db}.${schemaName}.${tableName}`,
      `${db.toUpperCase()}.${schemaName.toUpperCase()}.${tableName.toUpperCase()}`
    );
  }
  keys.push(
    `${schemaName}.${tableName}`,
    `${schemaName.toUpperCase()}.${tableName.toUpperCase()}`,
    tableName
  );
  for (const k of keys) {
    if (tables[k]) return tables[k];
  }
  return null;
}

function clearSemanticsCacheForTests() {
  cache = { data: null, loadedAt: 0, sourceKey: '', fileMtimeMs: null };
}

module.exports = {
  loadSemantics,
  getTableSemantics,
  normalizeSemantics,
  clearSemanticsCacheForTests
};

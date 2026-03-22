/**
 * Short-lived snapshots for resumable SELECT paging (opaque id -> sql + params).
 */

const crypto = require('crypto');
const { config } = require('./utils/config');

const snapshots = new Map();

/** @type {(() => number) | null} Used only by automated tests (see tests/automated/test-snapshot-store.js). */
let _nowOverride = null;

function nowMs() {
  return _nowOverride ? _nowOverride() : Date.now();
}

function createSnapshot({ query, parameters }) {
  const ttl = config.getQueryLimits().querySnapshotTtlMs;
  const id = crypto.randomUUID();
  const expiresAt = nowMs() + ttl;
  snapshots.set(id, { query, parameters: parameters || [], expiresAt });
  return id;
}

function getSnapshot(id) {
  const s = snapshots.get(id);
  if (!s) return null;
  if (nowMs() > s.expiresAt) {
    snapshots.delete(id);
    return null;
  }
  return s;
}

function deleteSnapshot(id) {
  snapshots.delete(id);
}

/** Periodic cleanup of expired entries (lazy on get). */
function pruneExpired() {
  const t = nowMs();
  for (const [k, v] of snapshots.entries()) {
    if (t > v.expiresAt) snapshots.delete(k);
  }
}

setInterval(pruneExpired, 60000).unref();

/** @internal Automated tests only */
function _setNowForTests(fn) {
  _nowOverride = typeof fn === 'function' ? fn : null;
}

/** @internal Automated tests only */
function _resetNowForTests() {
  _nowOverride = null;
}

module.exports = {
  createSnapshot,
  getSnapshot,
  deleteSnapshot,
  _setNowForTests,
  _resetNowForTests
};

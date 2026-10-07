/**
 * Request-scoped database profile.
 *
 * Each tools/call runs inside runWithProfile(key, fn); config and the connection
 * manager read the active profile from here. AsyncLocalStorage keeps concurrent
 * HTTP requests against different databases isolated.
 */

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

/**
 * @param {string} profileKey
 * @param {() => any} fn
 */
function runWithProfile(profileKey, fn) {
  return storage.run({ profileKey }, fn);
}

/** @returns {string|null} Active profile key, or null outside a request scope. */
function getActiveProfileKey() {
  const store = storage.getStore();
  return store ? store.profileKey : null;
}

module.exports = { runWithProfile, getActiveProfileKey };

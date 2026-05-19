/**
 * Simple connection pool for @sap/hana-client connections.
 * Slots are created lazily up to maxSize. Callers that arrive when all slots are busy
 * are queued and served in FIFO order when a slot is released.
 */

const { logger } = require('../utils/logger');
const { redactSecrets } = require('../utils/sensitive-redact');

class ConnectionPool {
  /**
   * @param {number} maxSize
   * @param {Function} factory - async () => client (hana-client wrapper)
   */
  constructor(maxSize, factory) {
    this.maxSize = maxSize;
    this.factory = factory;
    this.slots = [];    // { client, busy, needsReset }
    this.creating = 0;
    this.queue = [];    // { resolve, reject }
  }

  /**
   * Acquire a client from the pool. Waits if all slots are busy.
   * @returns {Promise<object>} hana client wrapper
   */
  async acquire() {
    const idle = this.slots.find(s => !s.busy);
    if (idle) {
      idle.busy = true;
      if (idle.needsReset) {
        idle.needsReset = false;
        try {
          await idle.client.disconnect();
        } catch (_) {}
        try {
          idle.client = await this.factory();
        } catch (err) {
          idle.busy = false;
          throw err;
        }
      }
      return idle.client;
    }

    if (this.slots.length + this.creating < this.maxSize) {
      this.creating++;
      let client;
      try {
        client = await this.factory();
      } catch (err) {
        this.creating--;
        throw err;
      }
      this.creating--;
      const slot = { client, busy: true, needsReset: false };
      this.slots.push(slot);
      return client;
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
    });
  }

  /**
   * Release a client back to the pool.
   * @param {object} client
   * @param {boolean} [markForReset] - true if the connection may be in a bad state (e.g. after cancel)
   */
  release(client, markForReset = false) {
    const slot = this.slots.find(s => s.client === client);
    if (!slot) return;

    slot.needsReset = markForReset;

    if (this.queue.length > 0) {
      const waiter = this.queue.shift();
      if (markForReset) {
        this.factory()
          .then(newClient => {
            slot.client = newClient;
            slot.needsReset = false;
            waiter.resolve(newClient);
          })
          .catch(err => {
            slot.busy = false;
            waiter.reject(err);
          });
      } else {
        waiter.resolve(client);
      }
    } else {
      slot.busy = false;
    }
  }

  /**
   * Drain all connections (used on shutdown).
   */
  async drain() {
    this.queue.forEach(w => w.reject(new Error('Connection pool draining')));
    this.queue = [];
    await Promise.all(
      this.slots.map(s => s.client.disconnect().catch(() => {}))
    );
    this.slots = [];
  }

  getStats() {
    return {
      poolSize: this.maxSize,
      totalSlots: this.slots.length,
      busySlots: this.slots.filter(s => s.busy).length,
      idleSlots: this.slots.filter(s => !s.busy).length,
      queuedRequests: this.queue.length
    };
  }
}

module.exports = { ConnectionPool };

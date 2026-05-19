#!/usr/bin/env node
/**
 * Unit tests for ConnectionPool (no HANA connection required).
 * Uses a simple fake factory to exercise acquire/release/queue/drain/reset logic.
 */

const assert = require('assert');
const path = require('path');
const { ConnectionPool } = require(path.join(__dirname, '..', '..', 'src', 'database', 'connection-pool'));

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        console.log('  ok:', name);
      }).catch((e) => {
        console.error('  FAIL:', name, '-', e.message);
        process.exit(1);
      });
    }
    console.log('  ok:', name);
  } catch (e) {
    console.error('  FAIL:', name, '-', e.message);
    process.exit(1);
  }
}

let clientId = 0;
function fakeFactory() {
  const id = ++clientId;
  return Promise.resolve({ id, disconnect: () => Promise.resolve() });
}

console.log('connection pool tests\n');

(async () => {
  // ── acquire creates new slot ──────────────────────────────────────────
  await test('acquire creates a new client via factory', async () => {
    const pool = new ConnectionPool(2, fakeFactory);
    const c = await pool.acquire();
    assert(c && typeof c.id === 'number');
    assert.strictEqual(pool.slots.length, 1);
    assert.strictEqual(pool.getStats().busySlots, 1);
  });

  // ── release marks slot idle ───────────────────────────────────────────
  await test('release returns slot to idle', async () => {
    const pool = new ConnectionPool(2, fakeFactory);
    const c = await pool.acquire();
    pool.release(c);
    assert.strictEqual(pool.getStats().idleSlots, 1);
    assert.strictEqual(pool.getStats().busySlots, 0);
  });

  // ── second acquire reuses idle slot ──────────────────────────────────
  await test('second acquire reuses the idle slot (no new factory call)', async () => {
    const pool = new ConnectionPool(2, fakeFactory);
    const c1 = await pool.acquire();
    pool.release(c1);
    const c2 = await pool.acquire();
    assert.strictEqual(c1, c2, 'same client object reused');
    assert.strictEqual(pool.slots.length, 1, 'still one slot');
  });

  // ── pool grows up to maxSize ──────────────────────────────────────────
  await test('pool creates up to maxSize slots', async () => {
    const pool = new ConnectionPool(3, fakeFactory);
    const c1 = await pool.acquire();
    const c2 = await pool.acquire();
    const c3 = await pool.acquire();
    assert.strictEqual(pool.slots.length, 3);
    assert.strictEqual(pool.getStats().busySlots, 3);
    pool.release(c1);
    pool.release(c2);
    pool.release(c3);
  });

  // ── queue when all slots busy ─────────────────────────────────────────
  await test('acquire queues when all slots busy, resolves on release', async () => {
    const pool = new ConnectionPool(1, fakeFactory);
    const c1 = await pool.acquire();
    assert.strictEqual(pool.getStats().queuedRequests, 0);

    let resolved = false;
    const pending = pool.acquire().then((c) => {
      resolved = true;
      return c;
    });

    assert.strictEqual(pool.getStats().queuedRequests, 1);
    pool.release(c1);

    const c2 = await pending;
    assert.strictEqual(resolved, true);
    assert.strictEqual(c2, c1, 'same slot reused from queue');
    assert.strictEqual(pool.getStats().queuedRequests, 0);
  });

  // ── markForReset reconnects slot ─────────────────────────────────────
  await test('release with markForReset=true reconnects slot before reuse', async () => {
    let factoryCalls = 0;
    const trackingFactory = () => {
      factoryCalls++;
      return Promise.resolve({ id: factoryCalls, disconnect: () => Promise.resolve() });
    };
    const pool = new ConnectionPool(1, trackingFactory);
    const c1 = await pool.acquire();
    assert.strictEqual(factoryCalls, 1);

    pool.release(c1, true);
    // slot is idle but marked for reset; next acquire re-creates it
    const c2 = await pool.acquire();
    assert.strictEqual(factoryCalls, 2, 'factory called again after reset');
    assert.notStrictEqual(c1, c2, 'different client after reset');
    pool.release(c2);
  });

  // ── markForReset with queued waiter ───────────────────────────────────
  await test('release markForReset with queued waiter gets fresh client', async () => {
    let factoryCalls = 0;
    const trackingFactory = () => {
      factoryCalls++;
      return Promise.resolve({ id: factoryCalls, disconnect: () => Promise.resolve() });
    };
    const pool = new ConnectionPool(1, trackingFactory);
    const c1 = await pool.acquire();

    const pending = pool.acquire();
    assert.strictEqual(pool.getStats().queuedRequests, 1);

    pool.release(c1, true);
    const c2 = await pending;
    assert.strictEqual(factoryCalls, 2, 'factory called to serve queued waiter after reset');
    assert.notStrictEqual(c1, c2);
    pool.release(c2);
  });

  // ── drain rejects queued waiters ──────────────────────────────────────
  await test('drain rejects all queued waiters', async () => {
    const pool = new ConnectionPool(1, fakeFactory);
    const c1 = await pool.acquire();

    let rejectedMsg = null;
    const pending = pool.acquire().catch((e) => { rejectedMsg = e.message; });

    await pool.drain();
    await pending;
    assert.match(rejectedMsg, /draining/);
  });

  // ── getStats ──────────────────────────────────────────────────────────
  await test('getStats reflects pool state accurately', async () => {
    const pool = new ConnectionPool(3, fakeFactory);
    const c1 = await pool.acquire();
    const c2 = await pool.acquire();
    pool.release(c1);

    const stats = pool.getStats();
    assert.strictEqual(stats.poolSize, 3);
    assert.strictEqual(stats.totalSlots, 2);
    assert.strictEqual(stats.busySlots, 1);
    assert.strictEqual(stats.idleSlots, 1);
    assert.strictEqual(stats.queuedRequests, 0);
    pool.release(c2);
  });

  console.log('\nDone.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

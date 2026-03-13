/**
 * In-memory task store for MCP task-augmented tools/call (experimental).
 * Tasks do not persist across process restarts.
 */

const crypto = require('crypto');

const DEFAULT_TTL_MS = 300000; // 5 minutes
const DEFAULT_POLL_MS = 1000;

const tasks = new Map();

function createTaskId() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

/**
 * Create a new task (status: working). Caller should run the operation and then completeTask or failTask.
 * @param {{ ttl?: number }} [taskMeta]
 * @returns {{ taskId: string, status: string, createdAt: string, lastUpdatedAt: string, ttl: number|null, pollInterval: number }}
 */
function createTask(taskMeta = {}) {
  const taskId = createTaskId();
  const ttl = typeof taskMeta.ttl === 'number' && taskMeta.ttl > 0 ? taskMeta.ttl : DEFAULT_TTL_MS;
  const task = {
    taskId,
    status: 'working',
    statusMessage: undefined,
    createdAt: now(),
    lastUpdatedAt: now(),
    ttl,
    pollInterval: DEFAULT_POLL_MS,
    result: undefined,
    error: undefined
  };
  tasks.set(taskId, task);
  return {
    taskId: task.taskId,
    status: task.status,
    createdAt: task.createdAt,
    lastUpdatedAt: task.lastUpdatedAt,
    ttl: task.ttl,
    pollInterval: task.pollInterval
  };
}

/**
 * Mark task completed and store result (CallToolResult shape).
 */
function completeTask(taskId, result) {
  const task = tasks.get(taskId);
  if (!task) return null;
  task.status = 'completed';
  task.lastUpdatedAt = now();
  task.result = result;
  return task;
}

/**
 * Mark task failed.
 */
function failTask(taskId, message) {
  const task = tasks.get(taskId);
  if (!task) return null;
  task.status = 'failed';
  task.statusMessage = message;
  task.lastUpdatedAt = now();
  return task;
}

/**
 * Mark task cancelled.
 */
function cancelTask(taskId) {
  const task = tasks.get(taskId);
  if (!task) return null;
  if (['completed', 'failed', 'cancelled'].includes(task.status)) {
    return null; // already terminal
  }
  task.status = 'cancelled';
  task.statusMessage = 'Task cancelled by request';
  task.lastUpdatedAt = now();
  return task;
}

function getTask(taskId) {
  const task = tasks.get(taskId);
  if (!task) return null;
  return {
    taskId: task.taskId,
    status: task.status,
    statusMessage: task.statusMessage,
    createdAt: task.createdAt,
    lastUpdatedAt: task.lastUpdatedAt,
    ttl: task.ttl,
    pollInterval: task.pollInterval
  };
}

function getTaskResult(taskId) {
  const task = tasks.get(taskId);
  if (!task) return null;
  if (task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled') {
    return { pending: true, task };
  }
  if (task.status === 'completed' && task.result) {
    return task.result;
  }
  if (task.status === 'failed') {
    return {
      content: [{ type: 'text', text: task.statusMessage || 'Tool execution failed' }],
      isError: true
    };
  }
  if (task.status === 'cancelled') {
    return {
      content: [{ type: 'text', text: 'Task was cancelled' }],
      isError: true
    };
  }
  return task.result || { content: [{ type: 'text', text: 'No result' }], isError: false };
}

/**
 * List tasks with optional cursor pagination
 */
function listTasks(cursor) {
  const pageSize = 50;
  const entries = Array.from(tasks.entries());
  let start = 0;
  if (cursor) {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (typeof parsed.offset === 'number' && parsed.offset >= 0) {
        start = Math.min(parsed.offset, entries.length);
      }
    } catch (_) {
      start = 0;
    }
  }
  const page = entries.slice(start, start + pageSize).map(([_, task]) => ({
    taskId: task.taskId,
    status: task.status,
    statusMessage: task.statusMessage,
    createdAt: task.createdAt,
    lastUpdatedAt: task.lastUpdatedAt,
    ttl: task.ttl,
    pollInterval: task.pollInterval
  }));
  const hasMore = start + page.length < entries.length;
  const nextCursor = hasMore ? Buffer.from(JSON.stringify({ offset: start + page.length }), 'utf8').toString('base64') : undefined;
  return { tasks: page, nextCursor };
}

module.exports = {
  createTask,
  completeTask,
  failTask,
  cancelTask,
  getTask,
  getTaskResult,
  listTasks
};

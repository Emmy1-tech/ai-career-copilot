import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function createStore({ filePath = path.resolve(process.env.DATA_DIR || './data', 'applications.json') } = {}) {
  let operationQueue = Promise.resolve();

  function enqueue(operation) {
    const result = operationQueue.then(operation);
    // Keep the queue usable after a failed operation while returning the failure to its caller.
    operationQueue = result.catch(() => {});
    return result;
  }

  async function read() {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async function write(items) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(tempPath, JSON.stringify(items, null, 2), 'utf8');
      await fs.rename(tempPath, filePath);
    } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => {});
      throw error;
    }
  }

  return {
    async listApplications() {
      await operationQueue;
      return (await read()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async createApplication(input) {
      return enqueue(async () => {
        const items = await read();
        const now = new Date().toISOString();
        const application = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
        items.push(application);
        await write(items);
        return application;
      });
    },

    async updateApplication(id, changes) {
      return enqueue(async () => {
        const items = await read();
        const index = items.findIndex((item) => item.id === id);
        if (index < 0) return null;
        items[index] = { ...items[index], ...changes, updatedAt: new Date().toISOString() };
        await write(items);
        return items[index];
      });
    },

    async deleteApplication(id) {
      return enqueue(async () => {
        const items = await read();
        const filtered = items.filter((item) => item.id !== id);
        if (filtered.length === items.length) return false;
        await write(filtered);
        return true;
      });
    }
  };
}

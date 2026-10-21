import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function createStore({ filePath = path.resolve(process.env.DATA_DIR || './data', 'applications.json') } = {}) {
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
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(items, null, 2), 'utf8');
    await fs.rename(tempPath, filePath);
  }
  return {
    async listApplications() {
      return (await read()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async createApplication(input) {
      const items = await read();
      const application = { id: randomUUID(), ...input, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      items.push(application);
      await write(items);
      return application;
    },
    async updateApplication(id, changes) {
      const items = await read();
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return null;
      items[index] = { ...items[index], ...changes, updatedAt: new Date().toISOString() };
      await write(items);
      return items[index];
    },
    async deleteApplication(id) {
      const items = await read();
      const filtered = items.filter((item) => item.id !== id);
      if (filtered.length === items.length) return false;
      await write(filtered);
      return true;
    }
  };
}

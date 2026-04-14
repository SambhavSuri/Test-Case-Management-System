import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "..", "..", "data");

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating data directory:", error);
  }
}

async function ensureFile(collection: string) {
  const filePath = path.join(DATA_DIR, `${collection}.json`);
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify([]));
  }
  return filePath;
}

export const readCollection = async (collection: string): Promise<any[]> => {
  await ensureDataDir();
  const filePath = await ensureFile(collection);
  const data = await fs.readFile(filePath, "utf-8");
  return JSON.parse(data);
};

export const writeCollection = async (collection: string, data: any[]): Promise<void> => {
  await ensureDataDir();
  const filePath = await ensureFile(collection);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

export const findById = async (collection: string, id: string): Promise<any | undefined> => {
  const data = await readCollection(collection);
  return data.find((item: any) => item.id === id);
};

export const insert = async (collection: string, item: any): Promise<any> => {
  const data = await readCollection(collection);
  const newItem = { ...item, id: item.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` };
  data.push(newItem);
  await writeCollection(collection, data);
  return newItem;
};

export const update = async (collection: string, id: string, updates: any): Promise<any | null> => {
  const data = await readCollection(collection);
  const index = data.findIndex((item: any) => item.id === id);
  if (index === -1) return null;
  data[index] = { ...data[index], ...updates };
  await writeCollection(collection, data);
  return data[index];
};

export const remove = async (collection: string, id: string): Promise<boolean> => {
  const data = await readCollection(collection);
  const filtered = data.filter((item: any) => item.id !== id);
  if (filtered.length === data.length) return false;
  await writeCollection(collection, filtered);
  return true;
};

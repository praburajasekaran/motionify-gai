/**
 * Simple file-based storage for proposals and inquiries
 * Uses JSON files as database (MVP solution)
 * 
 * This allows both landing page (port 5174) and admin portal (port 5173)
 * to share the same data without cross-origin localStorage issues.
 */
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Ensure data directory exists
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory might already exist, ignore error
  }
}

/**
 * Read JSON data from a file
 * Returns empty array if file doesn't exist
 */
export async function readJSON<T>(filename: string): Promise<T[]> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T[];
  } catch {
    // File doesn't exist yet, return empty array
    return [];
  }
}

/**
 * Write JSON data to a file
 */
export async function writeJSON<T>(filename: string, data: T[]): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Storage file names
 */
export const STORAGE_FILES = {
  PROPOSALS: 'proposals.json',
  INQUIRIES: 'inquiries.json',
} as const;

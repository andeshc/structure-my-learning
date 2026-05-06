import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { schemaSql } from './schema.js';

const databasePath = path.resolve(process.cwd(), config.DATABASE_PATH);
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(schemaSql);
}

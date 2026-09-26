import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const schemaPath = path.join(__dirname, '../../schema.sql');
  logger.info({ schemaPath }, 'Reading SQL schema file...');

  try {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    logger.info('Executing database schema migration...');
    await pool.query(sql);
    logger.info('✅ Database schema migrated successfully!');
  } catch (err) {
    logger.error({ err }, '❌ Database migration failed');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

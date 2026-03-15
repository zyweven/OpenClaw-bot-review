#!/usr/bin/env node
// Memory list script for ClawView
// Usage: node memory-scripts/list.js [limit] [offset] [category] [scope]

import lancedb from '@lancedb/lancedb';
import path from 'path';
import os from 'os';

const LANCEDB_PATH = process.env.OPENCLAW_HOME
  ? `${process.env.OPENCLAW_HOME}/memory/lancedb-pro/memories.lance`
  : `${os.homedir()}/.openclaw/memory/lancedb-pro/memories.lance`;

const limit = parseInt(process.argv[2] || '50', 10);
const offset = parseInt(process.argv[3] || '0', 10);
const category = process.argv[4] || null;
const scope = process.argv[5] || null;

async function main() {
  try {
    const db = await lancedb.connect(LANCEDB_PATH);
    const table = await db.openTable('memories');
    
    let records = await table.query().toArray();
    
    if (category) {
      records = records.filter(r => r.category === category);
    }
    
    if (scope) {
      records = records.filter(r => r.scope === scope);
    }
    
    // Sort by timestamp descending
    records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    const total = records.length;
    const paginated = records.slice(offset, offset + limit);
    
    // Remove vector field
    const memories = paginated.map(r => {
      const { vector, ...rest } = r;
      return rest;
    });
    
    console.log(JSON.stringify({ memories, total, limit, offset }));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

main();

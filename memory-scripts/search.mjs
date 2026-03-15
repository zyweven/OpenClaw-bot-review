#!/usr/bin/env node
// Memory search script for ClawView
// Usage: node memory-scripts/search.js "query" [limit] [scope]

import lancedb from '@lancedb/lancedb';
import path from 'path';
import os from 'os';

const LANCEDB_PATH = process.env.OPENCLAW_HOME
  ? `${process.env.OPENCLAW_HOME}/memory/lancedb-pro/memories.lance`
  : `${os.homedir()}/.openclaw/memory/lancedb-pro/memories.lance`;

const query = process.argv[2] || '';
const limit = parseInt(process.argv[3] || '20', 10);
const scope = process.argv[4] || null;

async function main() {
  if (!query.trim()) {
    console.log(JSON.stringify({ memories: [], query: '', total: 0 }));
    return;
  }

  try {
    const db = await lancedb.connect(LANCEDB_PATH);
    const table = await db.openTable('memories');
    
    let records = await table.query().toArray();
    
    if (scope) {
      records = records.filter(r => r.scope === scope);
    }
    
    // Simple text search
    const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    records = records.filter(r => {
      const text = (r.text || '').toLowerCase();
      return searchTerms.every(term => text.includes(term));
    });
    
    // Sort by timestamp descending
    records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    const total = records.length;
    const limited = records.slice(0, limit);
    
    // Remove vector field
    const memories = limited.map(r => {
      const { vector, ...rest } = r;
      return rest;
    });
    
    console.log(JSON.stringify({ memories, query, total }));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

main();

#!/usr/bin/env node
// Memory stats script for ClawView
// Usage: node memory-scripts/stats.js

import lancedb from '@lancedb/lancedb';
import path from 'path';
import os from 'os';

const LANCEDB_PATH = process.env.OPENCLAW_HOME
  ? `${process.env.OPENCLAW_HOME}/memory/lancedb-pro/memories.lance`
  : `${os.homedir()}/.openclaw/memory/lancedb-pro/memories.lance`;

async function main() {
  try {
    const db = await lancedb.connect(LANCEDB_PATH);
    const table = await db.openTable('memories');
    const count = await table.countRows();
    
    const records = await table.query().toArray();
    
    const byCategory = {};
    const byTier = {};
    const byScope = {};
    
    for (const record of records) {
      const cat = record.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      
      const tier = record.tier || 'unspecified';
      byTier[tier] = (byTier[tier] || 0) + 1;
      
      const scope = record.scope || 'unknown';
      byScope[scope] = (byScope[scope] || 0) + 1;
    }
    
    console.log(JSON.stringify({
      total: count,
      byCategory,
      byTier,
      byScope,
    }));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

main();

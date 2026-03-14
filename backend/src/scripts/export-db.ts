/**
 * export-db.ts — exports all collections from local MongoDB to JSON files
 * Usage: npx tsx src/scripts/export-db.ts
 * Output: ./db-export/<collection>.json
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env['MONGODB_URI'] ?? 'mongodb://127.0.0.1:27017/property_db';
const OUT_DIR = path.join(process.cwd(), 'db-export');

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const collections = await db.listCollections().toArray();
  console.log(`Found ${collections.length} collections`);

  for (const col of collections) {
    const name = col.name;
    const docs = await db.collection(name).find({}).toArray();
    const outPath = path.join(OUT_DIR, `${name}.json`);
    fs.writeFileSync(outPath, JSON.stringify(docs, null, 2));
    console.log(`  ✓ ${name}: ${docs.length} documents → ${outPath}`);
  }

  await mongoose.disconnect();
  console.log('\nExport complete! Files saved to ./db-export/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

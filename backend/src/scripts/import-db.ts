/**
 * import-db.ts — imports JSON files into MongoDB, converting string ObjectIds back to ObjectId type
 * Usage: npx tsx src/scripts/import-db.ts [dir]
 * Default dir: /tmp/db-export
 */
import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env['MONGODB_URI'] ?? 'mongodb://127.0.0.1:27017/property_db';
const IN_DIR = process.argv[2] ?? '/tmp/db-export';

const OID_REGEX = /^[0-9a-fA-F]{24}$/;

function convertObjectIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(convertObjectIds);
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = convertObjectIds(v);
    }
    return result;
  }
  if (typeof value === 'string' && OID_REGEX.test(value)) {
    return new Types.ObjectId(value);
  }
  return value;
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  const files = fs.readdirSync(IN_DIR).filter((f) => f.endsWith('.json'));
  console.log(`Found ${files.length} files in ${IN_DIR}`);

  for (const file of files) {
    const collectionName = path.basename(file, '.json');
    const raw = fs.readFileSync(path.join(IN_DIR, file), 'utf-8');
    const docs = JSON.parse(raw) as unknown[];

    if (!Array.isArray(docs) || docs.length === 0) {
      console.log(`  ⚠  ${collectionName}: empty or invalid — skipping`);
      continue;
    }

    const converted = docs.map((d) => convertObjectIds(d)) as Record<string, unknown>[];

    await db.collection(collectionName).drop().catch(() => {
      // collection may not exist yet — that's fine
    });
    await db.collection(collectionName).insertMany(converted);
    console.log(`  ✓ ${collectionName}: ${converted.length} documents imported`);
  }

  await mongoose.disconnect();
  console.log('\nImport complete!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

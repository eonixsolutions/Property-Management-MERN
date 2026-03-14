/**
 * recompute-property-status.ts
 * Recomputes all property statuses based on actual active tenants.
 * Run after migration to fix status mismatches.
 *
 * Usage: npx tsx src/scripts/recompute-property-status.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { Property, updatePropertyStatus } from '../models/property.model';

async function main() {
  await connectDB();
  const props = await Property.find({}).select('_id').lean();
  console.log(`Recomputing status for ${props.length} properties...`);
  for (const p of props) {
    await updatePropertyStatus(p._id as mongoose.Types.ObjectId);
  }
  console.log('✅ Done');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

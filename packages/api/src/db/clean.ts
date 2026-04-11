import { like } from 'drizzle-orm';
import { db, groups } from './index.js';

await db.delete(groups).where(like(groups.name, '[E2E]%'));

console.log('E2E test data cleaned');

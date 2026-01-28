#!/usr/bin/env tsx
import { prisma } from '../lib/prisma';

/**
 * Script: fix-reg-type
 * - Scans the `users` table for rows where `reg_type` is empty string or NULL.
 * - Logs the affected rows (id and reg_type).
 * - If run with `--fix`, updates those rows to a safe default ('email').
 *
 * Usage:
 *  - Dry run (log only): `pnpm --filter @revalidate/api --workspace exec -- tsx src/scripts/fix-reg-type.ts`
 *  - Fix mode: `tsx src/scripts/fix-reg-type.ts --fix`
 */

async function main() {
  const args = process.argv.slice(2);
  const doFix = args.includes('--fix');

  console.log(`fix-reg-type: starting (fix=${doFix})`);

  try {
    // Find users with empty reg_type or NULL
    const rows: Array<{ id: bigint | number; reg_type: string | null }> = await prisma.$queryRawUnsafe(
      `SELECT id, reg_type FROM users WHERE reg_type = '' OR reg_type IS NULL LIMIT 1000`
    );

    if (!rows || rows.length === 0) {
      console.log('No users found with empty or NULL reg_type.');
      return;
    }

    console.log(`Found ${rows.length} user(s) with empty/NULL reg_type:`);
    rows.forEach((r) => console.log(` - id=${String(r.id)}, reg_type=${String(r.reg_type)}`));

    if (!doFix) {
      console.log('\nDry run complete. To apply fixes run with --fix');
      return;
    }

    // Apply fixes in a transaction (update to 'email' safe default)
    const ids = rows.map((r) => BigInt(r.id as any));

    console.log(`Updating ${ids.length} rows to reg_type='email'...`);
    await prisma.$transaction(async (tx) => {
      for (const id of ids) {
        await tx.$executeRawUnsafe(`UPDATE users SET reg_type = ?, updated_at = ? WHERE id = ?`, 'email', new Date(), id);
      }
    });

    console.log('Update complete.');
  } catch (err) {
    console.error('Error running fix-reg-type:', err);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main();

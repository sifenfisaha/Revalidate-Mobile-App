import { connectMySQL, getMySQLPool } from '../config/database';

async function main() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    console.log('\n🔎 Counting users with non-empty email (before)...\n');
    const [beforeRows] = await pool.execute(
      "SELECT COUNT(*) as total FROM users WHERE email IS NOT NULL AND TRIM(email) <> ''"
    ) as any[];
    const totalWithEmail = beforeRows && beforeRows[0] ? Number(beforeRows[0].total) : 0;
    console.log(`Total users with email: ${totalWithEmail}\n`);

    console.log('🔎 Counting how many are NOT verified (status != \'one\')...\n');
    const [notVerifiedRows] = await pool.execute(
      "SELECT COUNT(*) as total FROM users WHERE email IS NOT NULL AND TRIM(email) <> '' AND (status != 'one' AND status != '1')"
    ) as any[];
    const notVerified = notVerifiedRows && notVerifiedRows[0] ? Number(notVerifiedRows[0].total) : 0;
    console.log(`Users to verify: ${notVerified}\n`);

    if (notVerified > 0) {
      const [res] = await pool.execute(
        "UPDATE users SET status = 'one', updated_at = NOW() WHERE email IS NOT NULL AND TRIM(email) <> '' AND (status != 'one' AND status != '1')"
      ) as any[];

      const affected = (res && (res.affectedRows || res.changedRows || res.affectedRows === 0)) ? (res.affectedRows ?? res.changedRows ?? 0) : (res?.affectedRows ?? 0);
      console.log(`Rows updated: ${affected}\n`);
    } else {
      console.log('No rows required updating.\n');
    }

    console.log('Listing 200 most-recent OTP-ready users (id, email, status, updated_at):\n');
    const [rows] = await pool.execute(
      `SELECT id, email, status, created_at, updated_at FROM users WHERE email IS NOT NULL AND TRIM(email) <> '' ORDER BY updated_at DESC LIMIT 200`
    ) as any[];

    for (const r of rows) {
      console.log(`- id=${r.id} email=${r.email} status=${r.status} updated_at=${r.updated_at}`);
    }

    process.exit(0);
  } catch (err: any) {
    console.error('Error querying/updating DB:', err?.message || err);
    process.exit(2);
  }
}

main();

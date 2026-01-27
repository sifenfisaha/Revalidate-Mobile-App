import { connectMySQL, getMySQLPool } from '../config/database';

async function main() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    console.log('\n🔎 Counting users with email that are NOT verified...\n');

    const [countRows] = await pool.execute(
      "SELECT COUNT(*) as total FROM users WHERE email IS NOT NULL AND TRIM(email) <> '' AND (status != 'one' AND status != '1')"
    ) as any[];

    const toUpdate = countRows && countRows[0] ? Number(countRows[0].total) : 0;
    console.log(`Users to mark verified: ${toUpdate}\n`);

    if (toUpdate === 0) {
      console.log('No users require updating.');
      process.exit(0);
    }

    const [res] = await pool.execute(
      "UPDATE users SET status = 'one', updated_at = NOW() WHERE email IS NOT NULL AND TRIM(email) <> '' AND (status != 'one' AND status != '1')"
    ) as any[];

    const affected = (res && (res.affectedRows || res.changedRows || res.affectedRows === 0)) ? (res.affectedRows ?? res.changedRows ?? 0) : (res?.affectedRows ?? 0);
    console.log(`Rows updated: ${affected}\n`);

    console.log('Listing most recently-updated OTP-ready users (id, email, updated_at):\n');
    const [rows] = await pool.execute(
      `SELECT id, email, created_at, updated_at FROM users WHERE email IS NOT NULL AND TRIM(email) <> '' AND (status = 'one' OR status = '1') ORDER BY updated_at DESC LIMIT 200`
    ) as any[];

    for (const r of rows) {
      console.log(`- id=${r.id} email=${r.email} updated_at=${r.updated_at}`);
    }

    process.exit(0);
  } catch (err: any) {
    console.error('Error updating DB:', err?.message || err);
    process.exit(2);
  }
}

main();

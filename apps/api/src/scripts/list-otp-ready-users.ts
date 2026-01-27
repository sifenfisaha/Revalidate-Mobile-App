import { connectMySQL, getMySQLPool } from '../config/database';

async function main() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    console.log('\n🔎 Finding users eligible for OTP (email present and verified)...\n');

    const [countRows] = await pool.execute(
      "SELECT COUNT(*) as total FROM users WHERE email IS NOT NULL AND TRIM(email) <> '' AND (status = 'one' OR status = '1')"
    ) as any[];
    const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

    console.log(`Total OTP-ready users: ${total}\n`);

    console.log('Listing first 200 OTP-ready users (id, email):\n');
    const [rows] = await pool.execute(
      `SELECT id, email, created_at FROM users WHERE email IS NOT NULL AND TRIM(email) <> '' AND (status = 'one' OR status = '1') ORDER BY created_at DESC LIMIT 200`
    ) as any[];

    for (const r of rows) {
      console.log(`- id=${r.id} email=${r.email} created_at=${r.created_at}`);
    }

    process.exit(0);
  } catch (err: any) {
    console.error('Error querying DB:', err?.message || err);
    process.exit(2);
  }
}

main();

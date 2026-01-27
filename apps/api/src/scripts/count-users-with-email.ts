import { connectMySQL, getMySQLPool } from '../config/database';

async function main() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    console.log('\n🔎 Counting users with registered email...\n');

    const [rows] = await pool.execute(
      "SELECT COUNT(*) as total FROM users WHERE email IS NOT NULL AND TRIM(email) <> ''"
    ) as any[];

    const total = rows && rows[0] ? Number(rows[0].total) : 0;

    console.log(`Users with email: ${total}`);
    process.exit(0);
  } catch (err: any) {
    console.error('Error querying DB:', err?.message || err);
    process.exit(2);
  }
}

main();

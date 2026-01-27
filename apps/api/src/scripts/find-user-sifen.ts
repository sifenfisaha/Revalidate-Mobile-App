import { connectMySQL, getMySQLPool } from '../config/database';

async function main() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    const term = '%sifen%';
    console.log('\n🔎 Searching for users with name/email like "sifen"...\n');

    const [rows] = await pool.execute(
      `SELECT id, name, email, status, created_at, updated_at FROM users
       WHERE LOWER(IFNULL(name, '')) LIKE LOWER(?) OR LOWER(IFNULL(email, '')) LIKE LOWER(?)
       ORDER BY created_at DESC LIMIT 200`,
      [term, term]
    ) as any[];

    if (!rows || rows.length === 0) {
      console.log('No users found matching "sifen"');
      process.exit(0);
    }

    console.log(`Found ${rows.length} user(s):\n`);
    for (const r of rows) {
      console.log(`- id=${r.id} name=${r.name || 'N/A'} email=${r.email || 'N/A'} status=${r.status} created_at=${r.created_at}`);
    }

    process.exit(0);
  } catch (err: any) {
    console.error('Error querying DB:', err?.message || err);
    process.exit(2);
  }
}

main();

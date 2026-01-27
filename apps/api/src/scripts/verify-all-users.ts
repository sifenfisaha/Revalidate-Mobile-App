import { connectMySQL, getMySQLPool } from '../config/database';

async function main() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    console.log('\n🔎 Counting total users (before)...\n');
    const [totalRows] = await pool.execute('SELECT COUNT(*) as total FROM users') as any[];
    const totalUsers = totalRows && totalRows[0] ? Number(totalRows[0].total) : 0;
    console.log(`Total users: ${totalUsers}\n`);

    console.log('🔎 Counting currently verified users (status = \'one\' or \'1\')...\n');
    const [verifiedRows] = await pool.execute("SELECT COUNT(*) as total FROM users WHERE status = 'one' OR status = '1'") as any[];
    const verifiedBefore = verifiedRows && verifiedRows[0] ? Number(verifiedRows[0].total) : 0;
    console.log(`Verified before: ${verifiedBefore}\n`);

    console.log('⚙️ Updating all users: setting status = \'one\' ...\n');
    const [res] = await pool.execute("UPDATE users SET status = 'one', updated_at = NOW()") as any[];
    const affected = (res && (res.affectedRows || res.changedRows || res.affectedRows === 0)) ? (res.affectedRows ?? res.changedRows ?? 0) : (res?.affectedRows ?? 0);
    console.log(`Rows updated: ${affected}\n`);

    console.log('🔎 Counting verified users (after)...\n');
    const [verifiedAfterRows] = await pool.execute("SELECT COUNT(*) as total FROM users WHERE status = 'one' OR status = '1'") as any[];
    const verifiedAfter = verifiedAfterRows && verifiedAfterRows[0] ? Number(verifiedAfterRows[0].total) : 0;
    console.log(`Verified after: ${verifiedAfter}\n`);

    console.log('Listing 200 most-recent users (id, email, status, updated_at):\n');
    const [rows] = await pool.execute(`SELECT id, email, status, created_at, updated_at FROM users ORDER BY updated_at DESC LIMIT 200`) as any[];
    for (const r of rows) {
      console.log(`- id=${r.id} email=${r.email || 'N/A'} status=${r.status} updated_at=${r.updated_at}`);
    }

    process.exit(0);
  } catch (err: any) {
    console.error('Error querying/updating DB:', err?.message || err);
    process.exit(2);
  }
}

main();

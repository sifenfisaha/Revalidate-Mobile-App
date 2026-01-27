import { connectMySQL, getMySQLPool } from '../config/database';

async function main() {
  const email = process.argv[2] || process.env.EMAIL;
  if (!email) {
    console.error('Usage: tsx src/scripts/make-user-premium.ts <email>');
    process.exit(1);
  }

  try {
    await connectMySQL();
    const pool = getMySQLPool();

    console.log(`\n🔎 Looking up user with email: ${email}\n`);

    const [rows] = await pool.execute(
      'SELECT id, email, subscription_tier, subscription_status FROM users WHERE email = ?',
      [email]
    ) as any[];

    if (!rows || rows.length === 0) {
      console.error(`❌ No user found with email ${email}`);
      process.exit(1);
    }

    const user = rows[0];
    console.log(`Found user: id=${user.id}, tier=${user.subscription_tier || 'N/A'}, status=${user.subscription_status || 'N/A'}`);

    console.log('\n🔄 Updating subscription to premium (subscription_tier=\'premium\', subscription_status=\'active\')...\n');

    await pool.execute(
      'UPDATE users SET subscription_tier = ?, subscription_status = ?, updated_at = NOW() WHERE email = ?',
      ['premium', 'active', email]
    );

    const [afterRows] = await pool.execute(
      'SELECT id, email, subscription_tier, subscription_status FROM users WHERE email = ?',
      [email]
    ) as any[];

    const updated = afterRows[0];
    console.log(`✅ Updated: id=${updated.id}, tier=${updated.subscription_tier}, status=${updated.subscription_status}`);
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error?.message || error);
    process.exit(2);
  }
}

main();

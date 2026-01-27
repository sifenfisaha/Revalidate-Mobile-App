import { connectMySQL, getMySQLPool } from '../config/database';

async function main() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    console.log('\n🔎 Counting documents with stored `document` path/URL...\n');

    const [totalRes] = await pool.execute(
      "SELECT COUNT(*) as total FROM personal_documents WHERE document IS NOT NULL AND document <> ''"
    ) as any[];
    const total = totalRes[0]?.total || 0;

    const [imageRes] = await pool.execute(
      `SELECT COUNT(*) as images FROM personal_documents
       WHERE document IS NOT NULL AND document <> ''
       AND (document REGEXP '\\.(jpg|jpeg|png|gif)$' OR LOWER(type) LIKE '%image%')`
    ) as any[];
    const images = imageRes[0]?.images || 0;

    console.log(`Total documents with file: ${total}`);
    console.log(`Detected image-like documents: ${images}\n`);

    console.log('📋 Listing most recent 100 uploaded documents (id, user_id, email, document, document_name, type, created_at):\n');
    const [rows] = await pool.execute(
      `SELECT pd.id, pd.user_id, u.email, pd.document, pd.document_name, pd.type, pd.created_at
       FROM personal_documents pd
       LEFT JOIN users u ON pd.user_id = u.id
       WHERE pd.document IS NOT NULL AND pd.document <> ''
       ORDER BY pd.created_at DESC
       LIMIT 100`
    ) as any[];

    if (!rows || rows.length === 0) {
      console.log('No uploaded documents found.');
    } else {
      for (const r of rows) {
        console.log(`- id=${r.id} user_id=${r.user_id} email=${r.email || 'N/A'} created_at=${r.created_at}`);
        console.log(`  document=${r.document}`);
        console.log(`  name=${r.document_name} type=${r.type}\n`);
      }
    }

    process.exit(0);
  } catch (err: any) {
    console.error('Error querying DB:', err?.message || err);
    process.exit(2);
  }
}

main();

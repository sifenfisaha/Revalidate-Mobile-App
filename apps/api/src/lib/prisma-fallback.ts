import { prisma } from './prisma';
import { mapUserRow } from '../config/database-mapping';

/**
 * Update `users` row with Prisma and fallback to raw SQL when Prisma fails
 * due to enum parsing (legacy/invalid enum values in the DB).
 *
 * @param userId - string|number|bigint
 * @param data - fields to update (DB column names)
 * @param returnUpdated - whether to return the mapped updated user
 */
export async function updateUsersWithFallback(
  userId: string | number | bigint,
  data: Record<string, any>,
  returnUpdated = false
) {
  // Normalize id to bigint for raw queries
  let idBig: bigint;
  if (typeof userId === 'bigint') {
    idBig = userId;
  } else {
    idBig = BigInt(userId as any);
  }

  try {
    // Try the normal Prisma update (may throw if Prisma cannot parse enums on returned rows)
    const updated = await prisma.users.update({ where: { id: idBig }, data: data as any });
    if (returnUpdated) {
      return mapUserRow(updated as any);
    }
    return;
  } catch (err: any) {
    const msg = String(err?.message || err);
    // Detect enum parsing / unknown request errors referencing enums
    if (msg.includes('not found in enum') || msg.includes('Invalid `prisma.users.update()` invocation')) {
      // Fallback to raw UPDATE to avoid Prisma parsing the full row
      const setClauses: string[] = [];
      const params: any[] = [];
      Object.entries(data).forEach(([key, value]) => {
        setClauses.push(`${key} = ?`);
        params.push(value);
      });
      params.push(idBig);

      await prisma.$executeRawUnsafe(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, ...params);

      if (returnUpdated) {
        const rows = await prisma.$queryRaw<any[]>`SELECT * FROM users WHERE id = ${idBig} LIMIT 1`;
        if (!rows || rows.length === 0) return null;
        return mapUserRow(rows[0]);
      }

      return;
    }

    // Re-throw other errors
    throw err;
  }
}

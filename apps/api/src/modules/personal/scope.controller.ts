import { asyncHandler } from '../../common/middleware/async-handler'
import { prisma } from '../../lib/prisma'
import { Response, Request } from 'express'


export const getScopeOfPracticeList = asyncHandler(async (_req: Request, res: Response) => {
	// Scope-of-practice values are stored in the `brands` table in the seed data.
	// Return id/name/status so frontend can filter by status.
	const scopes = await prisma.brands.findMany({
		select: { id: true, name: true, status: true },
		orderBy: { id: 'asc' },
	})

	const results = scopes.map(s => ({ id: String(s.id), name: s.name, status: s.status }))
	res.json(results)
})

export default getScopeOfPracticeList


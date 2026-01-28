import { Router } from 'express';
import {
  create,
  list,
  getById,
  update,
  remove,
  invite,
  copy,
} from '../modules/calendar/calendar.controller';
import { authenticateToken } from '../modules/auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/events', create);
router.get('/events', list);
router.get('/events/:id', getById);
router.put('/events/:id', update);
router.delete('/events/:id', remove);
router.post('/events/:id/invite', invite);
router.post('/events/:id/copy', copy);

export default router;

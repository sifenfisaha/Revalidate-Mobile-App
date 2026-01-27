import { Router } from 'express';
import { authenticateToken } from '../modules/auth/auth.middleware';
import { listNotifications } from '../modules/notifications/notifications.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', listNotifications);

export default router;

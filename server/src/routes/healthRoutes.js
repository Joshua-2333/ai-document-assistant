// routes/healthRoutes.js
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'AI Document Assistant API is running',
  });
});

export default router;

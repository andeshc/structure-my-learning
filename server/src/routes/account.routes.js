import { Router } from 'express';
import { listUserProviders } from '../db/users.js';

export const accountRouter = Router();

accountRouter.get('/', (req, res) => {
  res.json({
    user: {
      ...req.user,
      providers: listUserProviders(req.user.id)
    }
  });
});

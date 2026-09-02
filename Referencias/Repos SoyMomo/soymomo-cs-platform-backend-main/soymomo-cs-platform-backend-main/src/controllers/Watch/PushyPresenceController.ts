import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { PushyPresenceService } from '../../services/Common/PushyPresenceService';

export const PushyPresenceController: Router = Router();

PushyPresenceController.get(
  '/:watchId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { watchId } = req.params;

      if (!watchId) {
        res.status(400).send({ message: 'watchId is required' });
        return;
      }

      const pushyPresenceService = container.resolve(PushyPresenceService);
      const results = await pushyPresenceService.getPresenceByWearer(watchId);

      if (!results) {
        res.status(404).send({ message: 'Wearer not found' });
        return;
      }

      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

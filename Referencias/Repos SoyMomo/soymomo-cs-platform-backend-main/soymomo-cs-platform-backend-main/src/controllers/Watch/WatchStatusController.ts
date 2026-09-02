import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { WatchStatusService } from '../../services/Watch/WatchStatusService';

export const WatchStatusController: Router = Router();

WatchStatusController.get(
  '/:watchId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { watchId } = req.params;

      if (!watchId) {
        throw new Error('watchId is required');
      }

      const watchStatusService = container.resolve(WatchStatusService);
      const results = await watchStatusService.getInfoByWatch(watchId);
      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

WatchStatusController.get(
  '/:watchId/installed-apps',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { watchId } = req.params;
      if (!watchId) {
        throw new Error('watchId is required');
      }
      const watchStatusService = container.resolve(WatchStatusService);
      const results = await watchStatusService.getEnrichedInstalledAppsByWatch(
        watchId
      );
      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

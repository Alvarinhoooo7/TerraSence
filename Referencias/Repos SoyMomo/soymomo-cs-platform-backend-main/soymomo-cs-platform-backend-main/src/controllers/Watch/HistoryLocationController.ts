import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { HistoryLocationService } from '../../services/Watch/HistoryLocationService';

export const HistoryLocationController: Router = Router();

HistoryLocationController.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      if (!query.deviceId && !query.from && !query.to) {
        res.status(400).send({ message: 'No deviceId, from, and to provided' });
        return;
      }
      const historyLocationService = container.resolve(HistoryLocationService);
      const results = await historyLocationService.getLocationHistory({
        deviceId: query.deviceId as string,
        from: query.from as string,
        to: query.to as string,
      });
      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

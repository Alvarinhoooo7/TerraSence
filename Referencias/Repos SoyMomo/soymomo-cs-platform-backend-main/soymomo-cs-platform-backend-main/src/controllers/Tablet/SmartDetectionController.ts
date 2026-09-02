import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { SmartDetectionService } from '../../services/Tablet/SmartDetectionService';
import { TabletService } from '../../services/Tablet/TabletService';

export const SmartDetectionController: Router = Router();

SmartDetectionController.get(
  '/getDugHistory',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      const { hid, from, to } = query as { [key: string]: string };
      const limit = parseInt(query.limit as string, 10) || 100;
      if (!hid || !from || !to) {
        res.status(400).send({ message: 'No hid, from, and to provided' });
        return;
      }
      const tabletService = container.resolve(TabletService);
      const smartDetectionService = container.resolve(SmartDetectionService);
      const tablet = await tabletService.getTabletByHidOrRecoveryEmail(query);
      if (tablet) {
        const results = await smartDetectionService.getSmartDetections({
          tablet,
          from,
          to,
          limit,
        });
        res.status(200).send({ data: results });
      } else {
        res.status(404).send({ message: 'No tablet found' });
      }
    } catch (e) {
      next(e);
    }
  }
);

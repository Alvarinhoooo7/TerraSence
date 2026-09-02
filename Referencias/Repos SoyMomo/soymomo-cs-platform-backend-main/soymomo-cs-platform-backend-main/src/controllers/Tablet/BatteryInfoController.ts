import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { BatteryInfoService } from '../../services/Tablet/BatteryInfoService';
import { TabletService } from '../../services/Tablet/TabletService';

export const BatteryInfoController: Router = Router();

BatteryInfoController.get(
  '/getBatteryHistory',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      const { from, hid, to } = query as { [key: string]: string };
      if (!hid || !from || !to) {
        res.status(400).send({ message: 'No hid, from, and to provided' });
        return;
      }
      const tabletService = container.resolve(TabletService);
      const batteryInfoService = container.resolve(BatteryInfoService);
      const tablet = await tabletService.getTabletByHidOrRecoveryEmail(query);
      if (tablet) {
        const results = await batteryInfoService.getBatteryHistory({
          tablet,
          from,
          to,
        });
        res.status(200).send({ data: results });
      } else {
        res.status(204).send({ message: 'No tablet found' });
      }
    } catch (e) {
      next(e);
    }
  }
);

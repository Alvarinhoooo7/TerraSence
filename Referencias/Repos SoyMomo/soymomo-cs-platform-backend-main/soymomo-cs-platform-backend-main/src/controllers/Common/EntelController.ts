import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { EntelService } from '../../services/Common/EntelService';

export const EntelController: Router = Router();

EntelController.post(
  '/fetch-device',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { iccId } = req.body;

      if (!iccId) {
        res.status(400).json({
          error: 'ICCID is required',
        });
        return;
      }

      const entelService = container.resolve(EntelService);
      const deviceData = await entelService.fetchDevice(iccId);

      res.json({
        status: 'OK',
        data: deviceData,
      });
    } catch (error) {
      next(error);
    }
  }
);

EntelController.get(
  '/audit-history/:iccId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { iccId } = req.params;

      if (!iccId) {
        res.status(400).json({
          error: 'ICCID is required',
        });
        return;
      }

      const entelService = container.resolve(EntelService);
      const auditData = await entelService.getAuditHistory(iccId);

      res.json({
        status: 'OK',
        data: auditData,
      });
    } catch (error) {
      next(error);
    }
  }
);

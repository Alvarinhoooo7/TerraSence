import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { TabletSimService } from '../../services/Tablet/TabletSimService';
import { TabletSubscriptionService } from '../../services/Tablet/TabletSubscriptionService';

export const TabletSimController: Router = Router();

TabletSimController.get(
  '/searchTabletSims',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      const body = query;
      if (!body.queryStr) {
        res.status(400).send({ message: 'No information provided' });
        return;
      }
      const tabletSimService = container.resolve(TabletSimService);
      const results = await tabletSimService.getTabletSimByString(body);
      if (
        !results ||
        (!results.simResults && !results.subResults) ||
        (results.simResults.length === 0 && !results.subResults) ||
        (!results.simResults && results.subResults.length === 0) ||
        (results.simResults.length === 0 && results.subResults.length === 0)
      ) {
        res.status(204).send({ message: 'No Tablet Sim found' });
        return;
      }

      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

TabletSimController.get(
  '/tabletSimInfo',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      const body = query;
      const objectId = body.objectId as string | undefined;
      const iccId = body.iccId as string | undefined;
      const imei = body.imei as string | undefined;

      if (!objectId && !iccId && !imei) {
        res.status(400).send({
          message: 'No subscription objectId, iccId, or imei provided',
        });
        return;
      }

      if (
        (typeof objectId !== 'string' && objectId) ||
        (typeof imei !== 'string' && imei) ||
        (typeof iccId !== 'string' && iccId)
      ) {
        res.status(400).send({
          message: 'Subscription Object ID, Imei and iccId must be a string',
          data: null,
        });
        return;
      }

      const tabletSubscriptionService = container.resolve(
        TabletSubscriptionService
      );
      const subResults = await tabletSubscriptionService.getTabletSIMInfo({
        objectId,
        imei,
        iccId,
      });
      const results = subResults;

      let simResults;
      if (!subResults || subResults.length === 0) {
        if (iccId) {
          const tabletSimService = container.resolve(TabletSimService);
          simResults = await tabletSimService.getTabletSIMInfo(iccId);
        }
        if (!simResults || simResults.length === 0) {
          res.status(204).send({
            data: { results: [] },
          });
          return;
        }
        const response = {
          results: simResults.map((result) => ({
            ...result.toJSON(),
            instance: 'tablet',
            type: 'sim',
          })),
        };
        res.status(200).send({ data: response });
        return;
      }

      const response = {
        results: results.map((result) => ({
          ...result.toJSON(),
          instance: 'tablet',
          type: 'subscription',
        })),
      };

      res.status(200).send({ data: response });
    } catch (error) {
      next(error);
    }
  }
);

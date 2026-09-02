import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import type Sim from '@/models/Watch/Sim';

import type Subscription from '../../models/Watch/Subscription';
import SimService from '../../services/Watch/SimService';
import SubscriptionService from '../../services/Watch/SubscriptionService';

export const SimController: Router = Router();

SimController.get(
  '/searchSims',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      const body = query;
      if (!body.queryStr) {
        res.status(400).send({ message: 'No information provided' });
        return;
      }
      const simService = container.resolve(SimService);
      const results = await simService.getSimByString(body);
      if (
        !results ||
        (!results.simResults && !results.subResults) ||
        (results.simResults.length === 0 && !results.subResults) ||
        (!results.simResults && results.subResults.length === 0) ||
        (results.simResults.length === 0 && results.subResults.length === 0)
      ) {
        res.status(204).send({ message: 'No Sim found' });
        return;
      }

      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

SimController.get(
  '/simInfo',
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

      const subscriptionService = container.resolve(SubscriptionService);
      const subResults = await subscriptionService.getSIMInfo({
        objectId,
        imei,
        iccId,
      });
      const results = subResults;

      let simResults;
      if (!subResults || subResults.length === 0) {
        if (iccId) {
          const simService = container.resolve(SimService);
          simResults = await simService.getSIMInfo(iccId);
        }
        if (!simResults || simResults.length === 0) {
          res.status(204).send({
            data: { results: [], remainingTrialDays: 0, type: 'None' },
          });
          return;
        }
        const response: {
          results: Sim[];
          remainingTrialDays: number;
          type: string;
        } = {
          results: simResults,
          remainingTrialDays: 0,
          type: 'Sim',
        };
        res.status(200).send({ data: response });
        return;
      }

      const response: {
        results: Subscription[];
        remainingTrialDays: number;
        type: string;
      } = {
        results,
        remainingTrialDays: -1,
        type: 'Sub',
      };

      if (results.length !== 0 && results[0]) {
        const startDate = new Date(results[0].plan.createdAt);
        const currentDate = new Date();
        const diffInTime = currentDate.getTime() - startDate.getTime();
        const diffInDays = Math.floor(diffInTime / (1000 * 60 * 60 * 24));
        const remaining = Math.max(
          0,
          Number(results[0].plan.toJSON().trialDays) - diffInDays
        );
        response.remainingTrialDays = remaining;
      }

      res.status(200).send({ data: response });
    } catch (error) {
      next(error);
    }
  }
);

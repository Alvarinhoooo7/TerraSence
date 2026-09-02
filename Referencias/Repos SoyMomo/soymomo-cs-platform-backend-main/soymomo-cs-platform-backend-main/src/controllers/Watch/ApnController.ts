import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { ActionError } from '../../interfaces/ActionError';
import { ApnService } from '../../services/Watch/ApnService';

export const ApnController: Router = Router();

/**
 * Igual que en ConnectivityController: la app no tiene error handler global,
 * asi que next(e) devolveria un HTML 500 y la card no podria distinguir
 * "reloj sin token" de "cloud function caida".
 */
function sendActionError(res: Response, error: unknown, next: NextFunction) {
  if (error instanceof ActionError) {
    res.status(error.status).send({ message: error.message, code: error.code });
    return;
  }
  next(error);
}

/**
 * Va antes de '/:watchId' a proposito: Express matchea en orden y si no,
 * 'countries' entraria como watchId.
 */
ApnController.get(
  '/countries',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const service = container.resolve(ApnService);
      const results = await service.getCountries();
      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

ApnController.get(
  '/:watchId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { watchId } = req.params;
      const { country } = req.query;

      if (!watchId) {
        res.status(400).send({ message: 'watchId is required' });
        return;
      }

      const service = container.resolve(ApnService);
      const results = await service.getCatalog(
        watchId,
        typeof country === 'string' && country ? country : undefined
      );

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

ApnController.post(
  '/send',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { watchId, apnId } = req.body;

      if (!watchId || !apnId) {
        res.status(400).send({ message: 'watchId and apnId are required' });
        return;
      }

      const service = container.resolve(ApnService);
      const result = await service.sendApn(watchId, apnId);
      res.status(200).send({ data: result });
    } catch (e) {
      sendActionError(res, e, next);
    }
  }
);

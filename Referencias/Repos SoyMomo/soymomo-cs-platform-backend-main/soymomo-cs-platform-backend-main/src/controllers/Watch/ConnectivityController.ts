import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { ConnectivityActionError } from '../../interfaces/WatchConnectivityIfcs';
import { WatchConnectivityService } from '../../services/Watch/WatchConnectivityService';

export const ConnectivityController: Router = Router();

/**
 * Las acciones responden JSON explicito en vez de delegar en next(e): la app no
 * tiene error handler global, asi que next(e) devolveria un HTML 500 y la card
 * no podria distinguir "reloj offline" de "Pushy caido".
 */
function sendActionError(res: Response, error: unknown, next: NextFunction) {
  if (error instanceof ConnectivityActionError) {
    res.status(error.status).send({ message: error.message, code: error.code });
    return;
  }
  next(error);
}

ConnectivityController.get(
  '/:watchId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { watchId } = req.params;

      if (!watchId) {
        res.status(400).send({ message: 'watchId is required' });
        return;
      }

      const service = container.resolve(WatchConnectivityService);
      const results = await service.getDiagnosis(watchId);

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

ConnectivityController.post(
  '/space2/repush-credentials',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { watchId } = req.body;

      if (!watchId) {
        res.status(400).send({ message: 'watchId is required' });
        return;
      }

      const service = container.resolve(WatchConnectivityService);
      const result = await service.repushSpace2Credentials(watchId);
      res.status(200).send({ data: result });
    } catch (e) {
      sendActionError(res, e, next);
    }
  }
);

ConnectivityController.post(
  '/space34/install-auth-manager',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { watchId } = req.body;

      if (!watchId) {
        res.status(400).send({ message: 'watchId is required' });
        return;
      }

      const service = container.resolve(WatchConnectivityService);
      const result = await service.installAuthManagerApk(watchId);
      res.status(200).send({ data: result });
    } catch (e) {
      sendActionError(res, e, next);
    }
  }
);

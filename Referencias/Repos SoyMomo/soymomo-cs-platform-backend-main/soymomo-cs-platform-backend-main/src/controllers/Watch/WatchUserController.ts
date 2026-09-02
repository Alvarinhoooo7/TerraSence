import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import type WatchUser from '../../models/Watch/WatchUser';
import { WatchUserService } from '../../services/Watch/WatchUserService';

export const WatchUserController: Router = Router();

WatchUserController.get(
  '/',
  async (_: Request, res: Response, next: NextFunction) => {
    try {
      const watchUserService = container.resolve(WatchUserService);
      const results = await watchUserService.getWatchUsers();
      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

WatchUserController.get(
  '/getWatchUserByEmailOrDeviceIdOrImei',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      if (!query.deviceId && !query.email && !query.imei) {
        res
          .status(400)
          .send({ message: 'No deviceId, email, or imei provided' });
        return;
      }
      const watchUserService = container.resolve(WatchUserService);
      const results =
        await watchUserService.getWatchUserByEmailOrDeviceIdOrImei(query);
      if (!results || results.length === 0) {
        res.status(204).send({ message: 'No watch user found' });
        return;
      }
      const users = results.map((watchUser: WatchUser) => {
        const user = watchUser.user.toJSON();
        return user;
      });
      res.status(200).send({ data: { results, users } });
    } catch (e) {
      next(e);
    }
  }
);

WatchUserController.put(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;

      if (!body.objectId || body.active === undefined) {
        res.status(400).send({ message: 'No objectId or status provided' });
        return;
      }
      const watchUserService = container.resolve(WatchUserService);
      await watchUserService.updateWatchUser({
        reqId: body.objectId,
        accepted: body.active,
      });
      res.status(200).send({ message: 'Watch user updated' });
    } catch (e) {
      next(e);
    }
  }
);

WatchUserController.delete(
  '/deleteWatchUser',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      if (!query.objectId || typeof query.objectId !== 'string') {
        res.status(400).send({ message: 'No objectId provided' });
        return;
      }
      const watchUserService = container.resolve(WatchUserService);
      const watchUser = await watchUserService.getWatchUserByObjectId(
        query.objectId
      );
      if (!watchUser) {
        res.status(204).send({ message: 'No watch user found' });
        return;
      }
      const { user, watch } = watchUser;
      if (!user || !watch) {
        res
          .status(204)
          .send({ message: 'No user or watch found in watchUser' });
        return;
      }
      if (user.id === watch.userInCharge.id) {
        res.status(400).send({
          message: 'Cannot delete admin user',
        });
        return;
      }
      await watchUser.destroy({ useMasterKey: true });
      res.status(200).send({ message: 'Watch user deleted' });
    } catch (e) {
      next(e);
    }
  }
);

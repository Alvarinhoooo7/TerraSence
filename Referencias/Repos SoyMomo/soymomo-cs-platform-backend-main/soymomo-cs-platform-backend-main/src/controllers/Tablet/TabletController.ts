import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { TabletService } from '../../services/Tablet/TabletService';

export const TabletController: Router = Router();

TabletController.get(
  '/getTabletByHidOrRecoveryEmail',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      if (!query.hid && !query.recoveryEmail && !query.objectId) {
        res
          .status(400)
          .send({ message: 'No recoveryEmail or hid or objectId provided' });
        return;
      }
      const tabletService = container.resolve(TabletService);
      const result = await tabletService.getTabletByHidOrRecoveryEmail(query);
      if (result) {
        res.status(200).send({ data: result });
      } else {
        res.status(204).send({ message: 'No tablet found' });
      }
    } catch (e) {
      next(e);
    }
  }
);

TabletController.get(
  '/searchTablets',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      if (!query.queryStr) {
        res.status(400).send({ message: 'No queryStr provided' });
        return;
      }
      const tabletService = container.resolve(TabletService);
      const results = await tabletService.searchTablets(query);
      if (!results || results.length === 0) {
        res.status(204).send({ message: 'No tablet found' });
        return;
      }
      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

TabletController.get(
  '/getTabletInstalledApps',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      if (!query.objectId) {
        res.status(400).send({ message: 'No objectId provided' });
        return;
      }
      const tabletService = container.resolve(TabletService);
      const result = await tabletService.getTabletInstalledApps(query);
      if (result) {
        res.status(200).send({ data: result });
      } else {
        res.status(204).send({ message: 'No tablet found' });
      }
    } catch (e) {
      next(e);
    }
  }
);

TabletController.post(
  '/pushCommand',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { objectId, command, ...params } = req.body;

      if (!objectId || !command) {
        res.status(400).send({ message: 'No objectId or command provided' });
        return;
      }

      const tabletService = container.resolve(TabletService);
      const result = await tabletService.handlePushCommand({
        objectId,
        command,
        params,
      });

      if (result) {
        res.status(200).send({ data: result });
      } else {
        res.status(204).send({ message: 'No tablet found' });
      }
    } catch (e) {
      next(e);
    }
  }
);

TabletController.post(
  '/updateTabletUserInformation',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.hid) {
        res.status(400).send({ message: 'No hid provided' });
        return;
      }
      const tabletService = container.resolve(TabletService);
      const results = await tabletService.updateTabletUserInformation(body);
      if (!results) {
        res.status(204).send({ data: 'No tablet found' });
        return;
      }
      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

TabletController.post(
  '/updateParentalControlSettings',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.hid) {
        res.status(400).send({ message: 'No hid provided' });
        return;
      }
      const tabletService = container.resolve(TabletService);
      const results = await tabletService.updateParentalControlSettings(body);
      if (!results) {
        res.status(204).send({ data: 'No tablet found' });
        return;
      }
      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

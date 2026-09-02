import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import type TabletUser from '../../models/Tablet/TabletUser';
import { TabletUserService } from '../../services/Tablet/TabletUserService';

export const TabletUserController: Router = Router();

TabletUserController.get(
  '/',
  async (_: Request, res: Response, next: NextFunction) => {
    try {
      const tabletUserService = container.resolve(TabletUserService);
      const results: TabletUser[] = await tabletUserService.getTabletUsers();
      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

TabletUserController.get(
  '/getTabletUserByHidOrRecoveryEmail',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      if (!query.hid && !query.recoveryEmail) {
        res.status(400).send({ message: 'No hid or recoveryEmail provided' });
        return;
      }
      const tabletUserService = container.resolve(TabletUserService);
      const results = await tabletUserService.getTabletUserByHidOrRecoveryEmail(
        query
      );
      let finalResponse;
      if (results.length > 0) {
        finalResponse = results.map((tabletUser: TabletUser) => {
          const user = tabletUser.get('user');
          const mapResult = {
            user: null,
            tabletUser: tabletUser.toJSON(),
          };
          if (user) {
            mapResult.user = user.toJSON();
          }
          return mapResult;
        });
      }

      if (finalResponse) {
        res.status(200).send({ data: finalResponse });
      } else {
        res.status(204).send({ message: 'No tabletUsers found' });
      }
    } catch (e) {
      next(e);
    }
  }
);

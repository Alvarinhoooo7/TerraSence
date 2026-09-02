import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { ChatUserService } from '../../services/Watch/ChatUserService';

export const ChatUserController: Router = Router();

ChatUserController.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      if (!query.deviceId && !query.imei && !query.objectId) {
        res.status(400).send({
          message:
            'You must provide at least one of deviceId, imei, or objectId as a query parameter.',
        });
        return;
      }
      const chatUserService = container.resolve(ChatUserService);
      const results = await chatUserService.getChatUser(query);

      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

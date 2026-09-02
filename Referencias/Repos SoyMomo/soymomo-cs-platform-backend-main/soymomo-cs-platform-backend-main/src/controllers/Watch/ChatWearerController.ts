import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import type ChatWearer from '../../models/Watch/ChatWearer';
import { ChatWearerService } from '../../services/Watch/ChatWearerService';

export const ChatWearerController: Router = Router();

ChatWearerController.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      if (!query.deviceId && !query.imei && !query.objectId) {
        res.status(400).send({ message: 'No deviceId, from, and to provided' });
        return;
      }
      const chatWearerService = container.resolve(ChatWearerService);
      const results = await chatWearerService.getChatUser(query);
      let finalResponse;
      if (results.length > 0) {
        finalResponse = results.map((chatWearer: ChatWearer) => {
          const sender = chatWearer.get('sender');
          const mapResult = {
            sender: null,
            chatWearer: chatWearer.toJSON(),
          };
          if (sender) {
            mapResult.sender = sender.toJSON();
          }
          return mapResult;
        });
      }
      res.status(200).send({ data: finalResponse ?? [] });
    } catch (e) {
      next(e);
    }
  }
);

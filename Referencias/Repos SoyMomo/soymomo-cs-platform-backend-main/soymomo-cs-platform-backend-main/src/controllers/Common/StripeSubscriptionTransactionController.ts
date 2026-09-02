import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { StripeSubscriptionTransactionService } from '../../services/Common/StripeSubscriptionTransactionService';

export const StripeSubscriptionTransactionController: Router = Router();

StripeSubscriptionTransactionController.get(
  '/stripe/subscriptions/:subscriptionId/transactions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subscriptionId } = req.params;

      const createdGte =
        typeof req.query.createdGte === 'string'
          ? Number(req.query.createdGte)
          : undefined;
      const createdLte =
        typeof req.query.createdLte === 'string'
          ? Number(req.query.createdLte)
          : undefined;

      if (!subscriptionId) {
        res.status(400).json({ error: 'Subscription ID is required' });
        return;
      }

      if (createdGte != null && Number.isNaN(createdGte)) {
        res
          .status(400)
          .json({ error: 'createdGte must be a number (unix seconds)' });
        return;
      }
      if (createdLte != null && Number.isNaN(createdLte)) {
        res
          .status(400)
          .json({ error: 'createdLte must be a number (unix seconds)' });
        return;
      }

      const service = container.resolve(StripeSubscriptionTransactionService);
      const { store, transactions } = await service.getSubscriptionTransactions(
        subscriptionId,
        { createdGte, createdLte }
      );

      res.json({
        status: 'OK',
        data: {
          store,
          storeDomain: store === 'store1' ? 'soymomo.us' : 'soymomo.es',
          transactions,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

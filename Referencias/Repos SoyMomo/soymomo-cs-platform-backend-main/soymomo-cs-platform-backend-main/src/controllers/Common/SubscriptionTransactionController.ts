import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { SubscriptionTransactionService } from '../../services/Common/SubscriptionTransactionService';

export const SubscriptionTransactionController: Router = Router();

SubscriptionTransactionController.get(
  '/subscriptions/:subscriptionId/transactions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subscriptionId } = req.params;

      if (!subscriptionId) {
        res.status(400).json({
          error: 'Subscription ID is required',
        });
        return;
      }

      const transactionService = container.resolve(
        SubscriptionTransactionService
      );
      const transactions =
        await transactionService.getAllSubscriptionTransactions(subscriptionId);

      res.json({
        status: 'OK',
        data: {
          transactions,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

import axios from 'axios';
import { injectable } from 'tsyringe';

import type {
  ApioTransactionDocument,
  ApioTransactionResponse,
  TransactionSummary,
} from '../../interfaces/ApioTransactionIfcs';

@injectable()
export class SubscriptionTransactionService {
  private readonly API_URL: string;

  private readonly APIO_KEY: string;

  constructor() {
    const apiUrl = process.env.APIO_API_URL;
    const apiKey = process.env.APIO_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error(
        `Missing required Apio API configuration: ${
          !apiUrl ? 'APIO_API_URL' : ''
        } ${!apiKey ? 'APIO_API_KEY' : ''}`.trim()
      );
    }

    this.API_URL = apiUrl;
    this.APIO_KEY = apiKey;
  }

  private async makeApioRequest<T>(method: string, url: string): Promise<T> {
    try {
      const response = await axios({
        method,
        url: `${this.API_URL}/${url}`,
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          apiKey: this.APIO_KEY,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          `Apio API Error: ${error.response.status} - ${JSON.stringify(
            error.response.data
          )}`
        );
      }
      throw error;
    }
  }

  private mapTransactionToSummary(
    transaction: ApioTransactionDocument
  ): TransactionSummary {
    return {
      // eslint-disable-next-line no-underscore-dangle
      id: transaction._id.toString(),
      status: transaction.status,
      amount: transaction.grossAmount,
      // Apio amounts are already represented in the business currency units.
      amountDecimal: transaction.grossAmount,
      currency: transaction.currency,
      paymentAttemptDate: transaction.createdAt,
      productName: transaction.products[0]?.name || 'Unknown Product',
    };
  }

  async getAllSubscriptionTransactions(
    subscriptionId: string
  ): Promise<TransactionSummary[]> {
    const allTransactions: TransactionSummary[] = [];
    let nextPage = 1;

    const fetchAllPages = async (): Promise<void> => {
      const response = await this.makeApioRequest<ApioTransactionResponse>(
        'GET',
        `transactions/subscription/${subscriptionId}?page=${nextPage}`
      );

      const pageTransactions = response.data.docs.map(
        this.mapTransactionToSummary
      );
      allTransactions.push(...pageTransactions);

      if (response.data.hasNextPage) {
        nextPage += 1;
        await fetchAllPages();
      }
    };

    await fetchAllPages();
    return allTransactions;
  }
}

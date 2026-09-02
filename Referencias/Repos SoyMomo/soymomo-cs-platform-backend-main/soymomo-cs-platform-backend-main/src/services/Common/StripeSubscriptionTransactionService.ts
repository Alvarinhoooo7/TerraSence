import axios from 'axios';
import { injectable } from 'tsyringe';

import type { TransactionSummary } from '../../interfaces/ApioTransactionIfcs';

type StripeStore = 'store1' | 'store2';

type StripeListResponse<T> = {
  data: T[];
  has_more: boolean;
};

type StripeErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

type StripeCustomer = {
  id: string;
};

type StripeProduct = { name?: string | null };

type StripeSubscription = {
  id: string;
  customer: string | StripeCustomer;
  items?: {
    data?: Array<{
      price?: {
        product?: string | StripeProduct;
      };
    }>;
  };
};

type StripeInvoice = {
  id: string;
  created: number; // unix seconds
  status?: string | null;
  paid?: boolean | null;
  currency: string;
  total: number | null;
};

@injectable()
export class StripeSubscriptionTransactionService {
  private readonly API_URL: string;

  private readonly STORE1_KEY: string;

  private readonly STORE2_KEY: string;

  constructor() {
    this.API_URL = process.env.STRIPE_API_URL || 'https://api.stripe.com/v1';

    const store1 = process.env.STRIPE_SECRET_KEY_STORE_US;
    const store2 = process.env.STRIPE_SECRET_KEY_STORE_ES;

    if (!store1 || !store2) {
      throw new Error(
        `Missing required Stripe configuration: ${
          !store1 ? 'STRIPE_SECRET_KEY_STORE_US' : ''
        } ${!store2 ? 'STRIPE_SECRET_KEY_STORE_ES' : ''}`.trim()
      );
    }

    this.STORE1_KEY = store1;
    this.STORE2_KEY = store2;
  }

  private isResourceMissing(err: unknown): boolean {
    const status = (err as any)?.response?.status;
    const data = (err as any)?.response?.data as StripeErrorPayload | undefined;
    return status === 404 && data?.error?.code === 'resource_missing';
  }

  private async stripeGet<T>(
    storeKey: string,
    path: string,
    params?: Record<string, any>
  ): Promise<T> {
    const response = await axios({
      method: 'GET',
      url: `${this.API_URL}${path.startsWith('/') ? '' : '/'}${path}`,
      headers: {
        Authorization: `Bearer ${storeKey}`,
      },
      params,
    });
    return response.data as T;
  }

  private async resolveStoreForSubscription(
    subscriptionId: string
  ): Promise<{ store: StripeStore; subscription: StripeSubscription }> {
    const expand = ['customer', 'items.data.price.product'];

    try {
      const subscription = await this.stripeGet<StripeSubscription>(
        this.STORE1_KEY,
        `/subscriptions/${subscriptionId}`,
        { expand }
      );
      return { store: 'store1', subscription };
    } catch (err) {
      if (!this.isResourceMissing(err)) throw err;
    }

    const subscription = await this.stripeGet<StripeSubscription>(
      this.STORE2_KEY,
      `/subscriptions/${subscriptionId}`,
      { expand }
    );
    return { store: 'store2', subscription };
  }

  private getProductName(subscription: StripeSubscription): string {
    const firstProduct =
      subscription.items?.data?.[0]?.price?.product ?? undefined;

    if (firstProduct && typeof firstProduct === 'object') {
      return firstProduct.name || 'Unknown Product';
    }

    return 'Unknown Product';
  }

  private normalizeInvoiceStatus(invoice: StripeInvoice): string {
    if (invoice.paid === true || invoice.status === 'paid') return 'paid';
    if (invoice.status === 'void' || invoice.status === 'uncollectible')
      return 'failed';
    if (invoice.status === 'open' || invoice.status === 'draft')
      return 'pending';
    return invoice.status || 'unknown';
  }

  private currencyMinorUnitDecimals(currency: string): number {
    // Stripe uses minor units for most currencies, but some are zero-decimal.
    // Keep a small safe list; default to 2.
    // https://docs.stripe.com/currencies#zero-decimal
    const zeroDecimal = new Set([
      'bif',
      'clp',
      'djf',
      'gnf',
      'jpy',
      'kmf',
      'krw',
      'mga',
      'pyg',
      'rwf',
      'ugx',
      'vnd',
      'vuv',
      'xaf',
      'xof',
      'xpf',
    ]);
    const cur = currency.toLowerCase();
    if (zeroDecimal.has(cur)) return 0;
    return 2;
  }

  private minorToDecimal(amountMinor: number, currency: string): number {
    const decimals = this.currencyMinorUnitDecimals(currency);
    return amountMinor / 10 ** decimals;
  }

  private async listAllInvoicesForSubscription(
    storeKey: string,
    subscriptionId: string,
    opts?: { createdGte?: number; createdLte?: number; maxInvoices?: number }
  ): Promise<StripeInvoice[]> {
    const maxInvoices = opts?.maxInvoices ?? 500;
    const invoices: StripeInvoice[] = [];
    let startingAfter: string | undefined;

    // Stripe returns newest-first by default.
    // https://docs.stripe.com/api/invoices/list
    const created =
      opts?.createdGte != null || opts?.createdLte != null
        ? {
            ...(opts?.createdGte != null ? { gte: opts.createdGte } : {}),
            ...(opts?.createdLte != null ? { lte: opts.createdLte } : {}),
          }
        : undefined;

    const fetchNextPage = async (): Promise<void> => {
      if (invoices.length >= maxInvoices) return;

      const page = await this.stripeGet<StripeListResponse<StripeInvoice>>(
        storeKey,
        '/invoices',
        {
          subscription: subscriptionId,
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
          ...(created ? { created } : {}),
        }
      );

      invoices.push(...page.data);
      if (!page.has_more || page.data.length === 0) return;

      const last = page.data.at(-1);
      if (!last) return;
      startingAfter = last.id;

      await fetchNextPage();
    };

    await fetchNextPage();

    return invoices.slice(0, maxInvoices);
  }

  async getSubscriptionTransactions(
    subscriptionId: string,
    opts?: { createdGte?: number; createdLte?: number }
  ): Promise<{ store: StripeStore; transactions: TransactionSummary[] }> {
    const { store, subscription } = await this.resolveStoreForSubscription(
      subscriptionId
    );

    const storeKey = store === 'store1' ? this.STORE1_KEY : this.STORE2_KEY;
    const invoices = await this.listAllInvoicesForSubscription(
      storeKey,
      subscriptionId,
      { createdGte: opts?.createdGte, createdLte: opts?.createdLte }
    );

    const productName = this.getProductName(subscription);

    const transactions: TransactionSummary[] = invoices.map((inv) => ({
      id: inv.id,
      status: this.normalizeInvoiceStatus(inv),
      amount: inv.total ?? 0,
      amountDecimal: this.minorToDecimal(inv.total ?? 0, inv.currency),
      currency: inv.currency,
      paymentAttemptDate: new Date(inv.created * 1000).toISOString(),
      productName,
    }));

    return { store, transactions };
  }
}

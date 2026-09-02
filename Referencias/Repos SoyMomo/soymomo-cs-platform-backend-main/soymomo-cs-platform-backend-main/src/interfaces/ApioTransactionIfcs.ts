export interface ApioTransactionProduct {
  name: string;
}

export interface ApioTransactionDocument {
  // eslint-disable-next-line no-underscore-dangle
  _id: string;
  status: string;
  grossAmount: number;
  currency: string;
  payday: string;
  products: ApioTransactionProduct[];
  createdAt: string;
}

export interface ApioTransactionResponse {
  data: {
    docs: ApioTransactionDocument[];
    hasNextPage: boolean;
  };
}

export interface TransactionSummary {
  id: string;
  status: string;
  amount: number;
  amountDecimal?: number;
  currency: string;
  paymentAttemptDate: string;
  productName: string;
}

// export interface SubscriptionUser {
//   lastname: string;
//   ACL: string;
//   city: string;
//   name: string;
//   user: User;
//   phone: string;
//   updatedAt: Date;
//   state: string;
//   gigsUserId: string;
//   address: string;
//   alaiSubscriberId?: string;
//   gigsSubscriberId?: string;
//   country: string;
//   postalCode: string;
//   createdAt: Date;
//   personalId: string;
//   email: string;
//   birthday: string;
// }

export interface Plan {
  planNameId: string;
  isActvie: boolean;
  trialDays: number;
  title: string;
  createdAt: Date;
  remainingTrialDays: number;
  toJSON(): { trialDays: number };
}

export interface MnoProvider {
  name: string;
  country: string;
}

export interface SimSub {
  objectId: string;
  iccId: string;
  personalId: string;
  phone: string;
  firstName: string;
  lastName: string;
}

export interface StripeCredentials {
  stripeSubscriptionId: string;
}

export interface ApioCredentials {
  apioSubscriptionId: string;
}

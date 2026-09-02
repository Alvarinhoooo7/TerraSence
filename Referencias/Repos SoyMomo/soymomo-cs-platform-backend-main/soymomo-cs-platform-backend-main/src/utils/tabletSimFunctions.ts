import Parse from 'parse/node';

import TabletSubscription from '../models/Tablet/TabletSubscription';

// 🔹 OPTIMIZATION: Common query builder function to reduce code duplication
function buildTabletSubscriptionQuery(
  limit: number = 50
): Parse.Query<TabletSubscription> {
  const query = new Parse.Query(TabletSubscription);
  query.include('subscriber');
  query.include('sim');
  query.include('sim.mnoProvider');
  query.include('sim.networkOperator');
  query.include('plan');
  query.include('stripeCredentials');
  query.include('apioCredentials');
  query.limit(limit);
  query.descending('updatedAt');
  query.select(
    'objectId',
    'iccId',
    'imei',
    'status',
    'msisdn',
    'plan',
    'sim',
    'sim.mnoProvider',
    'sim.networkOperator',
    'paymentProvider',
    'subscriber',
    'gigsSubscriptionId',
    'alaiSubscriptionId',
    'isActive',
    'startDate',
    'cancellationExplanation',
    'stripeCredentials',
    'apioCredentials'
  );
  return query;
}

export async function findTabletSubscriptionByName(
  name: string,
  limit: number = 50
): Promise<TabletSubscription[]> {
  const query = buildTabletSubscriptionQuery(limit);

  const subscriberQuery = new Parse.Query('SubscriptionsUserInfo');
  subscriberQuery.matches('name', new RegExp(name, 'i'));
  subscriberQuery.limit(limit);
  query.matchesQuery('subscriber', subscriberQuery);

  const results = await query.find({ useMasterKey: true });
  return results;
}

export async function findTabletSubscriptionByLastname(
  lastname: string,
  limit: number = 50
): Promise<TabletSubscription[]> {
  const query = buildTabletSubscriptionQuery(limit);

  const subscriberQuery = new Parse.Query('SubscriptionsUserInfo');
  subscriberQuery.matches('lastname', new RegExp(lastname, 'i'));
  subscriberQuery.limit(limit);
  query.matchesQuery('subscriber', subscriberQuery);

  const results = await query.find({ useMasterKey: true });
  return results;
}

export async function findTabletSubscriptionByEmail(
  email: string,
  limit: number = 50
): Promise<TabletSubscription[]> {
  const query = buildTabletSubscriptionQuery(limit);

  const subscriberQuery = new Parse.Query('SubscriptionsUserInfo');
  subscriberQuery.matches('email', new RegExp(email, 'i'));
  subscriberQuery.limit(limit);
  query.matchesQuery('subscriber', subscriberQuery);

  const results = await query.find({ useMasterKey: true });
  return results;
}

// 🔹 OPTIMIZATION: New consolidated search function for better performance
export async function findTabletSubscriptionByMultipleCriteria(
  searchString: string,
  limit: number = 50
): Promise<TabletSubscription[]> {
  const query = buildTabletSubscriptionQuery(limit);

  // Use OR query to search across multiple fields in a single query
  const nameQuery = new Parse.Query('SubscriptionsUserInfo');
  nameQuery.matches('name', new RegExp(searchString, 'i'));

  const lastNameQuery = new Parse.Query('SubscriptionsUserInfo');
  lastNameQuery.matches('lastname', new RegExp(searchString, 'i'));

  const emailQuery = new Parse.Query('SubscriptionsUserInfo');
  emailQuery.matches('email', new RegExp(searchString, 'i'));

  const combinedUserQuery = Parse.Query.or(
    nameQuery,
    lastNameQuery,
    emailQuery
  );
  combinedUserQuery.limit(limit);

  query.matchesQuery('subscriber', combinedUserQuery);

  const results = await query.find({ useMasterKey: true });
  return results;
}

export function mergeTabletSubscriptionsWithoutDuplicates(
  ...arraysOfSubscriptions: TabletSubscription[][]
): TabletSubscription[] {
  const allSubscriptions: TabletSubscription[] = (
    [] as TabletSubscription[]
  ).concat(...arraysOfSubscriptions);
  const uniqueSubscriptions = new Map<string, TabletSubscription>();

  for (const subscription of allSubscriptions) {
    uniqueSubscriptions.set(subscription.iccId, subscription);
  }

  return Array.from(uniqueSubscriptions.values());
}

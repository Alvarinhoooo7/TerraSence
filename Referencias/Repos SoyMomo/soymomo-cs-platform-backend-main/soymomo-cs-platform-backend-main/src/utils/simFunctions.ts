import Parse from 'parse/node';

import type Subscription from '@/models/Watch/Subscription';

export async function findSubscriptionByName(
  searchString: string
): Promise<Subscription[]> {
  // Query for the SubscriptionsUserInfo to find matching names
  const userInfoQuery = new Parse.Query('SubscriptionsUserInfo');
  userInfoQuery.contains('name', searchString);

  // Query for the Subscription that matches the userInfoQuery
  const subscriptionQuery = new Parse.Query('Subscription');
  subscriptionQuery.matchesQuery('subscriber', userInfoQuery);
  subscriptionQuery.include('subscriber');

  subscriptionQuery.descending('updatedAt');
  subscriptionQuery.select(
    'objectId',
    'msisdn',
    'iccId',
    'subscriber.personalId',
    'subscriber.phone',
    'subscriber.name',
    'subscriber.lastname',
    'status'
  );

  const matchingSubscriptions = (await subscriptionQuery.find({
    useMasterKey: true,
  })) as Subscription[];
  if (matchingSubscriptions.length > 0) {
    return matchingSubscriptions;
  }
  return [];
}

export async function findSubscriptionByPhone(
  searchString: string
): Promise<Subscription[]> {
  // Query for the SubscriptionsUserInfo to find matching names
  const userInfoQuery = new Parse.Query('SubscriptionsUserInfo');
  userInfoQuery.contains('phone', searchString);

  // Query for the Subscription that matches the userInfoQuery
  const subscriptionQuery = new Parse.Query('Subscription');
  subscriptionQuery.matchesQuery('subscriber', userInfoQuery);

  subscriptionQuery.include('subscriber');

  subscriptionQuery.descending('updatedAt');
  subscriptionQuery.select(
    'objectId',
    'msisdn',
    'iccId',
    'subscriber.personalId',
    'subscriber.phone',
    'subscriber.name',
    'subscriber.lastname',
    'status'
  );

  const matchingSubscriptions = (await subscriptionQuery.find({
    useMasterKey: true,
  })) as Subscription[];
  if (matchingSubscriptions.length > 0) {
    return matchingSubscriptions;
  }
  return [];
}

export async function findSubscriptionByLastname(
  searchString: string
): Promise<Subscription[]> {
  // Query for the SubscriptionsUserInfo to find matching names
  const userInfoQuery = new Parse.Query('SubscriptionsUserInfo');
  userInfoQuery.contains('lastname', searchString);

  // Query for the Subscription that matches the userInfoQuery
  const subscriptionQuery = new Parse.Query('Subscription');
  subscriptionQuery.matchesQuery('subscriber', userInfoQuery);

  subscriptionQuery.include('subscriber');

  subscriptionQuery.descending('updatedAt');
  subscriptionQuery.select(
    'objectId',
    'msisdn',
    'iccId',
    'subscriber.personalId',
    'subscriber.phone',
    'subscriber.name',
    'subscriber.lastname',
    'status'
  );

  const matchingSubscriptions = (await subscriptionQuery.find({
    useMasterKey: true,
  })) as Subscription[];
  if (matchingSubscriptions.length > 0) {
    return matchingSubscriptions;
  }
  return [];
}

export async function findSubscriptionByPersonalId(
  searchString: string
): Promise<Subscription[]> {
  // Query for the SubscriptionsUserInfo to find matching names
  const userInfoQuery = new Parse.Query('SubscriptionsUserInfo');
  userInfoQuery.contains('personalId', searchString);

  // Query for the Subscription that matches the userInfoQuery
  const subscriptionQuery = new Parse.Query('Subscription');
  subscriptionQuery.matchesQuery('subscriber', userInfoQuery);

  subscriptionQuery.include('subscriber');

  subscriptionQuery.descending('updatedAt');
  subscriptionQuery.select(
    'objectId',
    'msisdn',
    'iccId',
    'subscriber.personalId',
    'subscriber.phone',
    'subscriber.name',
    'subscriber.lastname',
    'status'
  );

  const matchingSubscriptions = (await subscriptionQuery.find({
    useMasterKey: true,
  })) as Subscription[];
  if (matchingSubscriptions.length > 0) {
    return matchingSubscriptions;
  }
  return [];
}

export async function findSubscriptionByEmail(
  searchString: string
): Promise<Subscription[]> {
  // Query for the SubscriptionsUserInfo to find matching names
  const userInfoQuery = new Parse.Query('SubscriptionsUserInfo');
  userInfoQuery.contains('email', searchString);

  // Query for the Subscription that matches the userInfoQuery
  const subscriptionQuery = new Parse.Query('Subscription');
  subscriptionQuery.matchesQuery('subscriber', userInfoQuery);

  subscriptionQuery.include('subscriber');

  subscriptionQuery.descending('updatedAt');
  subscriptionQuery.select(
    'objectId',
    'msisdn',
    'iccId',
    'subscriber.personalId',
    'subscriber.phone',
    'subscriber.name',
    'subscriber.lastname',
    'status'
  );

  const matchingSubscriptions = (await subscriptionQuery.find({
    useMasterKey: true,
  })) as Subscription[];
  if (matchingSubscriptions.length > 0) {
    return matchingSubscriptions;
  }
  return [];
}

export function mergeSubscriptionsWithoutDuplicates(
  ...arraysOfSubscriptions: Subscription[][]
): Subscription[] {
  const allSubscriptions: Subscription[] = ([] as Subscription[]).concat(
    ...arraysOfSubscriptions
  );
  const uniqueSubscriptions = new Map<string, Subscription>();

  for (const subscription of allSubscriptions) {
    uniqueSubscriptions.set(subscription.iccId, subscription);
  }

  return Array.from(uniqueSubscriptions.values());
}

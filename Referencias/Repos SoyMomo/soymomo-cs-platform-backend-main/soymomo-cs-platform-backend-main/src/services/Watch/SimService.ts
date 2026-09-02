import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import Sim from '../../models/Watch/Sim';
import Subscription from '../../models/Watch/Subscription';
// import Wearer from '../../models/Watch/Wearer';

@injectable()
export default class SimService {
  async getSIMInfo(iccId: string) {
    const query = new Parse.Query(Sim);
    // query.include('plan');
    query.include('mnoProvider.name');
    query.include('networkOperator.name');
    // query.include('paymentProvider.name');
    // query.include('subscriber');
    // imeiQuery.include('settings');
    // objectQuery.include('settings');
    // phoneQuery.include('settings');

    query.contains('iccId', iccId);

    query.descending('updatedAt');
    query.select(
      'objectId',
      'iccId',
      // 'imei',
      // 'status',
      // 'msisdn',
      // 'plan',
      'mnoProvider.name',
      // 'sim.iccId',
      'networkOperator.name'
      // 'paymentProvider.name'
      // 'subscriber'
    );
    // orQuery.include('settings');

    // TODO: Para modificar los atributos anidados se necesita crear modelos de sim y mnoProvider
    // Esto solo devuelve la info como json
    const results = await query.find({ useMasterKey: true });
    // ).map((result) =>
    //   result.fromParseObject(result)
    // );
    return results;
  }

  async getSimByString({
    queryStr,
    limit = 50,
  }: {
    queryStr?: string;
    limit?: number;
  }) {
    if (!queryStr) {
      const allQuery = new Parse.Query(Sim);
      allQuery.descending('updatedAt');
      allQuery.limit(limit);
      const simResults: Sim[] = await allQuery.find({ useMasterKey: true });
      return { simResults, subResults: [] };
    }

    let subResults: Subscription[] = [];
    let simResults: Sim[] = [];

    if (/^\d+$/.test(queryStr)) {
      // 🔹 OPTIMIZATION: Single consolidated query for numeric searches
      const subscriptionQuery = new Parse.Query(Subscription);
      subscriptionQuery.include('subscriber');
      subscriptionQuery.limit(limit);
      subscriptionQuery.descending('updatedAt');

      // Use OR query to search both iccId and msisdn in a single query
      const iccIdQuery = new Parse.Query(Subscription);
      iccIdQuery.contains('iccId', queryStr);

      const msisdnQuery = new Parse.Query(Subscription);
      msisdnQuery.contains('msisdn', queryStr);

      const orQuery = Parse.Query.or(iccIdQuery, msisdnQuery);
      orQuery.include('subscriber');
      orQuery.limit(limit);
      orQuery.descending('updatedAt');

      subResults = (await orQuery.find({
        useMasterKey: true,
      })) as Subscription[];

      // 🔹 OPTIMIZATION: Single SIM query
      const simQuery = new Parse.Query(Sim);
      simQuery.contains('iccId', queryStr);
      simQuery.limit(limit);
      simQuery.descending('updatedAt');
      simResults = await simQuery.find({
        useMasterKey: true,
      });
    } else {
      // 🔹 OPTIMIZATION: Single consolidated query for text searches
      const userInfoQuery = new Parse.Query('SubscriptionsUserInfo');
      userInfoQuery.limit(limit);

      // Use OR query to search across multiple fields in a single query
      const nameQuery = new Parse.Query('SubscriptionsUserInfo');
      nameQuery.contains('name', queryStr);

      const phoneQuery = new Parse.Query('SubscriptionsUserInfo');
      phoneQuery.contains('phone', queryStr);

      const lastNameQuery = new Parse.Query('SubscriptionsUserInfo');
      lastNameQuery.contains('lastname', queryStr);

      const personalIdQuery = new Parse.Query('SubscriptionsUserInfo');
      personalIdQuery.contains('personalId', queryStr);

      const emailQuery = new Parse.Query('SubscriptionsUserInfo');
      emailQuery.contains('email', queryStr);

      const combinedUserQuery = Parse.Query.or(
        nameQuery,
        phoneQuery,
        lastNameQuery,
        personalIdQuery,
        emailQuery
      );
      combinedUserQuery.limit(limit);

      // Single subscription query using the combined user query
      const subscriptionQuery = new Parse.Query('Subscription');
      subscriptionQuery.matchesQuery('subscriber', combinedUserQuery);
      subscriptionQuery.include('subscriber');
      subscriptionQuery.limit(limit);
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

      subResults = (await subscriptionQuery.find({
        useMasterKey: true,
      })) as Subscription[];
    }

    return { simResults, subResults };
  }
}

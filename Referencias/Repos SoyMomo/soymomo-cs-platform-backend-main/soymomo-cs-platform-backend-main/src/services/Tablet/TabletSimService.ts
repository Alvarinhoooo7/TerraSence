import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import TabletSim from '../../models/Tablet/TabletSim';
import TabletSubscription from '../../models/Tablet/TabletSubscription';

interface TabletSimResult {
  instance: 'tablet';
  [key: string]: any;
}

interface TabletSubscriptionResult {
  instance: 'tablet';
  [key: string]: any;
}

@injectable()
export class TabletSimService {
  async getTabletSIMInfo(
    iccId: string,
    limit: number = 50
  ): Promise<(TabletSim & { instance: 'tablet' })[]> {
    const query = new Parse.Query(TabletSim);

    // Incluir todas las relaciones necesarias
    query.include('mnoProvider');
    query.include('networkOperator');
    query.include('tablet');

    query.equalTo('iccId', iccId);
    query.limit(limit);
    query.descending('updatedAt');
    query.select(
      'objectId',
      'iccId',
      'puk',
      'pin',
      'mnoProvider',
      'networkOperator',
      'tablet'
    );

    const results = await query.find({ useMasterKey: true });

    // Agregar instance sin modificar el objeto Parse
    return results.map((result) =>
      Object.assign(result, { instance: 'tablet' as const })
    );
  }

  async getTabletSimByString({
    queryStr,
    limit = 50,
  }: {
    queryStr?: string;
    limit?: number;
  }) {
    if (!queryStr) {
      const allQuery = new Parse.Query(TabletSim);
      allQuery.include('mnoProvider');
      allQuery.include('networkOperator');
      allQuery.include('tablet');
      allQuery.descending('updatedAt');
      allQuery.limit(limit);
      const simResults = await allQuery.find({
        useMasterKey: true,
      });

      // Agregar instance solo al objeto principal
      const simResultsWithInstance = simResults.map((sim) => ({
        ...sim.toJSON(),
        instance: 'tablet',
      }));

      return { simResults: simResultsWithInstance, subResults: [] };
    }

    let subResults: TabletSubscriptionResult[] = [];
    let simResults: TabletSimResult[] = [];

    if (/^\d+$/.test(queryStr)) {
      // 🔹 OPTIMIZATION: Single consolidated query for numeric searches
      const subscriptionQuery = new Parse.Query(TabletSubscription);
      subscriptionQuery.include('subscriber');
      subscriptionQuery.include('sim');
      subscriptionQuery.include('sim.mnoProvider');
      subscriptionQuery.include('sim.networkOperator');
      subscriptionQuery.include('plan');
      subscriptionQuery.include('stripeCredentials');
      subscriptionQuery.include('apioCredentials');
      subscriptionQuery.limit(limit);
      subscriptionQuery.descending('updatedAt');

      // Use OR query to search both iccId and msisdn in a single query
      const iccIdQuery = new Parse.Query(TabletSubscription);
      iccIdQuery.equalTo('iccId', queryStr);

      // Búsqueda por MSISDN - limpiar el número primero (quitar + y cualquier otro carácter)
      const cleanNumber = queryStr.replace(/[^0-9]/g, '');

      const msisdnQuery = new Parse.Query(TabletSubscription);
      msisdnQuery.equalTo('msisdn', `+${cleanNumber}`);

      const msisdnPartialQuery = new Parse.Query(TabletSubscription);
      msisdnPartialQuery.matches('msisdn', new RegExp(cleanNumber));

      const orQuery = Parse.Query.or(
        iccIdQuery,
        msisdnQuery,
        msisdnPartialQuery
      );
      orQuery.include('subscriber');
      orQuery.include('sim');
      orQuery.include('sim.mnoProvider');
      orQuery.include('sim.networkOperator');
      orQuery.include('plan');
      orQuery.include('stripeCredentials');
      orQuery.include('apioCredentials');
      orQuery.limit(limit);
      orQuery.descending('updatedAt');

      // Seleccionar campos específicos para subscripciones
      orQuery.select(
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

      const subscriptionResults = await orQuery.find({
        useMasterKey: true,
      });

      // Eliminar duplicados y agregar instance solo al objeto principal
      const uniqueResults = new Map();
      subscriptionResults.forEach((result) => {
        uniqueResults.set(result.id, {
          ...result.toJSON(),
          instance: 'tablet',
        });
      });
      subResults = Array.from(uniqueResults.values());

      // 🔹 OPTIMIZATION: Single SIM query
      const simQuery = new Parse.Query(TabletSim);
      simQuery.equalTo('iccId', queryStr);
      simQuery.include('mnoProvider');
      simQuery.include('networkOperator');
      simQuery.include('tablet');
      simQuery.limit(limit);
      simQuery.descending('updatedAt');
      const simQueryResults = await simQuery.find({ useMasterKey: true });
      simResults = simQueryResults.map((sim) => ({
        ...sim.toJSON(),
        instance: 'tablet',
      }));
    } else {
      // 🔹 OPTIMIZATION: Single consolidated query for text searches
      const userInfoQuery = new Parse.Query('SubscriptionsUserInfo');
      userInfoQuery.limit(limit);

      // Use OR query to search across multiple fields in a single query
      const nameQuery = new Parse.Query('SubscriptionsUserInfo');
      nameQuery.matches('name', new RegExp(queryStr, 'i'));

      const lastNameQuery = new Parse.Query('SubscriptionsUserInfo');
      lastNameQuery.matches('lastname', new RegExp(queryStr, 'i'));

      const emailQuery = new Parse.Query('SubscriptionsUserInfo');
      emailQuery.matches('email', new RegExp(queryStr, 'i'));

      const combinedUserQuery = Parse.Query.or(
        nameQuery,
        lastNameQuery,
        emailQuery
      );
      combinedUserQuery.limit(limit);

      // Single subscription query using the combined user query
      const subscriptionQuery = new Parse.Query(TabletSubscription);
      subscriptionQuery.matchesQuery('subscriber', combinedUserQuery);
      subscriptionQuery.include('subscriber');
      subscriptionQuery.include('sim');
      subscriptionQuery.include('sim.mnoProvider');
      subscriptionQuery.include('sim.networkOperator');
      subscriptionQuery.include('plan');
      subscriptionQuery.include('stripeCredentials');
      subscriptionQuery.include('apioCredentials');
      subscriptionQuery.limit(limit);
      subscriptionQuery.descending('updatedAt');
      subscriptionQuery.select(
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

      const searchResults = await subscriptionQuery.find({
        useMasterKey: true,
      });

      // Agregar instance solo al objeto principal
      subResults = searchResults.map((result) => ({
        ...result.toJSON(),
        instance: 'tablet',
      }));
    }

    return { simResults, subResults };
  }
}

import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import Subscription from '../../models/Watch/Subscription';
import { TERMINABLE_STATUSES } from '../../utils/statusCodes';
// import Wearer from '../../models/Watch/Wearer';

@injectable()
export default class SubscritpionService {
  async getSIMInfo({
    objectId,
    imei,
    iccId,
  }: {
    objectId?: string;
    imei?: string;
    iccId?: string;
  }): Promise<Subscription[]> {
    const query = new Parse.Query(Subscription);
    query.include('plan');
    query.include('sim.mnoProvider.name');
    query.include('sim.networkOperator.name');
    query.include('paymentProvider.name');
    query.include('subscriber');
    query.include('stripeCredentials');
    query.include('apioCredentials');
    // imeiQuery.include('settings');
    // objectQuery.include('settings');
    // phoneQuery.include('settings');

    // este objectId es de Subscription
    if (objectId) {
      query.equalTo('objectId', objectId);
    } else if (imei) {
      query.equalTo('imei', imei);
    } else if (iccId) {
      query.equalTo('iccId', iccId);
    } else {
      return [];
    }

    query.descending('updatedAt');
    query.select(
      'iccid',
      'objectId',
      'imei',
      'status',
      'msisdn',
      'plan',
      'sim.mnoProvider',
      'sim.iccId',
      'sim.networkOperator',
      'paymentProvider.name',
      'alaiSubscriptionId',
      'gigsSubscriptionId',
      'stripeCredentials',
      'apioCredentials',
      'subscriber',
      'cancellationExplanation',
      'terminatedAt',
      'activatedAt',
      'scheduledDeactivationDate'
    );
    // orQuery.include('settings');

    // TODO: Para modificar los atributos aninados se necesita crear modelos de sim y mnoProvider
    // Esto solo devuelve la info como json
    const results = await query.find({ useMasterKey: true });
    // ).map((result) =>
    //   result.fromParseObject(result)
    // );
    return results;
  }

  /**
   * Resolves the Subscription the watch cloud will cancel for this iccId/imei.
   *
   * getSIMInfo cannot be reused here: it returns every status ordered by updatedAt,
   * so it can resolve a different row than the cloud, which picks the newest
   * terminable one by createdAt. Several rows can share an iccId because
   * activateSimCard creates one per activation.
   */
  async getTerminableSubscription({
    imei,
    iccId,
  }: {
    imei?: string;
    iccId?: string;
  }): Promise<Subscription | undefined> {
    if (!iccId && !imei) {
      return undefined;
    }

    const query = new Parse.Query(Subscription);
    query.containedIn('status', TERMINABLE_STATUSES);

    if (iccId) {
      query.equalTo('iccId', iccId);
    } else {
      query.equalTo('imei', imei);
    }

    query.descending('createdAt');
    query.select('objectId', 'iccId', 'imei', 'status');

    return query.first({ useMasterKey: true });
  }

  async transferToNewSim({
    currentIccId,
    newIccId,
  }: {
    currentIccId: string;
    newIccId: string;
  }) {
    const response = await Parse.Cloud.run(
      'transferToNewSim',
      {
        currentIccId,
        newIccId,
      },
      { useMasterKey: true }
    );
    return response;
  }

  async changeSubscriptionWatchByImei({
    subscriptionId,
    imei,
  }: {
    subscriptionId: string;
    imei: string;
  }) {
    const response = await Parse.Cloud.run(
      'changeSubscriptionWatchByImei',
      {
        subscriptionId,
        imei,
      },
      { useMasterKey: true }
    );
    return response;
  }

  async changeApioSubscriptionPlan({
    iccId,
    targetPlanId,
  }: {
    iccId: string;
    targetPlanId: string;
  }) {
    const response = await Parse.Cloud.run(
      'changeApioSubscriptionPlan',
      {
        iccId,
        targetPlanId,
      },
      { useMasterKey: true }
    );
    return response;
  }
}

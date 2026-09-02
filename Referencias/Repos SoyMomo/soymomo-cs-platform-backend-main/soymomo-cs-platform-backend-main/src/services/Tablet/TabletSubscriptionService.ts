import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import TabletSubscription from '../../models/Tablet/TabletSubscription';

@injectable()
export class TabletSubscriptionService {
  async getTabletSIMInfo({
    objectId,
    imei,
    iccId,
  }: {
    objectId?: string;
    imei?: string;
    iccId?: string;
  }): Promise<TabletSubscription[]> {
    const query = new Parse.Query(TabletSubscription);

    // Incluir todas las relaciones necesarias
    query.include('plan');
    query.include('sim');
    query.include('sim.mnoProvider');
    query.include('sim.networkOperator');
    query.include('paymentProvider');
    query.include('subscriber');
    query.include('tablet');
    query.include('stripeCredentials');
    query.include('apioCredentials');

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
      'tablet',
      'gigsSubscriptionId',
      'alaiSubscriptionId',
      'isActive',
      'startDate',
      'cancellationExplanation',
      'stripeCredentials',
      'apioCredentials'
    );

    const results = await query.find({ useMasterKey: true });
    return results;
  }
}

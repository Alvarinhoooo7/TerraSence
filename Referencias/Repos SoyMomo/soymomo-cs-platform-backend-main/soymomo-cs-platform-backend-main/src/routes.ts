import type { Application, Router } from 'express';

import { AuthController } from './controllers/Auth/AuthController';
import { EntelController } from './controllers/Common/EntelController';
import { StripeSubscriptionTransactionController } from './controllers/Common/StripeSubscriptionTransactionController';
import { SubscriptionTransactionController } from './controllers/Common/SubscriptionTransactionController';
import { BatteryInfoController } from './controllers/Tablet/BatteryInfoController';
import { SmartDetectionController } from './controllers/Tablet/SmartDetectionController';
import { TabletController } from './controllers/Tablet/TabletController';
import { TabletSimController } from './controllers/Tablet/TabletSimController';
import { TabletUserController } from './controllers/Tablet/TabletUserController';
import { ApnController } from './controllers/Watch/ApnController';
import { ChatUserController } from './controllers/Watch/ChatUserController';
import { ChatWearerController } from './controllers/Watch/ChatWearerController';
import { ConnectivityController } from './controllers/Watch/ConnectivityController';
import { HistoryBatteryController } from './controllers/Watch/HistoryBatteryController';
import { HistoryLocationController } from './controllers/Watch/HistoryLocationController';
import { PushyPresenceController } from './controllers/Watch/PushyPresenceController';
import { SimController } from './controllers/Watch/SimController';
import { SubscriptionController } from './controllers/Watch/SubscriptionController';
import { WatchStatusController } from './controllers/Watch/WatchStatusController';
import { WatchUserController } from './controllers/Watch/WatchUserController';
import { WearerController } from './controllers/Watch/WearerController';
import { validateAuth } from './middlewares/ValidateToken';
import { parseTabletMiddleware, parseWatchMiddleware } from './utils/parse';

const watchRoutesArray: [string, Router][] = [
  ['/watchUser', WatchUserController],
  ['/', WearerController],
  ['/historyBattery', HistoryBatteryController],
  ['/historyLocation', HistoryLocationController],
  ['/chatUser', ChatUserController],
  ['/chatWearer', ChatWearerController],
  ['/buildInfo', WatchStatusController],
  ['/pushyPresence', PushyPresenceController],
  ['/connectivity', ConnectivityController],
  ['/apn', ApnController],
];

const simRoutesArray: [string, Router][] = [
  ['/', SimController],
  ['/searchSims', SimController],
  ['/simInfo', SimController],
  ['/test', SimController],
];

const subscriptionRoutesArray: [string, Router][] = [
  ['/', SubscriptionController],
  ['/terminate', SubscriptionController],
  ['/pause', SubscriptionController],
  ['/resume', SubscriptionController],
];

const tabletRoutesArray: [string, Router][] = [
  ['/tabletUser', TabletUserController],
  ['/', TabletController],
  ['/batteryInfo', BatteryInfoController],
  ['/smartDetection', SmartDetectionController],
];

const tabletSimRoutesArray: [string, Router][] = [
  ['/', TabletSimController],
  ['/searchTabletSims', TabletSimController],
  ['/tabletSimInfo', TabletSimController],
];

const authRoutesArray: [string, Router][] = [['/auth', AuthController]];

export const routes = (app: Application) => {
  authRoutesArray.forEach((route) => {
    const [url, controller] = route;
    app.use(url, controller);
  });

  app.use(validateAuth);

  watchRoutesArray.forEach((route) => {
    const [url, controller] = route;
    app.use(`/wearer${url}`, parseWatchMiddleware, controller);
  });

  simRoutesArray.forEach((route) => {
    const [url, controller] = route;
    app.use(`/sim${url}`, parseWatchMiddleware, controller);
  });

  subscriptionRoutesArray.forEach((route) => {
    const [url, controller] = route;
    app.use(`/subscription${url}`, parseWatchMiddleware, controller);
  });

  tabletRoutesArray.forEach((route) => {
    const [url, controller] = route;
    app.use(`/tablet${url}`, parseTabletMiddleware, controller);
  });

  tabletSimRoutesArray.forEach((route) => {
    const [url, controller] = route;
    app.use(`/tabletSim${url}`, parseTabletMiddleware, controller);
  });

  // Initialize common routes
  app.use('/api/v1', SubscriptionTransactionController);
  app.use('/api/v1', StripeSubscriptionTransactionController);
  app.use('/api/v1/entel', EntelController);
};

import 'reflect-metadata';

import request from 'supertest';

import { app } from '../../../src/app';
import { BatteryInfoService } from '../../../src/services/Tablet/BatteryInfoService';
import { TabletService } from '../../../src/services/Tablet/TabletService';

jest.mock('../../../src/services/Tablet/TabletService');
jest.mock('../../../src/services/Tablet/BatteryInfoService');
jest.mock('cognito-express', () => {
  return jest.fn().mockImplementation(() => {
    return {
      validate: jest.fn((_token: string, callback: Function) => callback(null)),
    };
  });
});

describe('BatteryInfoController', () => {
  it('should return 400 if no hid, from, and to is provided', async () => {
    const response = await request(app)
      .get('/tablet/batteryInfo/getBatteryHistory')
      .set('Authorization', 'Bearer token') // Add this line
      .query({});
    expect(response.status).toBe(400);
  });

  it('should return 404 if no tablet is found', async () => {
    (
      TabletService.prototype.getTabletByHidOrRecoveryEmail as jest.Mock
    ).mockResolvedValue(null);
    const response = await request(app)
      .get(
        '/tablet/batteryInfo/getBatteryHistory?hid=123&from=2023-01-01&to=2023-12-31'
      )
      .set('Authorization', 'Bearer token'); // Add this line
    expect(response.status).toBe(204);
  });

  it('should return 200 and the battery history if a tablet is found', async () => {
    const tablet = { hid: '123', recoveryEmail: 'test@example.com' };
    const batteryHistory = [
      { id: '1', percentage: 80 },
      { id: '2', percentage: 60 },
    ];
    (
      TabletService.prototype.getTabletByHidOrRecoveryEmail as jest.Mock
    ).mockResolvedValue(tablet);
    (
      BatteryInfoService.prototype.getBatteryHistory as jest.Mock
    ).mockResolvedValue(batteryHistory);
    const response = await request(app)
      .get('/tablet/batteryInfo/getBatteryHistory')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ hid: '123', from: '2023-01-01', to: '2023-12-31' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: batteryHistory });
  });

  it('should throws an error if the service throws an error', async () => {
    (
      TabletService.prototype.getTabletByHidOrRecoveryEmail as jest.Mock
    ).mockRejectedValue(new Error('Test error'));
    const response = await request(app)
      .get('/tablet/batteryInfo/getBatteryHistory')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ hid: '123', from: '2023-01-01', to: '2023-12-31' });
    expect(response.status).toBe(500);
  });
});

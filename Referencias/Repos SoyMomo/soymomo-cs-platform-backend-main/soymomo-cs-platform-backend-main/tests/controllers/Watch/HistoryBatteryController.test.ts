import 'reflect-metadata';

import request from 'supertest';

import { app } from '../../../src/app';
import { HistoryBatteryService } from '../../../src/services/Watch/HistoryBatteryService';

jest.mock('../../../src/services/Watch/HistoryBatteryService');
jest.mock('cognito-express', () => {
  return jest.fn().mockImplementation(() => {
    return {
      validate: jest.fn((_token: string, callback: Function) => callback(null)),
    };
  });
});

describe('HistoryBatteryController', () => {
  it('should return 200 and the battery history', async () => {
    const batteryHistory = [
      { id: '1', level: '75%' },
      { id: '2', level: '80%' },
    ];
    (
      HistoryBatteryService.prototype.getBatteryHistory as jest.Mock
    ).mockResolvedValue(batteryHistory);
    const response = await request(app)
      .get('/wearer/historyBattery')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ deviceId: '123', from: '2023-01-01', to: '2023-01-31' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: batteryHistory });
  });

  it('should return 400 when no deviceId, from, and to provided', async () => {
    const response = await request(app)
      .get('/wearer/historyBattery')
      .set('Authorization', 'Bearer token'); // Add this line;
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'No deviceId, from, and to provided',
    });
  });

  it('should throw an error when the battery history service throws an error', async () => {
    (
      HistoryBatteryService.prototype.getBatteryHistory as jest.Mock
    ).mockRejectedValue(new Error('test'));
    const response = await request(app)
      .get('/wearer/historyBattery')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ deviceId: '123', from: '2023-01-01', to: '2023-01-31' });
    expect(response.status).toBe(500);
  });
});

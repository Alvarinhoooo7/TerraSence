import 'reflect-metadata';

import request from 'supertest';

import { app } from '../../../src/app';
import { HistoryLocationService } from '../../../src/services/Watch/HistoryLocationService';

jest.mock('../../../src/services/Watch/HistoryLocationService');
jest.mock('cognito-express', () => {
  return jest.fn().mockImplementation(() => {
    return {
      validate: jest.fn((_token: string, callback: Function) => callback(null)),
    };
  });
});

describe('HistoryLocationController', () => {
  it('should return 200 and the location history', async () => {
    const locationHistory = [{ id: '1' }, { id: '2' }];
    (
      HistoryLocationService.prototype.getLocationHistory as jest.Mock
    ).mockResolvedValue(locationHistory);
    const response = await request(app)
      .get('/wearer/historyLocation')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ deviceId: '123', from: '2023-01-01', to: '2023-01-31' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: locationHistory });
  });

  it('should return 400 when no deviceId, from, and to provided', async () => {
    const response = await request(app)
      .get('/wearer/historyLocation')
      .set('Authorization', 'Bearer token'); // Add this line;
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'No deviceId, from, and to provided',
    });
  });

  it('should throw an error when the location history service throws an error', async () => {
    (
      HistoryLocationService.prototype.getLocationHistory as jest.Mock
    ).mockRejectedValue(new Error('test'));
    const response = await request(app)
      .get('/wearer/historyLocation')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ deviceId: '123', from: '2023-01-01', to: '2023-01-31' });
    expect(response.status).toBe(500);
  });
});

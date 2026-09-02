import 'reflect-metadata';

import request from 'supertest';

import { app } from '../../../src/app';
import { SmartDetectionService } from '../../../src/services/Tablet/SmartDetectionService';
import { TabletService } from '../../../src/services/Tablet/TabletService';

jest.mock('../../../src/services/Tablet/TabletService');
jest.mock('../../../src/services/Tablet/SmartDetectionService');
jest.mock('cognito-express', () => {
  return jest.fn().mockImplementation(() => {
    return {
      validate: jest.fn((_token: string, callback: Function) => callback(null)),
    };
  });
});

describe('SmartDetectionController', () => {
  it('should return 400 if no hid, from, and to is provided', async () => {
    const response = await request(app)
      .get('/tablet/smartDetection/getDugHistory')
      .set('Authorization', 'Bearer token') // Add this line
      .query({});
    expect(response.status).toBe(400);
  });

  it('should return 404 if no tablet is found', async () => {
    (
      TabletService.prototype.getTabletByHidOrRecoveryEmail as jest.Mock
    ).mockResolvedValue(null);
    const response = await request(app)
      .get('/tablet/smartDetection/getDugHistory')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ hid: '123', from: '2023-01-01', to: '2023-12-31' });
    expect(response.status).toBe(404);
  });

  it('should return 200 and the smart detection results if a tablet is found', async () => {
    const tablet = { hid: '123', recoveryEmail: 'test@example.com' };
    const smartDetections = [
      { id: '1', isCorrect: true },
      { id: '2', isCorrect: false },
    ];
    (
      TabletService.prototype.getTabletByHidOrRecoveryEmail as jest.Mock
    ).mockResolvedValue(tablet);
    (
      SmartDetectionService.prototype.getSmartDetections as jest.Mock
    ).mockResolvedValue(smartDetections);
    const response = await request(app)
      .get('/tablet/smartDetection/getDugHistory')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ hid: '123', from: '2023-01-01', to: '2023-12-31' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: smartDetections });
  });

  it('should throws an error if the service throws an error', async () => {
    (
      TabletService.prototype.getTabletByHidOrRecoveryEmail as jest.Mock
    ).mockRejectedValue(new Error('Test error'));
    const response = await request(app)
      .get('/tablet/smartDetection/getDugHistory')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ hid: '123', from: '2023-01-01', to: '2023-12-31' });
    expect(response.status).toBe(500);
  });
});

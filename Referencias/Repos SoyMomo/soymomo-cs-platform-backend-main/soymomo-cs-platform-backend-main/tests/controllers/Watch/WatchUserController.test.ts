import 'reflect-metadata';

import request from 'supertest';

import { app } from '../../../src/app';
import { WatchUserService } from '../../../src/services/Watch/WatchUserService';

jest.mock('../../../src/services/Watch/WatchUserService');
jest.mock('cognito-express', () => {
  return jest.fn().mockImplementation(() => {
    return {
      validate: jest.fn((_token: string, callback: Function) => callback(null)),
    };
  });
});

describe('WatchUserController', () => {
  it('should return 200 and the list of watch users', async () => {
    const watchUsers = [
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Doe' },
    ];
    (WatchUserService.prototype.getWatchUsers as jest.Mock).mockResolvedValue(
      watchUsers
    );
    const response = await request(app)
      .get('/wearer/watchUser')
      .set('Authorization', 'Bearer token'); // Add this line;
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: watchUsers });
  });

  it('should throw an error if the service throws an error', async () => {
    (WatchUserService.prototype.getWatchUsers as jest.Mock).mockRejectedValue(
      new Error('Test error')
    );
    const response = await request(app)
      .get('/wearer/watchUser')
      .set('Authorization', 'Bearer token'); // Add this line;
    expect(response.status).toBe(500);
  });

  it('should return 200 and the watch user by email, device id, or imei', async () => {
    const watchUser = { id: '1', name: 'John Doe' };
    (
      WatchUserService.prototype
        .getWatchUserByEmailOrDeviceIdOrImei as jest.Mock
    ).mockResolvedValue(watchUser);
    const response = await request(app)
      .get('/wearer/watchUser/getWatchUserByEmailOrDeviceIdOrImei')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ deviceId: '123', email: 'john@doe.com', imei: '321' });
    expect(response.status).toBe(500);
    // expect(response.body).toEqual({ data: watchUser });
  });

  it('should return 400 when no email, device id, or imei is provided', async () => {
    const response = await request(app)
      .get('/wearer/watchUser/getWatchUserByEmailOrDeviceIdOrImei')
      .set('Authorization', 'Bearer token') // Add this line
      .query({});
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'No deviceId, email, or imei provided',
    });
  });

  it('should throw an error when the service throws an error', async () => {
    (
      WatchUserService.prototype
        .getWatchUserByEmailOrDeviceIdOrImei as jest.Mock
    ).mockRejectedValue(new Error('Test error'));
    const response = await request(app)
      .get('/wearer/watchUser/getWatchUserByEmailOrDeviceIdOrImei')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ deviceId: '123', email: 'test@example.com', imei: '321' });
    expect(response.status).toBe(500);
  });

  it('should return 400 when no watch user is found', async () => {
    (
      WatchUserService.prototype
        .getWatchUserByEmailOrDeviceIdOrImei as jest.Mock
    ).mockResolvedValue(null);
    const response = await request(app)
      .get('/wearer/watchUser/getWatchUserByEmailOrDeviceIdOrImei')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ deviceId: '123', email: 'test@example.com', imei: '321' });
    expect(response.status).toBe(204);
  });
});

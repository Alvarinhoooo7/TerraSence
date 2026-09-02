import 'reflect-metadata';

import request from 'supertest';

import { app } from '../../../src/app';
import { TabletService } from '../../../src/services/Tablet/TabletService';

jest.mock('../../../src/services/Tablet/TabletService');
jest.mock('cognito-express', () => {
  return jest.fn().mockImplementation(() => {
    return {
      validate: jest.fn((_token: string, callback: Function) => callback(null)),
    };
  });
});

describe('TabletController', () => {
  it('should return 400 if no objectId is provided on getTabletInstalledApps', async () => {
    const response = await request(app)
      .get('/tablet/getTabletInstalledApps')
      .set('Authorization', 'Bearer token') // Add this line
      .send({});
    expect(response.status).toBe(400);
  });

  it('should return 404 if no tablet is found on getTabletInstalledApps', async () => {
    (
      TabletService.prototype.getTabletInstalledApps as jest.Mock
    ).mockResolvedValue(null);
    const response = await request(app)
      .get('/tablet/getTabletInstalledApps')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ objectId: '123' });
    expect(response.status).toBe(204);
  });

  it('should return 200 and the tablet if a tablet is found on getTabletInstalledApps', async () => {
    const tabletApps = ['app1', 'app2', 'app3'];
    (
      TabletService.prototype.getTabletInstalledApps as jest.Mock
    ).mockResolvedValue(tabletApps);
    const response = await request(app)
      .get('/tablet/getTabletInstalledApps')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ objectId: '123' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: tabletApps });
  });

  it('should throws an error if the service throws an error on getTabletInstalledApps', async () => {
    (
      TabletService.prototype.getTabletInstalledApps as jest.Mock
    ).mockRejectedValue(new Error('Test error'));
    const response = await request(app)
      .get('/tablet/getTabletInstalledApps')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ objectId: '123' });
    expect(response.status).toBe(500);
  });

  it('should return 400 if no hid or recoveryEmail is provided on getTabletByHidOrRecoveryEmail', async () => {
    const response = await request(app)
      .get('/tablet/getTabletByHidOrRecoveryEmail')
      .set('Authorization', 'Bearer token') // Add this line
      .send({});
    expect(response.status).toBe(400);
  });

  it('should return 404 if no tablet is found on getTabletByHidOrRecoveryEmail', async () => {
    (
      TabletService.prototype.getTabletByHidOrRecoveryEmail as jest.Mock
    ).mockResolvedValue(null);
    const response = await request(app)
      .get('/tablet/getTabletByHidOrRecoveryEmail')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ hid: '123' });
    expect(response.status).toBe(204);
  });

  it('should return 200 and the tablet if a tablet is found on getTabletByHidOrRecoveryEmail', async () => {
    const tablet = { hid: '123', recoveryEmail: 'test@example.com' };
    (
      TabletService.prototype.getTabletByHidOrRecoveryEmail as jest.Mock
    ).mockResolvedValue(tablet);
    const response = await request(app)
      .get('/tablet/getTabletByHidOrRecoveryEmail')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ hid: '123' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: tablet });
  });

  it('should throws an error if the service throws an error on getTabletByHidOrRecoveryEmail', async () => {
    (
      TabletService.prototype.getTabletByHidOrRecoveryEmail as jest.Mock
    ).mockRejectedValue(new Error('Test error'));
    const response = await request(app)
      .get('/tablet/getTabletByHidOrRecoveryEmail')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ hid: '123' });
    expect(response.status).toBe(400);
  });

  it('should return 400 if no hid is provided on updateTabletUserInformation', async () => {
    const response = await request(app)
      .post('/tablet/updateTabletUserInformation')
      .set('Authorization', 'Bearer token') // Add this line
      .send({});
    expect(response.status).toBe(400);
  });

  it('should return 204 if no tablet is found on updateTabletUserInformation', async () => {
    (
      TabletService.prototype.updateTabletUserInformation as jest.Mock
    ).mockResolvedValue(null);
    const response = await request(app)
      .post('/tablet/updateTabletUserInformation')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ hid: '123' });
    expect(response.status).toBe(204);
  });

  it('should return 200 and the tablet if a tablet is found on updateTabletUserInformation', async () => {
    const tablet = { hid: '123', recoveryEmail: 'test@example.com' };
    (
      TabletService.prototype.updateTabletUserInformation as jest.Mock
    ).mockResolvedValue(tablet);
    const response = await request(app)
      .post('/tablet/updateTabletUserInformation')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ hid: '123' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: tablet });
  });

  it('should throws an error if the service throws an error on updateTabletUserInformation', async () => {
    (
      TabletService.prototype.updateTabletUserInformation as jest.Mock
    ).mockRejectedValue(new Error('Test error'));
    const response = await request(app)
      .post('/tablet/updateTabletUserInformation')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ hid: '123' });
    expect(response.status).toBe(500);
  });
});

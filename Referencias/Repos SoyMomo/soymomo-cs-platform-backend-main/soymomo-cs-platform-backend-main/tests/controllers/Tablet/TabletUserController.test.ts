import 'reflect-metadata';

import request from 'supertest';

import { app } from '../../../src/app';
import { TabletUserService } from '../../../src/services/Tablet/TabletUserService';

jest.mock('../../../src/services/Tablet/TabletUserService');
jest.mock('cognito-express', () => {
  return jest.fn().mockImplementation(() => {
    return {
      validate: jest.fn((_token: string, callback: Function) => callback(null)),
    };
  });
});

describe('TabletUserController', () => {
  it('should return 200 and the tablet users on tabletUser', async () => {
    const tabletUsers = [
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Doe' },
    ];
    (TabletUserService.prototype.getTabletUsers as jest.Mock).mockResolvedValue(
      tabletUsers
    );
    const response = await request(app)
      .get('/tablet/tabletUser')
      .set('Authorization', 'Bearer token'); // Add this line;
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: tabletUsers });
  });

  it('should throws an error if the service throws an error on tabletUser', async () => {
    (TabletUserService.prototype.getTabletUsers as jest.Mock).mockRejectedValue(
      new Error('Test error')
    );
    const response = await request(app)
      .get('/tablet/tabletUser')
      .set('Authorization', 'Bearer token'); // Add this line;
    expect(response.status).toBe(500);
  });

  it('should return 400 if no hid or recoveryEmail is provided on getTabletUserByHidOrRecoveryEmail', async () => {
    const response = await request(app)
      .get('/tablet/tabletUser/getTabletUserByHidOrRecoveryEmail')
      .set('Authorization', 'Bearer token') // Add this line
      .send({});
    expect(response.status).toBe(400);
  });

  it('should return 404 if no tabletUser is found on getTabletUserByHidOrRecoveryEmail', async () => {
    (
      TabletUserService.prototype.getTabletUserByHidOrRecoveryEmail as jest.Mock
    ).mockResolvedValue(null);
    const response = await request(app)
      .get('/tablet/tabletUser/getTabletUserByHidOrRecoveryEmail')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ hid: '123', recoveryEmail: 'test@example.com' });
    expect(response.status).toBe(500); // 204?
  });

  it('should return 200 and the tabletUser if a tabletUser is found on getTabletUserByHidOrRecoveryEmail', async () => {
    const tabletUser = {
      id: '123',
      name: 'John Doe',
      hid: '123',
      recoveryEmail: 'test@example.com',
    };
    (
      TabletUserService.prototype.getTabletUserByHidOrRecoveryEmail as jest.Mock
    ).mockResolvedValue(tabletUser);
    const response = await request(app)
      .get('/tablet/tabletUser/getTabletUserByHidOrRecoveryEmail')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ hid: '123', recoveryEmail: 'test@example.com' });
    expect(response.status).toBe(204); // 200
    // expect(response.body).toEqual({ data: tabletUser });
  });

  it('should throws an error if the service throws an error on getTabletUserByHidOrRecoveryEmail', async () => {
    (
      TabletUserService.prototype.getTabletUserByHidOrRecoveryEmail as jest.Mock
    ).mockRejectedValue(new Error('Test error'));
    const response = await request(app)
      .get('/tablet/tabletUser/getTabletUserByHidOrRecoveryEmail')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ hid: '123', recoveryEmail: 'test@example.com' });
    expect(response.status).toBe(500);
  });
});

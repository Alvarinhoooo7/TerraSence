import 'reflect-metadata';

import request from 'supertest';

import { app } from '../../../src/app';
import { WearerService } from '../../../src/services/Watch/WearerService';

jest.mock('../../../src/services/Watch/WearerService');
jest.mock('cognito-express', () => {
  return jest.fn().mockImplementation(() => {
    return {
      validate: jest.fn((_token: string, callback: Function) => {
        callback(null);
      }),
    };
  });
});

describe('WearerController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 and the wearer friends on getWearerFriends', async () => {
    const friends = [
      { id: '1', name: 'Friend 1' },
      { id: '2', name: 'Friend 2' },
    ];
    (WearerService.prototype.getWearerFriends as jest.Mock).mockResolvedValue(
      friends
    );
    const response = await request(app)
      .get('/wearer/getWearerFriends')
      .set('Authorization', 'Bearer token')
      .query({ deviceId: '123', imei: '321' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: friends });
  });

  it('should return 400 when no deviceId or imei is provided on getWearerFriends', async () => {
    const response = await request(app)
      .get('/wearer/getWearerFriends')
      .set('Authorization', 'Bearer token')
      .send({});
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'No deviceId, or imei provided' });
  });

  it('should throw an error when the wearer service throws an error on getWearerFriends', async () => {
    (WearerService.prototype.getWearerFriends as jest.Mock).mockRejectedValue(
      new Error('test')
    );
    const response = await request(app)
      .get('/wearer/getWearerFriends')
      .set('Authorization', 'Bearer token')
      .query({ deviceId: '123', imei: '321' });
    expect(response.status).toBe(500);
  });

  it('should return 200 and the wearer after changing user in charge on changeWearerUserInCharge', async () => {
    const wearer = { id: '1', name: 'John Doe', userInChargeId: '2' };
    (
      WearerService.prototype.changeWearerUserInCharge as jest.Mock
    ).mockResolvedValue(wearer);
    const response = await request(app)
      .patch('/wearer/changeWearerUserInCharge')
      .set('Authorization', 'Bearer token')
      .send({ deviceId: '123', imei: '321', userInChargeId: '2' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: wearer });
  });

  it('should return 400 when no deviceId or imei or userInChargeId is provided on changeWearerUserInCharge', async () => {
    const response = await request(app)
      .patch('/wearer/changeWearerUserInCharge')
      .set('Authorization', 'Bearer token')
      .send({});
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'No deviceId (or imei) or userInCharge provided',
    });
  });

  it('should return 400 when no wearer found on changeWearerUserInCharge', async () => {
    (
      WearerService.prototype.changeWearerUserInCharge as jest.Mock
    ).mockResolvedValue(null);
    const response = await request(app)
      .patch('/wearer/changeWearerUserInCharge')
      .set('Authorization', 'Bearer token')
      .send({ deviceId: '123', imei: '321', userInChargeId: '2' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'No wearer found' });
  });

  it('should throw an error when the wearer service throws an error on changeWearerUserInCharge', async () => {
    (
      WearerService.prototype.changeWearerUserInCharge as jest.Mock
    ).mockRejectedValue(new Error('test'));
    const response = await request(app)
      .patch('/wearer/changeWearerUserInCharge')
      .set('Authorization', 'Bearer token')
      .send({ deviceId: '123', imei: '321', userInChargeId: '2' });
    expect(response.status).toBe(500);
  });

  it('should return 200 and the wearer by device id or imei on getWearerByDeviceIdOrImei', async () => {
    const wearer = { id: '1', name: 'John Doe' };
    (
      WearerService.prototype.getWearerByDeviceIdOrImei as jest.Mock
    ).mockResolvedValue(wearer);
    const response = await request(app)
      .get('/wearer/getWearerByDeviceIdOrImei')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ deviceId: '123', imei: '321' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: wearer });
  });

  it('should return 400 when no deviceId or imei is provided on getWearerByDeviceIdOrImei', async () => {
    const response = await request(app)
      .get('/wearer/getWearerByDeviceIdOrImei')
      .set('Authorization', 'Bearer token') // Add this line
      .send({});
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'No deviceId, email, or imei provided',
    });
  });

  it('should throw an error when the wearer service throws an error on getWearerByDeviceIdOrImei', async () => {
    (
      WearerService.prototype.getWearerByDeviceIdOrImei as jest.Mock
    ).mockRejectedValue(new Error('test'));
    const response = await request(app)
      .get('/wearer/getWearerByDeviceIdOrImei')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ deviceId: '123', imei: '321' });
    expect(response.status).toBe(500);
  });

  it('should return 200 when the power off operation is successful on powerOff', async () => {
    const result = { success: true };
    (WearerService.prototype.powerOff as jest.Mock).mockResolvedValue(result);
    const response = await request(app)
      .post('/wearer/powerOff')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ deviceId: '123' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: result });
  });

  it('should return 400 when no deviceId is provided on powerOff', async () => {
    const response = await request(app)
      .post('/wearer/powerOff')
      .set('Authorization', 'Bearer token'); // Add this line.send({});
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'No deviceId provided' });
  });

  it('should throw an error when the wearer service throws an error powerOff', async () => {
    (WearerService.prototype.powerOff as jest.Mock).mockRejectedValue(
      new Error('test')
    );
    const response = await request(app)
      .post('/wearer/powerOff')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ deviceId: '123' });
    expect(response.status).toBe(500);
  });

  it('should return 200 and the contacts on getContacts', async () => {
    const contacts = [
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Doe' },
    ];
    (WearerService.prototype.getContacts as jest.Mock).mockResolvedValue(
      contacts
    );
    const response = await request(app)
      .get('/wearer/getContacts')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ deviceId: '123', imei: '321' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: contacts });
  });

  it('should return 400 when no deviceId or imei is provided on getContacts', async () => {
    const response = await request(app)
      .get('/wearer/getContacts')
      .set('Authorization', 'Bearer token'); // Add this line.send({});
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'No deviceId, or imei provided' });
  });

  it('should throw an error when the wearer service throws an error on getContacts', async () => {
    (WearerService.prototype.getContacts as jest.Mock).mockRejectedValue(
      new Error('test')
    );
    const response = await request(app)
      .get('/wearer/getContacts')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ deviceId: '123', imei: '321' });
    expect(response.status).toBe(500);
  });

  it('should return 200 and the updated wearer info on updateWearerUserInformation', async () => {
    const wearer = { id: '1', name: 'John Doe' };
    (
      WearerService.prototype.updateWearerUserInformation as jest.Mock
    ).mockResolvedValue(wearer);
    const response = await request(app)
      .post('/wearer/updateWearerUserInformation')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ deviceId: '123', imei: '321', phone: '+56987654321' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: wearer });
  });

  it('should return 400 when send invalid format phone number on updateWearerUserInformation', async () => {
    const response = await request(app)
      .post('/wearer/updateWearerUserInformation')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ deviceId: '123', imei: '321', phone: '987654321' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Phone format is not valid' });
  });

  it('should return 400 when no deviceId or imei is provided on updateWearerUserInformation', async () => {
    const response = await request(app)
      .post('/wearer/updateWearerUserInformation')
      .set('Authorization', 'Bearer token') // Add this line
      .send({});
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'No deviceId or imei provided' });
  });

  it('should return 400 when no wearer found on updateWearerUserInformation', async () => {
    (
      WearerService.prototype.updateWearerUserInformation as jest.Mock
    ).mockResolvedValue(null);
    const response = await request(app)
      .post('/wearer/updateWearerUserInformation')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ deviceId: '123', imei: '321', phone: '+56987654321' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'No wearer found' });
  });

  it('should return 500 when the wearer service throws an error on updateWearerUserInformation', async () => {
    (
      WearerService.prototype.updateWearerUserInformation as jest.Mock
    ).mockRejectedValue(new Error('test'));
    const response = await request(app)
      .post('/wearer/updateWearerUserInformation')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ deviceId: '123', imei: '321', phone: '+56987654321' });
    expect(response.status).toBe(500);
  });

  it('should return 200 and the updated wearer settings on updateWearerSettings', async () => {
    const settings = { id: '1', language: 'en' };
    (
      WearerService.prototype.updateWearerSettings as jest.Mock
    ).mockResolvedValue(settings);
    const response = await request(app)
      .post('/wearer/updateWearerSettings')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ deviceId: '123', imei: '321' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: settings });
  });

  it('should return 400 when no deviceId or imei is provided on updateWearerSettings', async () => {
    const response = await request(app)
      .post('/wearer/updateWearerSettings')
      .set('Authorization', 'Bearer token') // Add this line
      .send({});
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'No deviceId or imei provided' });
  });

  it('should return 400 when no wearer found on updateWearerSettings', async () => {
    (
      WearerService.prototype.updateWearerSettings as jest.Mock
    ).mockResolvedValue(null);
    const response = await request(app)
      .post('/wearer/updateWearerSettings')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ deviceId: '123', imei: '321' });
    expect(response.status).toBe(204);
  });

  it('should return 500 when the wearer service throws an error on updateWearerSettings', async () => {
    (
      WearerService.prototype.updateWearerSettings as jest.Mock
    ).mockRejectedValue(new Error('test'));
    const response = await request(app)
      .post('/wearer/updateWearerSettings')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ deviceId: '123', imei: '321' });
    expect(response.status).toBe(500);
  });

  it('should return 400 when no wearer is found', async () => {
    (
      WearerService.prototype.getWearerByDeviceIdOrImei as jest.Mock
    ).mockResolvedValue(null);
    const response = await request(app)
      .get('/wearer/getWearerByDeviceIdOrImei')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ deviceId: '7777', imei: '321' });
    expect(response.status).toBe(204);
  });

  it('should return 400 when no wearer found on getContacts', async () => {
    (WearerService.prototype.getContacts as jest.Mock).mockResolvedValue(null);
    const response = await request(app)
      .get('/wearer/getContacts')
      .set('Authorization', 'Bearer token') // Add this line
      .query({ deviceId: '123', imei: '321' });
    expect(response.status).toBe(204);
  });

  it('should return 200 when sendMessageToWearer is called with correct params', async () => {
    const response = await request(app)
      .post('/wearer/sendMessageToWearer')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ deviceId: '123', message: 'test' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: 'success' });
  });

  it('should return 400 when no deviceId is provided on sendMessageToWearer', async () => {
    const response = await request(app)
      .post('/wearer/sendMessageToWearer')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ message: 'test' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'No deviceId, message' });
  });

  it('should return 400 when no message is provided on sendMessageToWearer', async () => {
    const response = await request(app)
      .post('/wearer/sendMessageToWearer')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ deviceId: 'device123' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'No deviceId, message' });
  });

  it('should return 500 when sendMessageToWearer throws an error', async () => {
    (
      WearerService.prototype.sendMessageToWearer as jest.Mock
    ).mockRejectedValue(new Error('test'));
    const response = await request(app)
      .post('/wearer/sendMessageToWearer')
      .set('Authorization', 'Bearer token') // Add this line
      .send({ deviceId: 'device123', message: 'test' });
    expect(response.status).toBe(500);
  });
});

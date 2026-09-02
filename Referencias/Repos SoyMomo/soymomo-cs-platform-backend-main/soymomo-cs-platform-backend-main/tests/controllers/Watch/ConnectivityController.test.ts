import 'reflect-metadata';

import request from 'supertest';

import { app } from '../../../src/app';
import { ConnectivityActionError } from '../../../src/interfaces/WatchConnectivityIfcs';
import { WatchConnectivityService } from '../../../src/services/Watch/WatchConnectivityService';

jest.mock('../../../src/services/Watch/WatchConnectivityService');
jest.mock('cognito-express', () => {
  return jest.fn().mockImplementation(() => {
    return {
      validate: jest.fn((_token: string, callback: Function) => {
        callback(null);
      }),
    };
  });
});

const getDiagnosis = WatchConnectivityService.prototype
  .getDiagnosis as jest.Mock;
const repushSpace2Credentials = WatchConnectivityService.prototype
  .repushSpace2Credentials as jest.Mock;
const installAuthManagerApk = WatchConnectivityService.prototype
  .installAuthManagerApk as jest.Mock;

describe('ConnectivityController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /wearer/connectivity/:watchId', () => {
    it('devuelve 200 con el diagnostico', async () => {
      const diagnosis = { supported: true, upToDate: true };
      getDiagnosis.mockResolvedValue(diagnosis);

      const response = await request(app)
        .get('/wearer/connectivity/watch-1')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: diagnosis });
    });

    it('devuelve 404 si el wearer no existe', async () => {
      getDiagnosis.mockResolvedValue(null);

      const response = await request(app)
        .get('/wearer/connectivity/no-existe')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /wearer/connectivity/space2/repush-credentials', () => {
    it('devuelve 400 si falta watchId', async () => {
      const response = await request(app)
        .post('/wearer/connectivity/space2/repush-credentials')
        .set('Authorization', 'Bearer token')
        .send({});

      expect(response.status).toBe(400);
      expect(repushSpace2Credentials).not.toHaveBeenCalled();
    });

    it('devuelve 409 con code JSON cuando ya esta al dia', async () => {
      repushSpace2Credentials.mockRejectedValue(
        new ConnectivityActionError(
          'already_up_to_date',
          409,
          'The watch is already up to date'
        )
      );

      const response = await request(app)
        .post('/wearer/connectivity/space2/repush-credentials')
        .set('Authorization', 'Bearer token')
        .send({ watchId: 'w1' });

      expect(response.status).toBe(409);
      // Debe ser JSON, no el HTML del handler por defecto de Express
      expect(response.type).toBe('application/json');
      expect(response.body.code).toBe('already_up_to_date');
    });

    it('devuelve 409 cuando el reloj esta offline', async () => {
      repushSpace2Credentials.mockRejectedValue(
        new ConnectivityActionError('watch_offline', 409, 'offline')
      );

      const response = await request(app)
        .post('/wearer/connectivity/space2/repush-credentials')
        .set('Authorization', 'Bearer token')
        .send({ watchId: 'w1' });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('watch_offline');
    });

    it('devuelve 200 cuando se ejecuta', async () => {
      repushSpace2Credentials.mockResolvedValue({ ok: true });

      const response = await request(app)
        .post('/wearer/connectivity/space2/repush-credentials')
        .set('Authorization', 'Bearer token')
        .send({ watchId: 'w1' });

      expect(response.status).toBe(200);
      expect(repushSpace2Credentials).toHaveBeenCalledWith('w1');
    });
  });

  describe('POST /wearer/connectivity/space34/install-auth-manager', () => {
    it('devuelve 400 si falta watchId', async () => {
      const response = await request(app)
        .post('/wearer/connectivity/space34/install-auth-manager')
        .set('Authorization', 'Bearer token')
        .send({});

      expect(response.status).toBe(400);
      expect(installAuthManagerApk).not.toHaveBeenCalled();
    });

    it('devuelve 400 con code cuando el modelo no aplica', async () => {
      installAuthManagerApk.mockRejectedValue(
        new ConnectivityActionError('unsupported_model', 400, 'nope')
      );

      const response = await request(app)
        .post('/wearer/connectivity/space34/install-auth-manager')
        .set('Authorization', 'Bearer token')
        .send({ watchId: 'w1' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('unsupported_model');
    });

    it('devuelve 200 con el id del push', async () => {
      installAuthManagerApk.mockResolvedValue({ id: 'push-1' });

      const response = await request(app)
        .post('/wearer/connectivity/space34/install-auth-manager')
        .set('Authorization', 'Bearer token')
        .send({ watchId: 'w1' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: { id: 'push-1' } });
    });
  });
});

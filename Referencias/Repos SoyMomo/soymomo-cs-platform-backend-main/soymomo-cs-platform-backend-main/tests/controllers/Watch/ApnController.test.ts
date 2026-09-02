import 'reflect-metadata';

import request from 'supertest';

import { app } from '../../../src/app';
import { ApnActionError } from '../../../src/interfaces/ApnIfcs';
import { ApnService } from '../../../src/services/Watch/ApnService';

jest.mock('../../../src/services/Watch/ApnService');
jest.mock('cognito-express', () => {
  return jest.fn().mockImplementation(() => {
    return {
      validate: jest.fn((_token: string, callback: Function) => {
        callback(null);
      }),
    };
  });
});

const getCountries = ApnService.prototype.getCountries as jest.Mock;
const getCatalog = ApnService.prototype.getCatalog as jest.Mock;
const sendApn = ApnService.prototype.sendApn as jest.Mock;

describe('ApnController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /wearer/apn/countries', () => {
    it('devuelve 200 con los paises', async () => {
      const countries = [{ country: 'CL', count: 9 }];
      getCountries.mockResolvedValue(countries);

      const response = await request(app)
        .get('/wearer/apn/countries')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: countries });
    });

    it('no cae en la ruta de catalogo tomando "countries" como watchId', async () => {
      getCountries.mockResolvedValue([]);

      await request(app)
        .get('/wearer/apn/countries')
        .set('Authorization', 'Bearer token');

      expect(getCatalog).not.toHaveBeenCalled();
    });
  });

  describe('GET /wearer/apn/:watchId', () => {
    it('devuelve 200 con el catalogo', async () => {
      const catalog = { supported: true, track: 'protocol', options: [] };
      getCatalog.mockResolvedValue(catalog);

      const response = await request(app)
        .get('/wearer/apn/watch-1')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: catalog });
      expect(getCatalog).toHaveBeenCalledWith('watch-1', undefined);
    });

    it('pasa el pais cuando viene por query', async () => {
      getCatalog.mockResolvedValue({ supported: true });

      await request(app)
        .get('/wearer/apn/watch-1?country=ES')
        .set('Authorization', 'Bearer token');

      expect(getCatalog).toHaveBeenCalledWith('watch-1', 'ES');
    });

    it('devuelve 404 si el wearer no existe', async () => {
      getCatalog.mockResolvedValue(null);

      const response = await request(app)
        .get('/wearer/apn/no-existe')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /wearer/apn/send', () => {
    it('devuelve 200 con el resultado del envio', async () => {
      const result = {
        track: 'push',
        apnKey: 'cl-entel-soymomo',
        pushId: 'p1',
      };
      sendApn.mockResolvedValue(result);

      const response = await request(app)
        .post('/wearer/apn/send')
        .set('Authorization', 'Bearer token')
        .send({ watchId: 'watch-1', apnId: 'apn-1' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: result });
      expect(sendApn).toHaveBeenCalledWith('watch-1', 'apn-1');
    });

    it.each([
      ['sin watchId', { apnId: 'apn-1' }],
      ['sin apnId', { watchId: 'watch-1' }],
      ['vacio', {}],
    ])('devuelve 400 %s', async (_caso, body) => {
      const response = await request(app)
        .post('/wearer/apn/send')
        .set('Authorization', 'Bearer token')
        .send(body);

      expect(response.status).toBe(400);
      expect(sendApn).not.toHaveBeenCalled();
    });

    it('traduce el ApnActionError a status y code JSON', async () => {
      sendApn.mockRejectedValue(
        new ApnActionError('no_push_token', 409, 'The watch has no pushy token')
      );

      const response = await request(app)
        .post('/wearer/apn/send')
        .set('Authorization', 'Bearer token')
        .send({ watchId: 'watch-1', apnId: 'apn-1' });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        code: 'no_push_token',
        message: 'The watch has no pushy token',
      });
    });
  });
});

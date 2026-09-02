import 'reflect-metadata';

import request from 'supertest';
import { container } from 'tsyringe';

import { app } from '../../../src/app';
import type ChallengeNameTypes from '../../../src/interfaces/ChallengeNamesIfc';
import { CongnitoAuthService } from '../../../src/services/Auth/CognitoAuthService';

jest.mock('../../../src/services/Auth/CognitoAuthService');
jest.mock('cognito-express', () => {
  return jest.fn().mockImplementation(() => {
    return {
      validate: jest.fn((_token: string, callback: Function) => callback(null)),
    };
  });
});

const challengeTypes: ChallengeNameTypes = {
  adminNoSrpAuth: 'ADMIN_NO_SRP_AUTH',
  customChallenge: 'CUSTOM_CHALLENGE',
  devicePasswordVerifier: 'DEVICE_PASSWORD_VERIFIER',
  deviceSrpAuth: 'DEVICE_SRP_AUTH',
  mfaSetup: 'MFA_SETUP',
  newPasswordRequired: 'NEW_PASSWORD_REQUIRED',
  passwordVerifier: 'PASSWORD_VERIFIER',
  selectMfaType: 'SELECT_MFA_TYPE',
  smsMfa: 'SMS_MFA',
  softwareTokenMfa: 'SOFTWARE_TOKEN_MFA',
};

describe('AuthController', () => {
  let mockLogin: any;
  let mockRespondToAuthChallenge: any;

  beforeAll(() => {
    mockLogin = jest.fn();
    mockRespondToAuthChallenge = jest.fn();

    // Mocking CongnitoAuthService
    (
      CongnitoAuthService as jest.MockedClass<typeof CongnitoAuthService>
    ).mockImplementation(() => {
      return {
        login: mockLogin,
        respondToAuthChallenge: mockRespondToAuthChallenge,
      } as Partial<CongnitoAuthService> as CongnitoAuthService;
    });

    // Registering mocked service in container
    container.registerInstance(
      CongnitoAuthService,
      container.resolve(CongnitoAuthService)
    );
  });

  it('/login - SUCCESS', async () => {
    const loginData = { email: 'test@test.com', password: 'password' };

    mockLogin.mockResolvedValue({ accessToken: 'access_token' });

    const response = await request(app).post('/auth/login').send(loginData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accessToken: 'access_token' });
    expect(mockLogin).toHaveBeenCalledWith(loginData);
  });

  it('/respondToAuthChallenge - SUCCESS', async () => {
    const challengeData = {
      challengeName: challengeTypes.customChallenge,
      challengeResponses: {},
      session: 'session',
    };

    mockRespondToAuthChallenge.mockResolvedValue({
      accessToken: 'access_token',
    });

    const response = await request(app)
      .post('/auth/respondToAuthChallenge')
      .send(challengeData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accessToken: 'access_token' });
    expect(mockRespondToAuthChallenge).toHaveBeenCalledWith(
      challengeData.challengeName,
      challengeData.challengeResponses,
      challengeData.session
    );
  });

  it('should return 400 if no password', async () => {
    const loginData = { email: 'test@mail.com' };

    mockLogin.mockResolvedValue({ accessToken: 'access_token' });

    const response = await request(app).post('/auth/login').send(loginData);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'No email or password provided' });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should return 400 if no email', async () => {
    const loginData = { password: 'password' };

    mockLogin.mockResolvedValue({ accessToken: 'access_token' });

    const response = await request(app).post('/auth/login').send(loginData);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'No email or password provided' });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should throw error if login fails', async () => {
    const loginData = { email: 'test@mail.com', password: 'password' };

    mockLogin.mockRejectedValue(new Error('Login failed'));

    const response = await request(app).post('/auth/login').send(loginData);

    expect(response.status).toBe(500);
    expect(mockLogin).toHaveBeenCalledWith(loginData);
  });

  it('should return 400 if no challengeName', async () => {
    const challengeData = {
      challengeResponses: {},
      session: 'session',
    };

    mockRespondToAuthChallenge.mockResolvedValue({
      accessToken: 'access_token',
    });

    const response = await request(app)
      .post('/auth/respondToAuthChallenge')
      .send(challengeData);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'No challengeName, session or challengeResponses provided',
    });
    expect(mockRespondToAuthChallenge).not.toHaveBeenCalled();
  });

  it('should return 400 if no challengeResponses', async () => {
    const challengeData = {
      challengeName: challengeTypes.customChallenge,
      session: 'session',
    };

    mockRespondToAuthChallenge.mockResolvedValue({
      accessToken: 'access_token',
    });

    const response = await request(app)
      .post('/auth/respondToAuthChallenge')
      .send(challengeData);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'No challengeName, session or challengeResponses provided',
    });
    expect(mockRespondToAuthChallenge).not.toHaveBeenCalled();
  });

  it('should return 400 if no session', async () => {
    const challengeData = {
      challengeName: challengeTypes.customChallenge,
      challengeResponses: {},
    };

    mockRespondToAuthChallenge.mockResolvedValue({
      accessToken: 'access_token',
    });

    const response = await request(app)
      .post('/auth/respondToAuthChallenge')
      .send(challengeData);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'No challengeName, session or challengeResponses provided',
    });
    expect(mockRespondToAuthChallenge).not.toHaveBeenCalled();
  });

  it('should throw error if respondToAuthChallenge fails', async () => {
    const challengeData = {
      challengeName: challengeTypes.customChallenge,
      challengeResponses: {},
      session: 'session',
    };

    mockRespondToAuthChallenge.mockRejectedValue(
      new Error('Respond to auth challenge failed')
    );

    const response = await request(app)
      .post('/auth/respondToAuthChallenge')
      .send(challengeData);

    expect(response.status).toBe(500);
    expect(mockRespondToAuthChallenge).toHaveBeenCalledWith(
      challengeData.challengeName,
      challengeData.challengeResponses,
      challengeData.session
    );
  });
});

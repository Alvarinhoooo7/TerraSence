import 'reflect-metadata';

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

import type ChallengeNameTypes from '../../../src/interfaces/ChallengeNamesIfc';
import { CongnitoAuthService } from '../../../src/services/Auth/CognitoAuthService';

jest.mock('@aws-sdk/client-cognito-identity-provider');

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

describe('CognitoAuthService', () => {
  let service: CongnitoAuthService;

  const mockInitiateAuth = jest.fn();
  const mockRespondToAuthChallenge = jest.fn();
  const mockGetUser = jest.fn();

  beforeAll(() => {
    (
      CognitoIdentityProviderClient as jest.MockedClass<
        typeof CognitoIdentityProviderClient
      >
    ).mockImplementation(() => {
      return {
        send: jest.fn().mockImplementation((command) => {
          if (command.constructor.name === 'InitiateAuthCommand') {
            return mockInitiateAuth(command);
          }
          if (command.constructor.name === 'RespondToAuthChallengeCommand') {
            return mockRespondToAuthChallenge(command);
          }
          if (command.constructor.name === 'GetUserCommand') {
            return mockGetUser(command);
          }
          return Promise.reject(
            new Error(`Unexpected command: ${command.constructor.name}`)
          );
        }),
      } as Partial<CognitoIdentityProviderClient> as CognitoIdentityProviderClient;
    });

    service = new CongnitoAuthService();
  });

  it('should initiate auth successfully', async () => {
    mockInitiateAuth.mockResolvedValueOnce({
      AuthenticationResult: { AccessToken: 'access_token' },
    });
    mockGetUser.mockResolvedValueOnce({ UserAttributes: { attr1: 'value1' } });

    const result = await service.login({
      email: 'email@example.com',
      password: 'password',
    });

    expect(result).toEqual({
      userAttributes: { attr1: 'value1' },
      AccessToken: 'access_token',
    });
  });

  it('should respond to auth challenge successfully', async () => {
    mockRespondToAuthChallenge.mockResolvedValueOnce({
      AuthenticationResult: { AccessToken: 'access_token' },
    });
    mockGetUser.mockResolvedValueOnce({ UserAttributes: { attr1: 'value1' } });

    const result = await service.respondToAuthChallenge(
      challengeTypes.customChallenge,
      { answer: 'answer' },
      'session'
    );

    expect(result).toEqual({
      userAttributes: { attr1: 'value1' },
      AccessToken: 'access_token',
    });
  });

  it('should return challengeName and session if AuthenticationResult is not present', async () => {
    const email = 'test@test.com';
    const password = 'password123';
    const expectedChallengeName = 'challengeName';
    const expectedSession = 'session123';

    mockInitiateAuth.mockResolvedValue({
      ChallengeName: expectedChallengeName,
      Session: expectedSession,
    });

    const result = await service.login({ email, password });

    expect(result).toEqual({
      challengeName: expectedChallengeName,
      session: expectedSession,
    });
  });

  it('should return challengeName and session if AuthenticationResult is not present in respondToAuthChallenge', async () => {
    const challengeName = challengeTypes.customChallenge;
    const challengeResponses = { response: 'response123' };
    const session = 'session123';
    const expectedChallengeName = 'expectedChallengeName';
    const expectedSession = 'expectedSession123';

    mockRespondToAuthChallenge.mockResolvedValue({
      ChallengeName: expectedChallengeName,
      Session: expectedSession,
    });

    const result = await service.respondToAuthChallenge(
      challengeName,
      challengeResponses,
      session
    );

    expect(result).toEqual({
      challengeName: expectedChallengeName,
      session: expectedSession,
    });
  });
});

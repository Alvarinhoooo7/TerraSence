import type { ChallengeNameType } from '@aws-sdk/client-cognito-identity-provider';
import {
  AuthFlowType,
  CognitoIdentityProviderClient,
  GetUserCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import dotenv from 'dotenv';
import { injectable } from 'tsyringe';

dotenv.config();

@injectable()
export class CongnitoAuthService {
  private config = {
    region: process.env.AWS_DEFAULT_REGION as string,
  };

  private clientId = process.env.COGNITO_CLIENT_ID as string;

  private client: CognitoIdentityProviderClient;

  constructor() {
    this.client = new CognitoIdentityProviderClient(this.config);
  }

  async login({ email, password }: { email: string; password: string }) {
    try {
      const params = {
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      };
      const command = new InitiateAuthCommand(params);
      const response = await this.client.send(command);
      if (!response.AuthenticationResult) {
        return {
          challengeName: response.ChallengeName,
          session: response.Session,
        };
      }
      const userAttributes = await this.getCognitoUser(
        response.AuthenticationResult.AccessToken as string
      );
      return {
        userAttributes,
        emissionTime: Date.now(),
        ...response.AuthenticationResult,
      };
    } catch (error: any) {
      // Handle the error appropriately
      // console.error(error);
      if (error.name === 'NotAuthorizedException') {
        // Handle incorrect username or password
        return { error: 'Incorrect username or password' };
      }
      // Handle other types of errors
      return { error: 'An error occurred during login' };
    }
  }

  async respondToAuthChallenge(
    challengeName: ChallengeNameType,
    challengeResponses: Record<string, string>,
    session: string
  ) {
    const params = {
      ChallengeName: challengeName,
      ClientId: this.clientId,
      ChallengeResponses: challengeResponses,
      Session: session,
    };
    const command = new RespondToAuthChallengeCommand(params);
    const response = await this.client.send(command);
    if (!response.AuthenticationResult) {
      return {
        challengeName: response.ChallengeName,
        session: response.Session,
      };
    }
    const userAttributes = await this.getCognitoUser(
      response.AuthenticationResult.AccessToken as string
    );
    return {
      userAttributes,
      ...response.AuthenticationResult,
    };
  }

  async getCognitoUser(jwtToken: string) {
    const params = {
      AccessToken: jwtToken,
    };

    const command = new GetUserCommand(params);
    const response = await this.client.send(command);

    const userAttributes = response.UserAttributes;
    return userAttributes;
  }
}

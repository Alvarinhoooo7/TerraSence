import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { CongnitoAuthService } from '../../services/Auth/CognitoAuthService';

export const AuthController: Router = Router();

AuthController.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.email || !body.password) {
        res.status(400).send({ message: 'No email or password provided' });
        return;
      }
      const cognitoService = container.resolve(CongnitoAuthService);
      const results = await cognitoService.login(body);
      if (results.error === 'Incorrect username or password') {
        res.status(401).send(results);
      } else {
        res.status(200).send(results);
      }
    } catch (e: any) {
      if (e.error === 'Incorrect username or password') {
        res.status(401).send(e);
      }
      next(e);
    }
  }
);

// ChallengeResponses: { // ChallengeResponsesType
//     "<keys>": "STRING_VALUE",
//  },
AuthController.post(
  '/respondToAuthChallenge',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.challengeName || !body.challengeResponses || !body.session) {
        res.status(400).send({
          message: 'No challengeName, session or challengeResponses provided',
        });
        return;
      }
      const cognitoService = container.resolve(CongnitoAuthService);
      const results = await cognitoService.respondToAuthChallenge(
        body.challengeName,
        body.challengeResponses,
        body.session
      );
      res.status(200).send(results);
    } catch (e) {
      next(e);
    }
  }
);

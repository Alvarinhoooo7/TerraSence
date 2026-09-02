import dotenv from 'dotenv';
import type { NextFunction, Request, Response } from 'express';

dotenv.config();

const CognitoExpress = require('cognito-express');

// Setup CognitoExpress
const cognitoExpress = new CognitoExpress({
  region: process.env.AWS_DEFAULT_REGION,
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'access',
  tokenExpiration: 86400,
});

const validateAuth = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development') {
    next();
    return;
  }

  if (
    req.headers.authorization &&
    req.headers.authorization.split(' ')[0] === 'Bearer'
  ) {
    const token = req.headers.authorization.split(' ')[1];
    cognitoExpress.validate(token, function (err: Error) {
      if (err) {
        res.status(401).send(err);
      } else {
        next();
      }
    });
  } else {
    res.status(401).send('No token provided.');
  }
};

export { validateAuth };

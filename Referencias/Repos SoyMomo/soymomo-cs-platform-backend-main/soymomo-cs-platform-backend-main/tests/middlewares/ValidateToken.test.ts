import 'reflect-metadata';

import type { NextFunction, Request, Response } from 'express';

import { validateAuth } from '../../src/middlewares/ValidateToken';

// Mocking CognitoExpress
jest.mock('cognito-express', () => {
  return jest.fn().mockImplementation(() => {
    return {
      validate: (token: string, cb: Function) => {
        if (token === 'valid_token') {
          cb(null);
        } else {
          cb(new Error('Invalid token'));
        }
      },
    };
  });
});

describe('validateAuth middleware', () => {
  const mockRequest = (token: string): Partial<Request> => {
    return {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
  };

  const mockRequestWithoutHeader = (): Partial<Request> => {
    return {
      headers: {},
    };
  };

  const mockResponse: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };

  const nextFunction: NextFunction = jest.fn();

  it('returns 401 if no bearer auth header is provided', () => {
    validateAuth(
      mockRequestWithoutHeader() as Request,
      mockResponse as Response,
      nextFunction
    );
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.send).toHaveBeenCalledWith('No token provided.');
  });

  it('calls next if token is valid', () => {
    validateAuth(
      mockRequest('valid_token') as Request,
      mockResponse as Response,
      nextFunction
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  it('returns 401 if token is invalid', () => {
    validateAuth(
      mockRequest('invalid_token') as Request,
      mockResponse as Response,
      nextFunction
    );
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.send).toHaveBeenCalled();
  });

  it('returns 401 if no token is provided', () => {
    validateAuth(
      mockRequest('') as Request,
      mockResponse as Response,
      nextFunction
    );
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.send).toHaveBeenCalled();
  });
});

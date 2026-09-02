import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

/**
 * Signs a request with JWT using the app ID as username
 * @returns {string} JWT token
 * @throws {Error} If JWT_SECRET is not found or if there's an error signing the token
 */
export const signRequest = (): string => {
  try {
    const { PARSE_WATCH_APP_ID, JWT_SECRET } = process.env;

    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not found in environment variables');
    }

    if (!PARSE_WATCH_APP_ID) {
      throw new Error('PARSE_WATCH_APP_ID not found in environment variables');
    }

    const token = jwt.sign(
      {
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        data: { username: PARSE_WATCH_APP_ID },
      },
      JWT_SECRET
    );

    return token;
  } catch (error) {
    const err = error as Error;
    throw new Error(`Error signing request with JWT: ${err.message}`);
  }
};

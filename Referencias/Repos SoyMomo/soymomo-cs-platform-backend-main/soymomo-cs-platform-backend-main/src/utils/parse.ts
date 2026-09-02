/* istanbul ignore file */
import dotenv from 'dotenv';
import type { NextFunction, Request, Response } from 'express';
import Parse from 'parse/node';

dotenv.config();

export function parseWatchMiddleware(
  _: Request,
  __: Response,
  next: NextFunction
) {
  Parse.initialize(
    process.env.PARSE_WATCH_APP_ID as string,
    process.env.PARSE_WATCH_JS_KEY as string,
    process.env.PARSE_WATCH_MASTER_KEY as string
  );
  Parse.serverURL = process.env.PARSE_WATCH_SERVER_URL as string;
  next();
}

export function parseTabletMiddleware(
  _: Request,
  __: Response,
  next: NextFunction
) {
  Parse.initialize(
    process.env.PARSE_TABLET_APP_ID as string,
    process.env.PARSE_TABLET_JS_KEY as string,
    process.env.PARSE_TABLET_MASTER_KEY as string
  );
  Parse.serverURL = process.env.PARSE_TABLET_SERVER_URL as string;
  next();
}

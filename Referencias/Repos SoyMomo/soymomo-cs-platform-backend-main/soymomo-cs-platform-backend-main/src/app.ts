import 'reflect-metadata';

import cors from 'cors';
import dotenv from 'dotenv';
import type { Application } from 'express';
import express from 'express';

import { routes } from './routes';

dotenv.config();

export const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

routes(app);

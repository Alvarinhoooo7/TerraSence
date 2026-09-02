import axios from 'axios';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import SubscriptionService from '../../services/Watch/SubscriptionService';
import STATUS_CODES from '../../utils/statusCodes';

export const SubscriptionController: Router = Router();

const requestFormatter = (action: string, environment: string) => {
  let url = '';

  if (action === 'scheduledTerminate') {
    // Production
    url = `${process.env.PARSE_WATCH_SERVER_URL}/functions/${action}SoyMomoSubscription`;
    // Development
    if (environment === 'dev') {
      url = `${process.env.WATCH_CLOUD_SERVER_URL}/parse/functions/${action}SoyMomoSubscription`;
    }
  } else {
    return { url, headers: {}, error: true };
  }

  // Producción
  let headers = {
    'X-Parse-Application-Id': `${process.env.PARSE_WATCH_APP_ID}`,
    'X-Parse-Master-Key': `${process.env.PARSE_WATCH_MASTER_KEY}`,
  };

  // Development
  if (environment === 'dev') {
    headers = {
      'X-Parse-Application-Id': `${process.env.WATCH_CLOUD_APP_ID}`,
      'X-Parse-Master-Key': `${process.env.WATCH_CLOUD_MASTER_KEY}`,
    };
  }

  return { url, headers };
};

SubscriptionController.put(
  '/terminate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const { iccId, reason, imei } = body;

      const dev = false;
      let environment = 'prod';
      if (dev) {
        environment = 'dev';
      }

      // #region Resolver la suscripción que la cloud va a cancelar

      const subscriptionService = container.resolve(SubscriptionService);
      const subscription = await subscriptionService.getTerminableSubscription({
        imei,
        iccId,
      });

      if (!subscription) {
        return res.status(404).send({
          message:
            'Error, no se encontró una suscripción cancelable (activa, pendiente de activación o suspendida) para este iccId/imei. Puede que ya esté cancelada.',
        });
      }

      // La cloud solo acepta iccId, así que se toma el de la suscripción resuelta:
      // el request puede haber llegado solo con imei.
      const targetIccId = subscription.get('iccId');

      if (!targetIccId) {
        return res.status(400).send({
          message: 'Error, la suscripción encontrada no tiene iccId asociado',
        });
      }

      // #endregion

      const { url, headers, error } = requestFormatter(
        'scheduledTerminate',
        environment
      );

      if (error) {
        return res.status(400).send({
          message:
            'Error, no se pudo identificar el proveedor de esta suscripción',
        });
      }

      const cloudResponse = await axios.post(
        url,
        { iccId: targetIccId, reason },
        { headers }
      );

      const resBody = cloudResponse.data;

      const { result } = resBody;

      // La cloud siempre responde { status, message }; si falta el envoltorio
      // es que Parse devolvió otra cosa (función inexistente, credenciales, etc.)
      if (!result || typeof result.status !== 'number') {
        return res.status(502).send({
          message: 'Error, respuesta inesperada del servidor de suscripciones',
          data: resBody,
        });
      }

      if (result.status === 200) {
        return res.status(201).send({
          message: 'Suscripción cancelada con éxito',
          status: STATUS_CODES.terminated,
          scheduledDeactivationDate: result.scheduledDeactivationDate,
        });
      }

      // La cloud reporta el motivo real en `message` (nunca en `error`), así que
      // se propaga tal cual: es la única pista que tiene atención al cliente.
      const cloudMessage =
        result.message || 'La cloud no entregó un motivo del fallo';

      // 4xx de la cloud es un problema del request; el resto es fallo aguas arriba
      const responseStatus =
        result.status >= 400 && result.status < 500 ? result.status : 502;

      return res.status(responseStatus).send({
        message: `Error al cancelar la suscripción: ${cloudMessage}`,
        data: result,
      });
    } catch (error) {
      res.status(500).send({
        message: 'Error interno del servidor',
      });
      return next(error);
    }
  }
);

SubscriptionController.put(
  '/transferToNewSim',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const { currentIccId, newIccId } = body;
      if (!currentIccId || !newIccId) {
        res.status(400).send({
          message: 'Error, faltan parámetros',
          body,
        });
      }
      // call cloud code function
      const subscriptionService = container.resolve(SubscriptionService);
      const cloudResponse = await subscriptionService.transferToNewSim({
        currentIccId,
        newIccId,
      });
      res.status(200).send(cloudResponse);
    } catch (error) {
      next(error);
    }
  }
);

SubscriptionController.put(
  '/changeWatch',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const { subscriptionId, imei } = body;

      if (!subscriptionId || !imei) {
        return res.status(400).send({
          message:
            'Error, faltan parámetros: subscriptionId e imei son requeridos',
          body,
        });
      }

      const subscriptionService = container.resolve(SubscriptionService);
      const cloudResponse =
        await subscriptionService.changeSubscriptionWatchByImei({
          subscriptionId,
          imei,
        });

      return res.status(200).send(cloudResponse);
    } catch (error) {
      return next(error);
    }
  }
);

SubscriptionController.put(
  '/changeApioPlan',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const { iccId, targetPlanId } = body;

      if (!iccId || !targetPlanId) {
        return res.status(400).send({
          message:
            'Error, faltan parámetros: iccId y targetPlanId son requeridos',
          body,
        });
      }

      const subscriptionService = container.resolve(SubscriptionService);
      const cloudResponse =
        await subscriptionService.changeApioSubscriptionPlan({
          iccId,
          targetPlanId,
        });

      return res.status(200).send(cloudResponse);
    } catch (error) {
      return next(error);
    }
  }
);

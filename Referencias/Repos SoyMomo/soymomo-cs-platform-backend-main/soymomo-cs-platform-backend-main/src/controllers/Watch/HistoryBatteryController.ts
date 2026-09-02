import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import { HistoryBatteryService } from '../../services/Watch/HistoryBatteryService';
import { HistoryLocationService } from '../../services/Watch/HistoryLocationService';

export const HistoryBatteryController: Router = Router();

HistoryBatteryController.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ENABLE_DATE_RESTRICTIONS = process.env.NODE_ENV !== 'development';

      const { query } = req;

      if (!query.deviceId) {
        res.status(400).send({ message: 'No deviceId provided' });
        return;
      }

      let from: Date | undefined = query.from
        ? new Date(query.from as string)
        : undefined;
      let to: Date | undefined = query.to
        ? new Date(query.to as string)
        : undefined;

      if (ENABLE_DATE_RESTRICTIONS) {
        const now = new Date();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);

        // Si no se pasa ningún parámetro, se usa la última semana por defecto
        if (!from && !to) {
          from = oneWeekAgo;
          to = now;
        }

        // Si solo se pasa "from", limitar "to" a "from + 7 días"
        if (from && !to) {
          to = new Date(from);
          to.setDate(from.getDate() + 7);
        }

        // Si solo se pasa "to", limitar "from" a "to - 7 días"
        if (!from && to) {
          from = new Date(to);
          from.setDate(to.getDate() - 7);
        }

        // Validar que el rango no exceda 7 días
        if (from && to) {
          const maxAllowedRange = new Date(from);
          maxAllowedRange.setDate(from.getDate() + 7);
          if (to > maxAllowedRange) {
            to = maxAllowedRange;
          }
        }
      } else {
        // Si las restricciones están desactivadas, permitir cualquier rango de fechas sin límite
        from = from ?? undefined;
        to = to ?? undefined;
      }

      const batteryService = container.resolve(HistoryBatteryService);
      const locationService = container.resolve(HistoryLocationService);

      const [batteryResults, locationResults] = await Promise.all([
        batteryService.getBatteryHistory({
          deviceId: query.deviceId as string,
          from,
          to,
        }),
        locationService.getLocationBatteryHistory({
          deviceId: query.deviceId as string,
          from,
          to,
        }),
      ]);

      const combinedResults = [...batteryResults, ...locationResults];

      const uniqueResults = Array.from(
        new Map(
          combinedResults.map((item) => [
            `${item.deviceId}-${item.timestamp}`,
            item,
          ])
        ).values()
      );

      uniqueResults.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      if (uniqueResults.length === 0) {
        res.status(204).send({ message: 'No battery history found' });
        return;
      }

      res.status(200).send({ data: uniqueResults });
    } catch (e) {
      next(e);
    }
  }
);

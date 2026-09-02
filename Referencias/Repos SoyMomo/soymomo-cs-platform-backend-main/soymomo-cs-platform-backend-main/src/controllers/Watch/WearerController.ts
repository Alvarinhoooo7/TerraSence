/* eslint-disable consistent-return */
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { container } from 'tsyringe';

import type Subscription from '@/models/Watch/Subscription';

import type Wearer from '../../models/Watch/Wearer';
import SubscriptionService from '../../services/Watch/SubscriptionService';
import { UserService } from '../../services/Watch/UserService';
import { WearerService } from '../../services/Watch/WearerService';

export const WearerController: Router = Router();

function validatePhoneFormat(str: string) {
  const regex = /^\+[0-9]{11}$/;
  return regex.test(str);
}

WearerController.get(
  '/getWearerFriends',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      if (!query.deviceId && !query.imei) {
        res.status(400).send({ message: 'No deviceId, or imei provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const results = await wearerService.getWearerFriends(query);
      res.status(200).send({ data: results ?? [] });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.patch(
  '/changeWearerUserInCharge',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if ((!body.deviceId && !body.imei) || !body.userInChargeId) {
        res
          .status(400)
          .send({ message: 'No deviceId (or imei) or userInCharge provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const results = await wearerService.changeWearerUserInCharge(body);
      if (!results) {
        res.status(400).send({ message: 'No wearer found' });
        return;
      }
      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.get(
  '/getWearerByObjectId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      if (!query.objectId) {
        res.status(400).send({ message: 'No objectId provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const results = await wearerService.getWearerByObjectId(query);
      if (!results || results.length === 0) {
        res.status(204).send({ message: 'No wearer found' });
        return;
      }
      let finalResponse;
      if (results.length > 0) {
        finalResponse = results.map((wearer: Wearer) => {
          const settings = wearer.get('settings');
          const mapResult = {
            settings: null,
          };
          if (settings) {
            mapResult.settings = settings.toJSON();
          }
          return mapResult;
        });
      }
      res.status(200).send({ data: results, includes: finalResponse });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.get(
  '/getWearerByDeviceIdOrImei',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      const body = query;
      if (!body.deviceId && !body.imei) {
        res
          .status(400)
          .send({ message: 'No deviceId, email, or imei provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const results = await wearerService.getWearerByDeviceIdOrImei(body);
      if (!results || results.length === 0) {
        res.status(204).send({ message: 'No wearer found' });
        return;
      }

      let finalResponse;
      if (results.length > 0) {
        finalResponse = results.map((wearer: Wearer) => {
          const settings = wearer.get('settings');
          const mapResult = {
            settings: null,
          };
          if (settings) {
            mapResult.settings = settings.toJSON();
          }
          return mapResult;
        });
      }
      res.status(200).send({ data: results, includes: finalResponse });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.get(
  '/getWearerByString',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      const body = query;
      if (!body.queryStr) {
        res.status(400).send({ message: 'No information provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const results = await wearerService.getWearerByString(body);
      if (!results || results.length === 0) {
        res.status(204).send({ message: 'No wearer found' });
        return;
      }

      let finalResponse;
      // TODO: If redundante?
      // if (results.length > 0) {
      //   finalResponse = results.map((wearer: Wearer) => {
      //     const settings = wearer.get('settings');
      //     const mapResult = {
      //       settings: null,
      //     };
      //     if (settings) {
      //       mapResult.settings = settings.toJSON();
      //     }
      //     return mapResult;
      //   });
      // }
      res.status(200).send({ data: results, includes: finalResponse });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.post(
  '/powerOff',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.deviceId) {
        res.status(400).send({ message: 'No deviceId provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const result = await wearerService.powerOff(body);
      res.status(200).send({ data: result });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.post(
  '/find',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.deviceId) {
        res.status(400).send({ message: 'No deviceId provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const result = await wearerService.findWatch(body);
      res.status(200).send({ data: result });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.post(
  '/factory',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.deviceId) {
        res.status(400).send({ message: 'No deviceId provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const result = await wearerService.factoryReset(body);
      res.status(200).send({ data: result });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.post(
  '/chargeContacts',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.deviceId) {
        res.status(400).send({ message: 'No deviceId provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const result = await wearerService.chargeContacts(body);
      res.status(200).send({ data: result });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.post(
  '/chargeSettings',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.deviceId) {
        res.status(400).send({ message: 'No deviceId provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const result = await wearerService.chargeSettings(body);
      res.status(200).send({ data: result });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.get(
  '/getContacts',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      if (!query.deviceId && !query.imei) {
        res.status(400).send({ message: 'No deviceId, or imei provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const results = await wearerService.getContacts(query);
      if (!results || results.length === 0) {
        res.status(204).send({ message: 'No wearer found' });
        return;
      }
      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.post(
  '/updateWearerUserInformation',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.deviceId && !body.imei) {
        res.status(400).send({ message: 'No deviceId or imei provided' });
        return;
      }
      if (body.phone) {
        if (!validatePhoneFormat(body.phone)) {
          res.status(400).send({ message: 'Phone format is not valid' });
          return;
        }
      }
      const wearerService = container.resolve(WearerService);
      const results = await wearerService.updateWearerUserInformation(body);
      if (!results) {
        res.status(400).send({ message: 'No wearer found' });
        return;
      }
      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.post(
  '/updateWearerSettings',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.deviceId && !body.imei) {
        res.status(400).send({ message: 'No deviceId or imei provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const results = await wearerService.updateWearerSettings(body);
      if (!results) {
        res.status(204).send({ message: 'No wearer found' });
        return;
      }
      res.status(200).send({ data: results });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.post(
  '/sendMessageToWearer',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.deviceId || !body.message) {
        res.status(400).send({ message: 'No deviceId, message' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      await wearerService.sendMessageToWearer(body);
      res.status(200).send({ data: 'success' });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.get(
  '/getSIMInfo',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      if (!query.imei) {
        res.status(200).send({ message: 'No imei provided', data: null });
        return;
      }
      if (typeof query.imei !== 'string') {
        res.status(400).send({ message: 'Imei must be a string', data: null });
        return;
      }
      // const imei = Array.isArray(query.imei) ? query.imei[0] : query.imei;
      const subscriptionService = container.resolve(SubscriptionService);
      const results = await subscriptionService.getSIMInfo({
        imei: query.imei,
      });

      const response: { results: Subscription[]; remainingTrialDays: number } =
        { results, remainingTrialDays: -1 };

      // Añadimos días de prueba restante
      if (results.length !== 0 && results[0]) {
        const startDate = new Date(results[0].plan.createdAt);
        const currentDate = new Date();
        const diffInTime = currentDate.getTime() - startDate.getTime();
        const diffInDays = Math.floor(diffInTime / (1000 * 60 * 60 * 24));
        const remaining = Math.max(
          0,
          Number(results[0].plan.toJSON().trialDays) - diffInDays
        );
        response.remainingTrialDays = remaining;
      }

      if (!results) {
        res.status(204).send({ message: 'No sim found' });
        return;
      }
      res.status(200).send({ data: response });
    } catch (error) {
      next(error);
    }
  }
);

WearerController.post(
  '/resetWearer',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.deviceId) {
        res.status(400).send({ message: 'No deviceId provided' });
        return;
      }
      const { deviceId } = body;
      const wearerService = container.resolve(WearerService);
      const response = await wearerService.resetWearer({ deviceId });
      res.status(200).send({ data: response });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.put(
  '/swapWearers',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.deviceId || !body.newDeviceId) {
        res
          .status(400)
          .send({ message: 'No deviceId or newDeviceId provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const response = await wearerService.swapWearers({
        originId: body.deviceId,
        destinationId: body.newDeviceId,
      });
      res.status(200).send({ data: response });
    } catch (e) {
      next(e);
    }
  }
);

WearerController.put(
  '/changeAdmin',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.deviceId || !body.newAdminId) {
        res.status(400).send({ message: 'No deviceId or newAdminId provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const userService = container.resolve(UserService);
      const wearerResults = await wearerService.getWearerByDeviceIdOrImei({
        deviceId: body.deviceId,
      });
      if (!wearerResults || wearerResults.length === 0) {
        res.status(204).send({ message: 'No wearer found' });
        return;
      }
      const wearer = wearerResults[0];
      if (!wearer) {
        res.status(204).send({ message: 'No wearer found' });
        return;
      }
      const { newAdminId }: { newAdminId: string } = body;
      const newAdmin = await userService.getUserByObjectId(newAdminId);
      if (!newAdmin) {
        res.status(400).send({ message: 'No new admin found' });
        return;
      }
      wearer.userInCharge = newAdmin;
      await wearer.save(null, { useMasterKey: true });
      res.status(200).send({ data: wearer });
    } catch (e) {
      next(e);
    }
  }
);
WearerController.post(
  '/createContact',
  async function createContact(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { body } = req;
      if ((!body.deviceId && !body.imei) || !body.hardwareModel) {
        return res
          .status(400)
          .send({ message: 'No deviceId (or imei) or hardwareModel provided' });
      }
      if (!body.name || !body.phone) {
        return res.status(400).send({ message: 'name and phone are required' });
      }
      if (!validatePhoneFormat(body.phone)) {
        return res.status(400).send({ message: 'Invalid phone format' });
      }
      const wearerService = container.resolve(WearerService);
      const response = await wearerService.createContact({
        deviceId: body.deviceId,
        imei: body.imei,
        hardwareModel: body.hardwareModel,
        name: body.name,
        phone: body.phone,
        sos: body.sos ?? false,
        chatEnabled: body.chatEnabled ?? false,
      });
      if (!response) {
        return res
          .status(400)
          .send({ message: 'Wearer not found or unsupported hardwareModel' });
      }
      return res.status(201).send({ data: response });
    } catch (e) {
      return next(e);
    }
  }
);

WearerController.put(
  '/updateContact',
  async function updateContact(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { body } = req;
      if (!body.objectId || !body.hardwareModel) {
        return res
          .status(400)
          .send({ message: 'No deviceId or hardwareModel provided' });
      }

      if (body.phone && !validatePhoneFormat(body.phone)) {
        return res.status(400).send({ message: 'Invalid phone format' });
      }

      const wearerService = container.resolve(WearerService);
      if (
        body.hardwareModel === 'Soymomo_Space_Lite_v1' ||
        body.hardwareModel === 'Soymomo_Space_v1'
      ) {
        const response = await wearerService.updateContact({
          objectId: body.objectId,
          name: body.name,
          phone: body.phone,
          sos: body.sos,
        });

        return res.status(200).send({ data: response });
      }
      if (
        body.hardwareModel === 'Soymomo_Space_v2' ||
        body.hardwareModel === 'Soymomo_Space_v3' ||
        body.hardwareModel === 'Soymomo_Space_v4'
      ) {
        const response = await wearerService.updatePhoneContact({
          objectId: body.objectId,
          name: body.name,
          phone: body.phone,
          sos: body.sos,
        });

        return res.status(200).send({ data: response });
      }
      return res.status(400).send({ message: 'Unsupported hardwareModel' });
    } catch (e) {
      return next(e);
    }
  }
);

WearerController.delete(
  '/deleteContact',
  async function deleteContact(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { body } = req;
      if (!body.objectId || !body.hardwareModel) {
        return res
          .status(400)
          .send({ message: 'No objectId or hardwareModel provided' });
      }
      const wearerService = container.resolve(WearerService);

      if (
        body.hardwareModel === 'Soymomo_Space_Lite_v1' ||
        body.hardwareModel === 'Soymomo_Space_v1'
      ) {
        const response = await wearerService.deleteContact({
          objectId: body.objectId,
        });
        return res.status(200).send({ data: response });
      }
      if (
        body.hardwareModel === 'Soymomo_Space_v2' ||
        body.hardwareModel === 'Soymomo_Space_v3' ||
        body.hardwareModel === 'Soymomo_Space_v4'
      ) {
        const response = await wearerService.deletePhoneContact({
          objectId: body.objectId,
        });
        return res.status(200).send({ data: response });
      }
      return res.status(400).send({ message: 'Unsupported hardwareModel' });
    } catch (e) {
      return next(e);
    }
  }
);

WearerController.put(
  '/editWearer',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      if (!body.objectId) {
        res.status(400).send({ message: 'No wearer objectId provided' });
        return;
      }
      if (!body.attributes) {
        res.status(400).send({ message: 'No attributes provided' });
        return;
      }
      const wearerService = container.resolve(WearerService);
      const wearer = await wearerService.getWearerByObjectId({
        objectId: body.objectId,
      });
      const wearerToUpdate = wearer[0];
      if (wearer.length === 0 || !wearerToUpdate) {
        res.status(204).send({ message: 'No wearer found' });
        return;
      }

      const { attributes } = body;

      const phoneRegex = /^\+?56\s?0?9\s?[987654321]\d{7}$/;
      const birthdayRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/; // Adjust the format as needed
      const numericRegex = /^\d+(\.\d+)?$/; // For height, weight, and hearts

      if (attributes.firstName) {
        wearerToUpdate.firstName = attributes.firstName;
      }
      if (attributes.lastName) {
        wearerToUpdate.lastName = attributes.lastName;
      }
      if (attributes.phone) {
        if (!phoneRegex.test(attributes.phone)) {
          res.status(400).send({ message: 'Invalid phone format' });
          return;
        }
        wearerToUpdate.phone = attributes.phone;
      }
      if (attributes.birthday) {
        if (!birthdayRegex.test(attributes.birthday)) {
          res.status(400).send({ message: 'Invalid birthday format' });
          return;
        }
        wearerToUpdate.birthday = new Date(attributes.birthday);
      }
      if (attributes.height) {
        if (!numericRegex.test(attributes.height)) {
          res.status(400).send({ message: 'Invalid height format' });
          return;
        }
        wearerToUpdate.height = parseFloat(attributes.height);
      }
      if (attributes.weight) {
        if (!numericRegex.test(attributes.weight)) {
          res.status(400).send({ message: 'Invalid weight format' });
          return;
        }
        wearerToUpdate.weight = parseFloat(attributes.weight);
      }
      if (attributes.hearts) {
        if (!numericRegex.test(attributes.hearts)) {
          res.status(400).send({ message: 'Invalid hearts format' });
          return;
        }
        wearerToUpdate.hearts = parseInt(attributes.hearts, 10);
      }
      await wearerToUpdate.save(null, { useMasterKey: true });
      res.status(200).send({ message: 'Wearer updated', data: wearerToUpdate });
    } catch (e) {
      next(e);
    }
  }
);

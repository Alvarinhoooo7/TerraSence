import axios from 'axios';
import dotenv from 'dotenv';
import { injectable } from 'tsyringe';

import type {
  EntelDevice,
  EntelDeviceResponse,
  EntelServiceError,
} from '../../interfaces/EntelServiceIfcs';
import { signRequest } from '../../utils/signRequests';

dotenv.config();

const BASE_ENDPOINT = process.env.ENTEL_SERVICE_URL;

const BYTES_TO_MB = 1024 * 1024; // 1 MB = 1,048,576 bytes

@injectable()
export class EntelService {
  private async sendRequest<T>(
    iccId: string,
    method: string,
    endpoint: string,
    payload?: Record<string, any>
  ): Promise<T> {
    try {
      const jwtToken = signRequest();
      const request = {
        url: endpoint,
        method,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Accept-Type': 'application/json;charset=UTF-8',
          Authorization: `Bearer ${jwtToken}`,
        },
        ...(method === 'post' || method === 'put' ? { data: payload } : {}),
      };

      const { data } = await axios.request<T>(request);
      return data;
    } catch (error) {
      throw this.handleError(error as Error, { iccId });
    }
  }

  private handleError(error: Error, params: { iccId: string }): Error {
    const { iccId } = params;
    const baseMessage = 'Error in the request soymomo-entel-service.';

    const serviceError: EntelServiceError = {
      payload: params,
      stack: error.stack,
      message: baseMessage,
    };

    if (axios.isAxiosError(error) && error.response?.data) {
      serviceError.data = error.response.data;
      serviceError.message = `${baseMessage} ICCID: ${iccId}. ${
        error.response.data?.message || error.message
      }`;
    } else {
      serviceError.message = `${baseMessage} ICCID: ${iccId}. ${error.message}`;
    }

    return new Error(serviceError.message);
  }

  async fetchDevice(iccId: string): Promise<EntelDevice> {
    try {
      const endpoint = `${BASE_ENDPOINT}/fetch-entel-device`;
      const response = await this.sendRequest<EntelDeviceResponse>(
        iccId,
        'post',
        endpoint,
        { iccId }
      );

      if (!response.data.msisdn) {
        throw new Error(
          'MSISDN not present in response. Check SoyMomo Entel Service logs.'
        );
      }

      // Convert ctdDataUsage from bytes to megabytes
      return {
        ...response.data,
        ctdDataUsage: Number(
          (response.data.ctdDataUsage / BYTES_TO_MB).toFixed(2)
        ),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Unknown error occurred while fetching device');
    }
  }

  async getAuditHistory(iccId: string): Promise<any> {
    try {
      const endpoint = `${BASE_ENDPOINT}/audit-logs/${iccId}`;
      const response = await this.sendRequest<any>(iccId, 'get', endpoint);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Unknown error occurred while fetching audit history');
    }
  }
}

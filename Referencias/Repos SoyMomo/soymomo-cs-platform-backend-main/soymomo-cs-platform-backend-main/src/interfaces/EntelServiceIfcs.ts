export interface EntelDeviceResponse {
  data: EntelDevice;
  message: string;
}

export interface EntelDevice {
  iccid: string;
  imsi: string;
  msisdn: string;
  imei: string;
  status: string;
  ratePlan: string;
  communicationPlan: string;
  customer: string | null;
  endConsumerId: string;
  dateActivated: string;
  dateAdded: string;
  dateUpdated: string;
  dateShipped: string;
  accountId: string;
  fixedIPAddress: string | null;
  operatorCustom1: string;
  operatorCustom2: string;
  operatorCustom3: string;
  operatorCustom4: string;
  operatorCustom5: string;
  accountCustom1: string;
  accountCustom2: string;
  accountCustom3: string;
  accountCustom4: string;
  accountCustom5: string;
  accountCustom6: string;
  accountCustom7: string;
  accountCustom8: string;
  accountCustom9: string;
  accountCustom10: string;
  customerCustom1: string;
  customerCustom2: string;
  customerCustom3: string;
  customerCustom4: string;
  customerCustom5: string;
  simNotes: string;
  euiccid: string | null;
  deviceID: string;
  modemID: string | null;
  globalSimType: string;
  simProfileId: string;
  mec: string | null;
  /** Data usage in megabytes (MB) */
  ctdDataUsage: number;
  ctdSMSUsage: number;
  ctdVoiceUsage: number;
  ctdSessionCount: number;
  overageLimitReached: boolean;
  overageLimitOverride: string;
}

export interface EntelServiceError {
  payload: Record<string, any>;
  stack?: string;
  message: string;
  data?: any;
}

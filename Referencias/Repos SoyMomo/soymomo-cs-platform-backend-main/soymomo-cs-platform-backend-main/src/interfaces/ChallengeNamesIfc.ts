import type { ChallengeNameType } from '@aws-sdk/client-cognito-identity-provider';

export default interface ChallengeNameTypes {
  adminNoSrpAuth: ChallengeNameType;
  customChallenge: ChallengeNameType;
  devicePasswordVerifier: ChallengeNameType;
  deviceSrpAuth: ChallengeNameType;
  mfaSetup: ChallengeNameType;
  newPasswordRequired: ChallengeNameType;
  passwordVerifier: ChallengeNameType;
  selectMfaType: ChallengeNameType;
  smsMfa: ChallengeNameType;
  softwareTokenMfa: ChallengeNameType;
}

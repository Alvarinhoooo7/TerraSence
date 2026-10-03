import { isEmailValid } from './authValidation';
import { isPasswordAcceptable } from './passwordRules';
import { REGISTRATION_LEGAL_VERSION, type RegistrationConsent } from './registrationConsent';

export type RegistrationStep = 1 | 2;
export function transitionRegistrationStep(step: RegistrationStep, action: 'next' | 'back', identityValid: boolean): RegistrationStep {
  if (action === 'back') return 1;
  return step === 1 && identityValid ? 2 : step;
}

export function registrationIdentityValid(name: string, email: string): boolean {
  return name.trim().split(/\s+/u).filter(Boolean).length >= 2 && isEmailValid(email);
}

export function registrationNameMetadata(name: string) {
  const parts = name.trim().split(/\s+/u);
  return { full_name: parts.join(' '), first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

export function registrationPasswordValid(password: string, confirmation: string): boolean {
  return isPasswordAcceptable(password) && password === confirmation;
}

export function registrationConsentValid(consent: RegistrationConsent | null | undefined): consent is RegistrationConsent {
  return !!consent?.terms_accepted && !!consent.privacy_accepted &&
    consent.terms_version === REGISTRATION_LEGAL_VERSION && consent.privacy_version === REGISTRATION_LEGAL_VERSION;
}

/** Construye y envía exactamente los metadatos que viajan en signUp. */
export function submitRegistration<T>(
  signUp: (payload: { email: string; password: string; options: { data: { registration_consent: RegistrationConsent; full_name: string; first_name: string; last_name: string } } }) => Promise<T>,
  fields: { email: string; password: string; fullName: string; consent: RegistrationConsent },
): Promise<T> {
  if (!registrationConsentValid(fields.consent)) throw new Error('Debes aceptar los términos y la privacidad vigentes.');
  return signUp({
    email: fields.email.trim().toLowerCase(), password: fields.password,
    options: { data: { ...registrationNameMetadata(fields.fullName), registration_consent: fields.consent } },
  });
}

/** Gate síncrono: dos pulsaciones del mismo frame no inician dos solicitudes. */
export function createSubmissionGate() {
  let active = false;
  return {
    get active() { return active; },
    enter() { if (active) return false; active = true; return true; },
    leave() { active = false; },
  };
}

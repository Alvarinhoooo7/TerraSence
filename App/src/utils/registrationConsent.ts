// Cambiar la versión cada vez que cambie el texto presentado al usuario.
// Versión preliminar: falta confirmar responsable, contacto y política de conservación.
export const REGISTRATION_LEGAL_VERSION = '2026-09-18-draft-1';

export interface ConsentState {
  reachedEnd: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

export const initialConsent: ConsentState = {
  reachedEnd: false, termsAccepted: false, privacyAccepted: false,
};

export type ConsentAction = { type: 'read' | 'terms' | 'privacy' };

export function consentReducer(state: ConsentState, action: ConsentAction): ConsentState {
  if (action.type === 'read') return { ...state, reachedEnd: true };
  if (!state.reachedEnd) return state;
  if (action.type === 'terms') return { ...state, termsAccepted: !state.termsAccepted };
  return { ...state, privacyAccepted: !state.privacyAccepted };
}

export function hasReachedLegalEnd(offset: number, viewport: number, content: number): boolean {
  return [offset, viewport, content].every(Number.isFinite) &&
    viewport > 0 && content > 0 && offset >= 0 && offset + viewport >= content - 8;
}

export function canAcceptRegistration(state: ConsentState): boolean {
  return state.reachedEnd && state.termsAccepted && state.privacyAccepted;
}

export function createRegistrationConsent(state: ConsentState, language: 'es' | 'en') {
  if (!canAcceptRegistration(state)) throw new Error('Debes leer y aceptar ambos documentos.');
  return {
    terms_version: REGISTRATION_LEGAL_VERSION,
    privacy_version: REGISTRATION_LEGAL_VERSION,
    terms_accepted: true as const,
    privacy_accepted: true as const,
    accepted_at_client: new Date().toISOString(),
    language,
    source: 'mobile_signup' as const,
  };
}

export type RegistrationConsent = ReturnType<typeof createRegistrationConsent>;

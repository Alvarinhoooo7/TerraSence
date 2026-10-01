// Cambiar la versión cada vez que cambie el texto presentado al usuario: es lo que
// queda registrado en la aceptación de cada cuenta y lo que permite saber qué leyó.
// Identifica el texto de términos y privacidad presentado al aceptar el registro.
export const REGISTRATION_LEGAL_VERSION = '2026-10-01-1';

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
  // Idempotente a propósito: `onScroll` se dispara decenas de veces y antes devolvía
  // un objeto nuevo en cada una, re-renderizando el texto legal completo mientras el
  // dedo se movía. Ese trabajo de más es lo que se sentía como un tirón al continuar.
  if (action.type === 'read') return state.reachedEnd ? state : { ...state, reachedEnd: true };
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

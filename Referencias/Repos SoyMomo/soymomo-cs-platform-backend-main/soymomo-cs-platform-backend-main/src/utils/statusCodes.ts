const STATUS_CODES = {
  activated: 'ACTIVATED',
  activationPending: 'ACTIVATION_PENDING',
  preActivated: 'PRE-ACTIVATED',
  pendingPhone: 'PENDING_PHONE',
  terminated: 'TERMINATED',
  nonPayment: 'NON-PAYMENT',
  suspended: 'SUSPENDED',
};

// Mirrors TERMINABLE_STATUSES in the watch cloud's scheduled-terminate-subscription.js.
// The cloud is the authority on what it will cancel; this copy only exists so the
// pre-check resolves the same Subscription row the cloud will act on. Keep both in sync.
export const TERMINABLE_STATUSES = [
  STATUS_CODES.activated,
  STATUS_CODES.activationPending,
  STATUS_CODES.suspended,
];

export default STATUS_CODES;

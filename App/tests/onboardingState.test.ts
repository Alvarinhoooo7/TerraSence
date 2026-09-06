import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveOnboardingState } from '../src/utils/onboardingState';
import type { DeviceMembershipRow, DeviceRow } from '../src/types/app';

const device = { id: 'device-1' } as DeviceRow;
const membership = (role: DeviceMembershipRow['role']): DeviceMembershipRow => ({
  device_id: device.id,
  role,
  is_authorized: true,
});

test('una cuenta nueva sin membresía debe ver onboarding', () => {
  assert.deepEqual(deriveOnboardingState(null, [], []), {
    completed: false,
    method: null,
    needsProfileRepair: false,
  });
});

test('una membresía de usuario migra y salta onboarding por la ruta QR', () => {
  assert.deepEqual(deriveOnboardingState(null, [device], [membership('user')]), {
    completed: true,
    method: 'qr',
    needsProfileRepair: true,
  });
});

test('una membresía admin migra y se identifica como pairing', () => {
  assert.deepEqual(deriveOnboardingState(null, [device], [membership('admin')]), {
    completed: true,
    method: 'pairing',
    needsProfileRepair: true,
  });
});

test('el sello de perfil no permite entrar si ya no existe un equipo accesible', () => {
  const profile = {
    onboarding_completed_at: '2026-08-30T10:00:00.000Z',
    onboarding_method: 'pairing' as const,
  };
  assert.equal(deriveOnboardingState(profile, [], []).completed, false);
});

test('una cuenta completa conserva el método persistido y no repara', () => {
  const profile = {
    onboarding_completed_at: '2026-08-30T10:00:00.000Z',
    onboarding_method: 'qr' as const,
  };
  assert.deepEqual(deriveOnboardingState(profile, [device], [membership('user')]), {
    completed: true,
    method: 'qr',
    needsProfileRepair: false,
  });
});

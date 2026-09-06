import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const readEnv = (file) => {
  try {
    return Object.fromEntries(
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const index = line.indexOf('=');
          return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')];
        }),
    );
  } catch {
    return {};
  }
};

const rootEnv = readEnv(resolve(process.cwd(), '..', '.env'));
const appEnv = readEnv(resolve(process.cwd(), '.env'));
const env = { ...rootEnv, ...appEnv, ...process.env };
const url = env.EXPO_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error('Faltan URL, anon key o service role key en .env para la verificación remota.');
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, options);
const createdUsers = [];
let testDeviceCode = null;

const makeUser = async (label) => {
  const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `codex-terrasense-${label}-${nonce}@example.com`;
  const password = `Ts!${crypto.randomUUID()}a9`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Integration ${label}` },
  });
  if (error || !data.user) throw error ?? new Error('No se creó el usuario temporal.');
  createdUsers.push(data.user.id);

  const client = createClient(url, anonKey, options);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, password, client };
};

try {
  const owner = await makeUser('owner');
  const operator = await makeUser('operator');
  const attacker = await makeUser('rate');

  testDeviceCode = `8${String(Date.now()).slice(-14).padStart(14, '0')}`;
  assert.match(testDeviceCode, /^[1-9]\d{14}$/);

  const { data: registration, error: insertError } = await owner.client.rpc(
    'register_paired_device',
    { p_code: testDeviceCode, p_name: 'Integration Probe' },
  );
  if (insertError || !registration?.[0]?.device_id) {
    throw insertError ?? new Error('No se creó el equipo temporal.');
  }
  const device = { id: registration[0].device_id, device_code: testDeviceCode };

  const { error: directInsertError } = await owner.client.from('devices').insert({
    device_code: `6${testDeviceCode.slice(1)}`,
    name: 'Forbidden direct insert',
  });
  assert.ok(directInsertError, 'El INSERT directo de devices debe permanecer cerrado.');

  const { data: ownerMembership, error: ownerMembershipError } = await owner.client
    .from('device_members')
    .select('role,is_authorized')
    .eq('device_id', device.id)
    .single();
  if (ownerMembershipError) throw ownerMembershipError;
  assert.equal(ownerMembership.role, 'admin');
  assert.equal(ownerMembership.is_authorized, true);

  const { data: ownerProfile, error: ownerProfileError } = await owner.client
    .from('profiles')
    .select('onboarding_completed_at,onboarding_method')
    .eq('id', owner.id)
    .single();
  if (ownerProfileError) throw ownerProfileError;
  assert.ok(ownerProfile.onboarding_completed_at);
  assert.equal(ownerProfile.onboarding_method, 'pairing');

  const { data: invitations, error: invitationError } = await owner.client.rpc('get_device_access_qr', { p_device_id: device.id });
  if (invitationError) throw invitationError;
  const token = invitations[0].token;
  const { data: joined, error: joinError } = await operator.client.rpc('join_device_by_invite', { p_token: token });
  assert.equal(joinError, null);
  assert.equal(joined?.[0]?.device_id, device.id);
  assert.equal(joined?.[0]?.is_authorized, false);
  assert.ok(joined?.[0]?.alert_id);
  const { data: repeated } = await operator.client.rpc('join_device_by_invite', { p_token: token });
  assert.equal(repeated[0].is_authorized, false);
  assert.equal(repeated[0].alert_id, null, 'Reescanear no debe duplicar notificaciones.');
  const { data: invisible } = await operator.client.from('devices').select('id').eq('id', device.id);
  assert.deepEqual(invisible, []);
  const { data: pending } = await operator.client.rpc('list_my_pending_device_requests');
  assert.equal(pending[0].device_id, device.id);
  assert.match(pending[0].administrator_email, /^.xxxxxxxx@.xxxxxxxx$/);
  assert.notEqual(pending[0].administrator_email, owner.email);
  const { error: deniedAdmin } = await operator.client.rpc('manage_device_member', {
    p_device_id: device.id, p_target_user_id: owner.id, p_action: 'remove',
  });
  assert.equal(deniedAdmin?.code, '42501');
  const { error: deniedQr } = await operator.client.rpc('get_device_access_qr', { p_device_id: device.id });
  assert.equal(deniedQr?.code, '42501');
  const { data: noStaff } = await owner.client.rpc('is_support_staff');
  assert.equal(noStaff, false, 'Ser administrador de un equipo no da acceso web.');
  const { error: deniedWeb } = await owner.client.rpc('admin_search', { p_query: testDeviceCode });
  assert.equal(deniedWeb?.code, '42501');
  const { error: approveError } = await owner.client.rpc('manage_device_member', {
    p_device_id: device.id, p_target_user_id: operator.id, p_action: 'authorize',
  });
  if (approveError) throw approveError;
  const { data: userQr, error: userQrError } = await operator.client.rpc('get_device_access_qr', { p_device_id: device.id });
  assert.equal(userQrError, null, 'Un usuario aprobado tambien puede mostrar QR.');
  assert.equal(userQr[0].token, token);

  const { data: operatorMembership, error: operatorMembershipError } = await operator.client
    .from('device_members')
    .select('role,is_authorized')
    .eq('device_id', device.id)
    .single();
  if (operatorMembershipError) throw operatorMembershipError;
  assert.equal(operatorMembership.role, 'user');

  // Una actualización bloqueada por RLS puede responder sin error y cero filas;
  // la prueba autoritativa es volver a leer el rol.
  await operator.client
    .from('device_members')
    .update({ role: 'admin' })
    .eq('device_id', device.id);
  const { data: roleAfterAttempt } = await operator.client
    .from('device_members')
    .select('role')
    .eq('device_id', device.id)
    .single();
  assert.equal(roleAfterAttempt.role, 'user');

  const { error: directProfileError } = await operator.client
    .from('profiles')
    .update({ onboarding_completed_at: new Date().toISOString(), onboarding_method: 'pairing' })
    .eq('id', operator.id);
  assert.ok(directProfileError, 'La actualización directa de onboarding debió ser rechazada.');

  const { error: forbiddenPairingError } = await operator.client.rpc('complete_my_onboarding', {
    p_method: 'pairing',
  });
  assert.ok(forbiddenPairingError, 'Un operador no debe completar la ruta pairing.');

  const { data: operatorProfile, error: operatorProfileError } = await operator.client
    .from('profiles')
    .select('onboarding_completed_at,onboarding_method')
    .eq('id', operator.id)
    .single();
  if (operatorProfileError) throw operatorProfileError;
  assert.ok(operatorProfile.onboarding_completed_at);
  assert.equal(operatorProfile.onboarding_method, 'qr');

  // Simula reinstalación: cliente nuevo, sesión nueva, misma cuenta.
  const reinstalled = createClient(url, anonKey, options);
  const { error: reinstallSignInError } = await reinstalled.auth.signInWithPassword({
    email: operator.email,
    password: operator.password,
  });
  if (reinstallSignInError) throw reinstallSignInError;
  const [profileResult, devicesResult, membershipResult] = await Promise.all([
    reinstalled
      .from('profiles')
      .select('onboarding_completed_at,onboarding_method')
      .eq('id', operator.id)
      .single(),
    reinstalled.from('devices').select('id').eq('id', device.id),
    reinstalled.from('device_members').select('device_id,role,is_authorized').eq('device_id', device.id),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (devicesResult.error) throw devicesResult.error;
  if (membershipResult.error) throw membershipResult.error;
  const profile = profileResult.data;
  const visibleDevices = devicesResult.data;
  assert.ok(profile?.onboarding_completed_at);
  assert.equal(profile?.onboarding_method, 'qr');
  assert.equal(membershipResult.data?.[0]?.role, 'user');
  assert.equal(membershipResult.data?.[0]?.is_authorized, true);
  assert.equal(visibleDevices?.length, 1);

  const { error: staticCodeError } = await attacker.client.rpc('join_device_by_code', { p_code: testDeviceCode });
  assert.equal(staticCodeError?.code, '42501', 'El ID permanente no sustituye al QR.');
  const { error: expiryError } = await admin.from('device_access_invites').update({ expires_at: new Date(0).toISOString() }).eq('device_id', device.id);
  if (expiryError) throw expiryError;
  const { error: expiredQr } = await attacker.client.rpc('join_device_by_invite', { p_token: token });
  assert.equal(expiredQr?.code, '22023');
  const { data: rotated } = await owner.client.rpc('get_device_access_qr', { p_device_id: device.id });
  assert.notEqual(rotated[0].token, token);

  const { error: transferError } = await owner.client.rpc('manage_device_member', {
    p_device_id: device.id, p_target_user_id: operator.id, p_action: 'transfer_owner',
  });
  if (transferError) throw transferError;
  const { data: formerAdmin } = await owner.client.from('device_members').select('role').eq('device_id', device.id).single();
  assert.equal(formerAdmin.role, 'user');
  const { error: formerAdminAccess } = await owner.client.rpc('list_device_members', { p_device_id: device.id });
  assert.equal(formerAdminAccess?.code, '42501');
  const { error: removeError } = await operator.client.rpc('manage_device_member', {
    p_device_id: device.id, p_target_user_id: owner.id, p_action: 'remove',
  });
  if (removeError) throw removeError;
  const { error: lastMemberError } = await operator.client.rpc('manage_device_member', {
    p_device_id: device.id, p_target_user_id: operator.id, p_action: 'remove',
  });
  assert.equal(lastMemberError?.code, '22023');
  const { data: rejoin } = await owner.client.rpc('join_device_by_invite', { p_token: rotated[0].token });
  assert.equal(rejoin[0].is_authorized, false, 'El exadministrador vuelve a quedar pendiente.');
  assert.equal(rejoin[0].role, 'user');

  // Backoffice independiente: una cuenta sin membresia del equipo.
  const { error: staffError } = await admin.from('admin_support_users').insert({
    user_id: attacker.id, email: attacker.email, full_name: 'Integration Support', is_active: true,
  });
  if (staffError) throw staffError;
  const { data: found } = await attacker.client.rpc('admin_search', { p_query: operator.email });
  assert.ok(found.some(row => row.device_id === device.id));
  const { error: lastAdminRemoval } = await attacker.client.rpc('admin_unbind_user_device', {
    p_device_id: device.id, p_user_id: operator.id,
  });
  assert.equal(lastAdminRemoval?.code, '22023');
  const { error: wrongReset } = await attacker.client.rpc('admin_factory_reset_device', {
    p_device_id: device.id, p_confirm_device_code: '111111111111111',
  });
  assert.equal(wrongReset?.code, '22023');
  const { data: reset, error: resetError } = await attacker.client.rpc('admin_factory_reset_device', {
    p_device_id: device.id, p_confirm_device_code: testDeviceCode,
  });
  if (resetError) throw resetError;
  assert.equal(reset.success, true);
  const { data: remaining } = await admin.from('device_members').select('id').eq('device_id', device.id);
  assert.deepEqual(remaining, []);
  const { error: resetQr } = await owner.client.rpc('join_device_by_invite', { p_token: rotated[0].token });
  assert.equal(resetQr?.code, '22023');
  const claims = await Promise.all([owner, operator].map(user => user.client.rpc('register_paired_device', { p_code: testDeviceCode })));
  assert.equal(claims.filter(result => !result.error).length, 1, 'Solo uno gana el primer emparejamiento concurrente.');
  assert.equal(claims.filter(result => result.error?.code === '23505').length, 1);
  const { data: reclaimed } = await admin.from('device_members').select('role,is_authorized').eq('device_id', device.id);
  assert.deepEqual(reclaimed, [{ role: 'admin', is_authorized: true }]);
  console.log('Supabase: roles, aprobacion, QR temporal, delegacion, aislamiento web y reset verificados.');
} finally {
  if (testDeviceCode && /^[1-9]\d{14}$/.test(testDeviceCode)) {
    await admin.from('devices').delete().eq('device_code', testDeviceCode);
  }
  if (createdUsers.length) await admin.from('admin_support_users').delete().in('user_id', createdUsers);
  for (const userId of createdUsers) {
    await admin.auth.admin.deleteUser(userId);
  }
}

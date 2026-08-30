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
  assert.equal(ownerMembership.role, 'owner');
  assert.equal(ownerMembership.is_authorized, true);

  const { data: ownerProfile, error: ownerProfileError } = await owner.client
    .from('profiles')
    .select('onboarding_completed_at,onboarding_method')
    .eq('id', owner.id)
    .single();
  if (ownerProfileError) throw ownerProfileError;
  assert.ok(ownerProfile.onboarding_completed_at);
  assert.equal(ownerProfile.onboarding_method, 'pairing');

  const { data: joined, error: joinError } = await operator.client.rpc('join_device_by_code', {
    p_code: testDeviceCode,
  });
  assert.equal(joinError, null);
  assert.equal(joined?.[0]?.device_id, device.id);

  const { data: operatorMembership, error: operatorMembershipError } = await operator.client
    .from('device_members')
    .select('role,is_authorized')
    .eq('device_id', device.id)
    .single();
  if (operatorMembershipError) throw operatorMembershipError;
  assert.equal(operatorMembership.role, 'operator');

  // Una actualización bloqueada por RLS puede responder sin error y cero filas;
  // la prueba autoritativa es volver a leer el rol.
  await operator.client
    .from('device_members')
    .update({ role: 'owner' })
    .eq('device_id', device.id);
  const { data: roleAfterAttempt } = await operator.client
    .from('device_members')
    .select('role')
    .eq('device_id', device.id)
    .single();
  assert.equal(roleAfterAttempt.role, 'operator');

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
  assert.equal(membershipResult.data?.[0]?.role, 'operator');
  assert.equal(membershipResult.data?.[0]?.is_authorized, true);
  assert.equal(visibleDevices?.length, 1);

  const missingCode = `7${String(Date.now() + 987654).slice(-14).padStart(14, '0')}`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await attacker.client.rpc('join_device_by_code', { p_code: missingCode });
    assert.equal(error, null);
    assert.deepEqual(data, []);
  }
  const { error: limitedError } = await attacker.client.rpc('join_device_by_code', {
    p_code: missingCode,
  });
  assert.match(limitedError?.message ?? '', /Demasiados intentos fallidos/);

  console.log('Supabase onboarding E2E: 12 controles aprobados.');
} finally {
  if (testDeviceCode && /^[1-9]\d{14}$/.test(testDeviceCode)) {
    await admin.from('devices').delete().eq('device_code', testDeviceCode);
  }
  for (const userId of createdUsers) {
    await admin.auth.admin.deleteUser(userId);
  }
}

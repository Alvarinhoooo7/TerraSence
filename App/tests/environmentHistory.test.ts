import assert from 'node:assert/strict';
import test from 'node:test';
import { mapRowToPoint, type SoilMeasurementRow } from '../src/types/app';
import { decodeTelemetry } from '../src/services/probeService';

test('las diez variables y batería sobreviven al paso BLE → fila → historial', () => {
  const raw = decodeTelemetry(new Uint8Array([1, 94, 0, 245, 3, 232, 0, 65, 0, 45, 0, 30, 0, 80, 87, 1, 0x26, 0x52, 0xc0, 0x7d]));
  const diagnosis = { localSource: 'probe-bme280-v1', weather: null };
  const point = mapRowToPoint({
    vwc_percent: raw.vwc, soil_temp_c: raw.temp, ec_us_cm: raw.ec, ph: raw.ph,
    nitrogen: raw.nitrogen, phosphorus: raw.phosphorus, potassium: raw.potassium,
    canopy_temp_c: raw.airTemp, canopy_humidity_pct: raw.airHumidity, air_pressure_hpa: raw.airPressure,
    battery_percent: raw.battery, diagnosis,
    measured_at: '2026-09-11T12:00:00Z', latitude: null, longitude: null,
  } as SoilMeasurementRow);
  assert.deepEqual([point.vwcPercent, point.ecUsCm, point.soilTempC, point.nitrogen, point.phosphorus,
    point.potassium, point.ph, point.airTemp, point.airHumidity, point.airPressure],
  [35, 1000, 24.5, 45, 30, 80, 6.5, 21.3, 62.5, 1004]);
  assert.equal(point.batteryPercent, 87);
  assert.equal(point.latitude, null);
  assert.equal(point.diagnosis, diagnosis);
  assert.equal(point.measuredAt, '2026-09-11T12:00:00Z');
});

test('historial antiguo sin ambiente conserva ausencias', () => {
  const point = mapRowToPoint({} as SoilMeasurementRow);
  assert.equal(point.airTemp, null);
  assert.equal(point.airHumidity, null);
  assert.equal(point.airPressure, null);
  assert.equal(point.batteryPercent, null);
});

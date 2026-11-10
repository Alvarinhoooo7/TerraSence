import assert from 'node:assert/strict';
import test from 'node:test';
import { historyScopeIncludes, measurementHistoryScope, mergeCachedHistories, mergeMeasurementHistory, REMOTE_HISTORY_TIMEOUT_MS, runBoundedRemoteHistory, withConfirmedPoint } from '../src/utils/measurementHistory';
import type { MeasurementPoint } from '../src/types/app';
import {
  assessProbeMetrologicalContext,
  ecAccuracyBandUsCm,
  phAccuracyBand,
  soilTempAccuracyBandC,
  vwcAccuracyBandPct,
} from '../src/engine/localPhysics';

test('el filtro de Mediciones permanece independiente de la sonda seleccionada para medir', () => {
  assert.equal(measurementHistoryScope('measure-a', 'history-b'), 'history-b');
  assert.equal(measurementHistoryScope('measure-c', 'history-b'), 'history-b');
  assert.equal(measurementHistoryScope('measure-a', null), null);
  assert.equal(measurementHistoryScope('measure-c', null), null);
  assert.equal(measurementHistoryScope('measure-a', undefined), 'measure-a');
});

const point = (id: string, clientUuid: string, measuredAt = '2026-09-05T12:00:00Z'): MeasurementPoint => ({
  id, clientUuid, measuredAt, latitude: null, longitude: null,
  verdict: 'GREEN', stage: 'pre_siembra', title: 'Favorable', action: null,
  ph: 6.5, ecUsCm: 200, vwcPercent: 30, soilTempC: 18,
  nitrogen: 0, phosphorus: 0, potassium: 0, gpsAccuracyM: null,
});

test('unifica cachés de campos sin duplicar lecturas ni cambiar su estado de respaldo', () => {
  const older = point('older', 'a', '2026-09-04T12:00:00Z');
  const recent = point('recent', 'b');
  const pendingCopy = { ...recent, id: 'local-b', isPending: true };
  assert.deepEqual(mergeCachedHistories([[older, pendingCopy], [recent, older]]), [recent, older]);
  assert.deepEqual(mergeCachedHistories([[recent], [pendingCopy]]), [recent]);
  assert.equal(pendingCopy.isPending, true);
});

test('server confirmation replaces local UUID without duplicating a reading', () => {
  const server = point('server-id', 'client-id');
  assert.deepEqual(mergeMeasurementHistory([server], [point('client-id', 'client-id')]), [server]);
});
test('retains unsynced readings, missing GPS and chronological order', () => {
  const result = mergeMeasurementHistory([point('older', 'a', '2026-09-04T12:00:00Z')], [point('newer', 'b')]);
  assert.deepEqual(result.map(p => p.id), ['newer', 'older']);
  assert.equal(result[0].isPending, true);
  assert.equal(result[0].latitude, null);
});
test('supports cached points without client UUID and does not mutate inputs', () => {
  const cached = { ...point('same', 'c'), clientUuid: undefined };
  const pending = { ...cached };
  assert.equal(mergeMeasurementHistory([cached], [pending]).length, 1);
  assert.equal(pending.isPending, undefined);
});

test('el historial se filtra por etapa y especie y se agrupa por fecha, especie o etapa', async () => {
  const { organizeHistory, historySpeciesOptions } = await import('../src/utils/measurementHistory');
  const species = (id: string, es: string) => ({ presentation: { version: 3, stage: 'vegetativo', species: { id, es, en: es, scientific: es, catalogVersion: '2.0.0', hasStageCriteria: false },
    context: '', title: '', summary: '', weatherNote: '', actions: [], suggestedCrops: [],
    parameters: ['vwc', 'temp', 'ph', 'ec', 'nitrogen', 'phosphorus', 'potassium', 'airTemp', 'airHumidity', 'airPressure']
      .map(key => ({ key, label: key, value: 1, unit: '', status: 'INFO', state: '', recommendation: '', control: '' })) } });
  const at = (id: string, day: string, stage: MeasurementPoint['stage'], diagnosis?: unknown) =>
    ({ ...point(id, id, `2026-10-${day}T12:00:00Z`), stage, diagnosis });
  const points = [
    at('a', '10', 'vegetativo', species('sp.tomate', 'Tomate')),
    at('b', '12', 'vegetativo', species('sp.palto', 'Palto')),
    at('c', '11', 'cosecha'),
    at('d', '09', 'vegetativo', species('sp.tomate', 'Tomate')),
  ];
  const titles = { dayTitle: (iso: string) => iso.slice(0, 10), speciesTitle: (id: string | null) => id ?? 'Sin especie', stageTitle: (stage: string) => stage };
  const shape = (sections: { title: string; data: MeasurementPoint[] }[]) => sections.map(s => [s.title, s.data.map(p => p.id)]);

  assert.deepEqual(historySpeciesOptions(points), { species: [{ id: 'sp.palto', name: 'Palto' }, { id: 'sp.tomate', name: 'Tomate' }], withoutSpecies: true });
  assert.deepEqual(shape(organizeHistory(points, { ...titles, by: 'date', stage: 'all', species: 'all' })),
    [['2026-10-12', ['b']], ['2026-10-11', ['c']], ['2026-10-10', ['a']], ['2026-10-09', ['d']]]);
  assert.deepEqual(shape(organizeHistory(points, { ...titles, by: 'species', stage: 'all', species: 'all' })),
    [['sp.palto', ['b']], ['sp.tomate', ['a', 'd']], ['Sin especie', ['c']]]);
  assert.deepEqual(shape(organizeHistory(points, { ...titles, by: 'stage', stage: 'all', species: 'all' })),
    [['vegetativo', ['b', 'a', 'd']], ['cosecha', ['c']]]);
  assert.deepEqual(shape(organizeHistory(points, { ...titles, by: 'date', stage: 'vegetativo', species: 'sp.tomate' })),
    [['2026-10-10', ['a']], ['2026-10-09', ['d']]]);
  assert.deepEqual(shape(organizeHistory(points, { ...titles, by: 'date', stage: 'all', species: 'none' })), [['2026-10-11', ['c']]]);
});

test('una lectura subida con red entra a la copia local del historial y se ve sin red', () => {
  const older = point('older', 'a', '2026-09-04T12:00:00Z');
  const uploaded = point('nueva', 'b', '2026-09-06T12:00:00Z');
  assert.deepEqual(withConfirmedPoint([older], uploaded), [uploaded, older]);
  // Reemplaza su copia pendiente y no se duplica si la copia ya la tenía.
  assert.deepEqual(withConfirmedPoint([{ ...uploaded, id: 'local-b', isPending: true }, older], uploaded), [uploaded, older]);
  assert.deepEqual(withConfirmedPoint([uploaded, older], uploaded), [uploaded, older]);
  assert.equal(withConfirmedPoint({ dañada: true }, uploaded), null, 'no reescribe una copia que no entiende');
  // Sólo las copias de todos los equipos o de ese equipo.
  assert.equal(historyScopeIncludes(JSON.stringify([null, null]), 'equipo-1'), true);
  assert.equal(historyScopeIncludes(JSON.stringify([null, 'equipo-1']), 'equipo-1'), true);
  assert.equal(historyScopeIncludes(JSON.stringify([null, 'equipo-2']), 'equipo-1'), false);
  assert.equal(historyScopeIncludes('no-json', 'equipo-1'), false);
});

test('ES5: runBoundedRemoteHistory corta consultas colgadas sin red y devuelve la copia local de inmediato', async () => {
  assert.equal(REMOTE_HISTORY_TIMEOUT_MS, 3_000);
  const localCopy = [point('local-1', 'uuid-1')];
  let aborted = false;
  const startedAt = Date.now();
  const result = await runBoundedRemoteHistory(
    signal => new Promise<MeasurementPoint[]>((_, reject) => {
      signal.addEventListener('abort', () => {
        aborted = true;
        reject(new Error('Aborted'));
      });
    }),
    async () => localCopy,
    30,
  );
  const elapsed = Date.now() - startedAt;
  assert.equal(aborted, true);
  assert.equal(result.offline, true);
  assert.deepEqual(result.data, localCopy);
  assert.ok(elapsed < 500, `Tardó demasiado en caer a la copia local: ${elapsed} ms`);
});


test('T41: compareSameSiteReadings compara con la lectura anterior del mismo equipo y sitio (≤ 25 m, GPS ≤ 25 m, ≤ 30 días)', async () => {
  const {
    compareSameSiteReadings,
    haversineDistanceMeters,
    SAME_SITE_MAX_DISTANCE_M,
    SAME_SITE_MAX_GPS_ACCURACY_M,
    SAME_SITE_MAX_WINDOW_DAYS,
  } = await import('../src/utils/measurementHistory');

  assert.equal(SAME_SITE_MAX_DISTANCE_M, 25);
  assert.equal(SAME_SITE_MAX_GPS_ACCURACY_M, 25);
  assert.equal(SAME_SITE_MAX_WINDOW_DAYS, 30);

  const basePoint: MeasurementPoint = {
    ...point('curr', 'uuid-curr', '2026-10-15T12:00:00Z'),
    deviceId: 'probe-01',
    latitude: -33.45000,
    longitude: -70.65000,
    gpsAccuracyM: 8,
    vwcPercent: 32.5,
    soilTempC: 19.2,
    ph: 6.6,
    ecUsCm: 950,
  };

  // ~11,1 m al norte (0,0001° de latitud) y 3 días antes:
  const prevSameSite: MeasurementPoint = {
    ...point('prev-ok', 'uuid-prev-ok', '2026-10-12T12:00:00Z'),
    deviceId: 'probe-01',
    latitude: -33.44990,
    longitude: -70.65000,
    gpsAccuracyM: 12,
    vwcPercent: 27.0,
    soilTempC: 19.0,
    ph: 6.5,
    ecUsCm: 940,
  };

  // Más reciente pero de otro equipo (se ignora):
  const prevOtherDevice: MeasurementPoint = {
    ...prevSameSite,
    id: 'prev-other-dev',
    clientUuid: 'uuid-other-dev',
    measuredAt: '2026-10-14T12:00:00Z',
    deviceId: 'probe-02',
  };

  // Más reciente pero a ~111 m (0,001° latitud > 25 m, se ignora):
  const prevFar: MeasurementPoint = {
    ...prevSameSite,
    id: 'prev-far',
    clientUuid: 'uuid-far',
    measuredAt: '2026-10-14T15:00:00Z',
    latitude: -33.44900,
  };

  // Más reciente pero con GPS impreciso (35 m > 25 m, se ignora):
  const prevLowGps: MeasurementPoint = {
    ...prevSameSite,
    id: 'prev-low-gps',
    clientUuid: 'uuid-low-gps',
    measuredAt: '2026-10-14T16:00:00Z',
    gpsAccuracyM: 35,
  };

  // Más reciente pero simulada (se ignora):
  const prevSimulated: MeasurementPoint = {
    ...prevSameSite,
    id: 'prev-sim',
    clientUuid: 'uuid-sim',
    measuredAt: '2026-10-14T18:00:00Z',
    diagnosis: { simulated: true },
  };

  const dist = haversineDistanceMeters(basePoint.latitude!, basePoint.longitude!, prevSameSite.latitude!, prevSameSite.longitude!);
  assert.ok(dist > 10 && dist < 12, `Distancia esperada ~11,1 m, obtenida ${dist}`);

  const cmp = compareSameSiteReadings(basePoint, [
    prevOtherDevice,
    prevFar,
    prevLowGps,
    prevSimulated,
    prevSameSite,
  ]);

  assert.equal(cmp.comparable, true);
  assert.equal(cmp.reasonIfNotComparable, null);
  assert.equal(cmp.previousPointId, 'prev-ok');
  assert.equal(cmp.elapsedHours, 72);
  assert.ok(cmp.distanceMeters !== null && cmp.distanceMeters <= 25);
  assert.ok(cmp.limitations.some(l => l.includes('Sonda portátil')));
  assert.ok(cmp.limitations.some(l => l.includes('T41')));

  const byParam = Object.fromEntries(cmp.deltas.map(d => [d.parameter, d]));
  // Humedad subió +5,5 % (> ±2,0 % de exactitud declarada): 'increase'
  assert.equal(byParam.vwc.delta, 5.5);
  assert.equal(byParam.vwc.exceedsInstrumentalBand, true);
  assert.equal(byParam.vwc.direction, 'increase');
  // Temperatura varió +0,2 °C (≤ ±0,5 °C de exactitud declarada): 'within_noise'
  assert.equal(byParam.temp.delta, 0.2);
  assert.equal(byParam.temp.exceedsInstrumentalBand, false);
  assert.equal(byParam.temp.direction, 'within_noise');
  // pH varió +0,1 (≤ ±0,3 pH de exactitud declarada): 'within_noise'
  assert.equal(byParam.ph.delta, 0.1);
  assert.equal(byParam.ph.exceedsInstrumentalBand, false);
  assert.equal(byParam.ph.direction, 'within_noise');
  // CE varió +10 µS/cm (≤ ±3 % de 950 = ±29 µS/cm): 'within_noise'
  assert.equal(byParam.ec.delta, 10);
  assert.equal(byParam.ec.exceedsInstrumentalBand, false);
  assert.equal(byParam.ec.direction, 'within_noise');
  // El texto declara exactitud, no repetibilidad, y la limitación lo explica.
  assert.ok(byParam.ph.summary.includes('exactitud declarada'));
  assert.ok(cmp.limitations.some(l => l.includes('no una repetibilidad medida')));

  // Candado contra el hallazgo que motivó esta unificación: la ficha del parámetro y la comparación
  // de lecturas sucesivas leen la MISMA cota para el mismo canal. Si alguien vuelve a definir una
  // banda propia en cualquiera de los dos módulos, esta prueba falla.
  for (const ec of [0, 50, 300, 950, 9_999, 10_001, 20_000]) {
    assert.equal(
      assessProbeMetrologicalContext({ vwc: 30, temp: 18, ec, ph: 6.5, airPressure: 1005 }).ecUncertaintyUsCm,
      ecAccuracyBandUsCm(ec),
      `la ficha y la comparación deben declarar la misma cota de CE a ${ec} µS/cm`,
    );
  }
  assert.equal(byParam.ec.instrumentalBand, ecAccuracyBandUsCm(950));
  assert.equal(byParam.vwc.instrumentalBand, vwcAccuracyBandPct(35.5));
  assert.equal(byParam.ph.instrumentalBand, phAccuracyBand());
  assert.equal(byParam.temp.instrumentalBand, soilTempAccuracyBandC());
  // La cota de CE ya no lleva un piso de 30 µS/cm sin fuente: a 300 µS/cm son ±9, el ±3 % del manual.
  assert.equal(ecAccuracyBandUsCm(300), 9);
  // Y nunca baja de la resolución de 1 µS/cm del canal.
  assert.equal(ecAccuracyBandUsCm(0), 1);

  // Si la lectura actual es simulada, no se compara:
  assert.equal(
    compareSameSiteReadings({ ...basePoint, diagnosis: { simulated: true } }, [prevSameSite]).reasonIfNotComparable,
    'simulated_capture',
  );

  // Si no tiene el mismo dispositivo identificado:
  assert.equal(
    compareSameSiteReadings({ ...basePoint, deviceId: null }, [prevSameSite]).reasonIfNotComparable,
    'different_device',
  );

  // Si falta GPS o supera 25 m de incertidumbre:
  assert.equal(
    compareSameSiteReadings({ ...basePoint, latitude: null }, [prevSameSite]).reasonIfNotComparable,
    'missing_coordinates',
  );
  assert.equal(
    compareSameSiteReadings({ ...basePoint, gpsAccuracyM: 28 }, [prevSameSite]).reasonIfNotComparable,
    'insufficient_gps_accuracy',
  );

  // Si sólo hay lecturas a más de 30 días, informa fuera de ventana temporal:
  const tooOld: MeasurementPoint = {
    ...prevSameSite,
    id: 'prev-old',
    measuredAt: '2026-09-01T12:00:00Z',
  };
  assert.equal(compareSameSiteReadings(basePoint, [tooOld]).reasonIfNotComparable, 'outside_time_window');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateForStage } from '../src/engine/stageEvaluator';
import { buildContextualAdvice, type Recommendation } from '../src/engine/contextualAdvice';
import { buildMeasurementPresentation, type MeasurementPresentation, type ParameterPresentation } from '../src/engine/measurementPresentation';
import { allPlanActions, groupSummary, PLAN_VISIBLE, planActions, scoreCounts, verdictBar } from '../src/components/result/resultModel';
import type { SoilMeasurement } from '../src/types/agronomy';

const raw: SoilMeasurement = { vwc: 22, temp: 20, ph: 6.5, ec: 500, nitrogen: 50, phosphorus: 20, potassium: 80, lux: 0, battery: 80, airTemp: 21, airHumidity: 55, airPressure: 1010 };
const base = (): MeasurementPresentation => {
  const evaluation = evaluateForStage(raw, 'vegetativo', 'maiz', 'franco');
  return buildMeasurementPresentation(raw, evaluation, buildContextualAdvice('vegetativo', evaluation, raw, null));
};
const rec = (n: number, extra: Partial<Recommendation> = {}): Recommendation => ({
  kind: 'soil', priority: 'normal', when: 'today', title: `Título ${n}`, body: `Cuerpo ${n}`, ...extra,
});
const withRecs = (recommendations: Recommendation[]): MeasurementPresentation => ({ ...base(), recommendations, actions: [] });
const param = (key: ParameterPresentation['key'], status: ParameterPresentation['status'], value: number | null): ParameterPresentation =>
  ({ key, label: key, value, unit: '', status, state: '', recommendation: '', control: '' });

test('scoreCounts no cuenta nitrógeno, fósforo, potasio ni las variables informativas', () => {
  const counts = scoreCounts([
    param('vwc', 'OPTIMAL', 22), param('temp', 'WARNING', 30), param('ph', 'CRITICAL', 9), param('ec', 'INFO', 500),
    param('nitrogen', 'OPTIMAL', 50), param('phosphorus', 'CRITICAL', 1), param('potassium', 'WARNING', 2), param('airPressure', 'INFO', 1010),
  ]);
  assert.deepEqual(counts, { ok: 1, warn: 1, bad: 1, total: 3 });
});

test('una variable sin valor no suma a favorables', () => {
  const counts = scoreCounts([param('vwc', 'OPTIMAL', null), param('temp', 'OPTIMAL', 20)]);
  assert.deepEqual(counts, { ok: 1, warn: 0, bad: 0, total: 1 });
});

test('con más de tres recomendaciones se ven tres y el resto queda tras «Ver N más»', () => {
  const plan = planActions(withRecs([1, 2, 3, 4, 5].map(n => rec(n))));
  assert.equal(PLAN_VISIBLE, 3);
  assert.equal(plan.visible.length, 3);
  assert.equal(plan.hidden, 2);
  assert.deepEqual(plan.visible.map(a => a.index), [0, 1, 2]);
});

test('una recomendación de prioridad alta en cuarto lugar se muestra siempre', () => {
  const plan = planActions(withRecs([rec(1), rec(2), rec(3), rec(4, { priority: 'high' }), rec(5)]));
  assert.equal(plan.visible.length, 4);
  assert.equal(plan.hidden, 1);
  assert.equal(plan.visible[3].index, 3);
  assert.equal(plan.visible[3].priority, 'high');
});

test('con tres o menos recomendaciones no hay nada oculto', () => {
  const plan = planActions(withRecs([rec(1), rec(2)]));
  assert.equal(plan.visible.length, 2);
  assert.equal(plan.hidden, 0);
});

test('una lectura antigua, sin recomendaciones, arma el plan con sus acciones', () => {
  const legacy: MeasurementPresentation = { ...base(), version: 2, recommendations: undefined, actions: ['a', 'b'] };
  const plan = planActions(legacy);
  assert.deepEqual(plan.visible.map(a => a.title), ['a', 'b']);
  assert.ok(plan.visible.every(a => a.when === null && a.evidence.length === 0 && a.priority === 'normal'));
  assert.equal(plan.hidden, 0);
  assert.deepEqual(plan.visible.map(a => a.index), [0, 1]);
});

test('una lectura antigua con muchas acciones también oculta el excedente', () => {
  const plan = planActions({ ...base(), recommendations: undefined, actions: ['a', 'b', 'c', 'd'] });
  assert.equal(plan.visible.length, 3);
  assert.equal(plan.hidden, 1);
});

test('sin recomendaciones ni acciones el plan queda vacío', () => {
  const plan = planActions({ ...base(), recommendations: undefined, actions: [] });
  assert.deepEqual(plan, { visible: [], hidden: 0 });
  assert.deepEqual(planActions({ ...base(), recommendations: [], actions: [] }), { visible: [], hidden: 0 });
});

test('el título usa el titular cuando existe y el título cuando no', () => {
  const plan = planActions(withRecs([rec(1, { headline: 'Riega hoy' }), rec(2)]));
  assert.equal(plan.visible[0].title, 'Riega hoy');
  assert.equal(plan.visible[1].title, 'Título 2');
});

test('la evidencia y el momento de cada recomendación llegan al plan', () => {
  const plan = planActions(withRecs([rec(1, { when: 'now', evidence: ['vwc'] })]));
  assert.equal(plan.visible[0].when, 'now');
  assert.deepEqual(plan.visible[0].evidence, ['vwc']);
});

test('lectura incompleta: con evaluación insuficiente no hay barra ni conteos', () => {
  assert.equal(verdictBar({ ...base(), evaluationState: 'insufficient_data' }), null);
});

test('lectura incompleta: sin variables con estado no hay barra', () => {
  const p = { ...base(), evaluationState: 'attention' as const, parameters: base().parameters.map(m => ({ ...m, status: 'INFO' as const })) };
  assert.equal(verdictBar(p), null);
});

test('lectura incompleta: se declara cuántas variables quedaron sin dato en vez de contarlas como favorables', () => {
  const p = base();
  const parameters = p.parameters.map(m => m.key === 'airTemp' || m.key === 'airHumidity' || m.key === 'airPressure'
    ? { ...m, value: null, status: 'INFO' as const } : m);
  const bar = verdictBar({ ...p, parameters });
  assert.ok(bar);
  assert.equal(bar.withoutData, 3);
  const complete = verdictBar(base());
  assert.ok(complete);
  assert.ok(bar.counts.total <= complete.counts.total);
  assert.equal(complete.withoutData, 0);
});

test('«Ver N más» recupera todas las acciones, en el orden del motor, sin descartar ninguna', () => {
  const p = withRecs([rec(1), rec(2), rec(3), rec(4, { priority: 'high' }), rec(5), rec(6)]);
  const all = allPlanActions(p);
  assert.deepEqual(all.map(a => a.index), [0, 1, 2, 3, 4, 5]);
  const { visible, hidden } = planActions(p);
  assert.equal(visible.length + hidden, all.length);
});

test('el resumen de una familia no afirma «todo favorable» sobre lo que no se midió', () => {
  const ok = (key: ParameterPresentation['key']) => param(key, 'OPTIMAL', 1);
  assert.deepEqual(groupSummary([ok('vwc'), ok('temp')]), { kind: 'ok', count: 2, withoutData: 0 });
  assert.deepEqual(groupSummary([ok('vwc'), param('temp', 'INFO', null)]), { kind: 'ok', count: 1, withoutData: 1 });
  assert.deepEqual(groupSummary([ok('vwc'), param('temp', 'WARNING', 3)]), { kind: 'warn', count: 1 });
  assert.deepEqual(groupSummary([param('vwc', 'CRITICAL', 3), param('temp', 'WARNING', 3)]), { kind: 'bad', count: 1 });
  assert.deepEqual(groupSummary([param('airTemp', 'INFO', null), param('airHumidity', 'INFO', null)]), { kind: 'no_data' });
  assert.deepEqual(groupSummary([param('airPressure', 'INFO', 1010)]), { kind: 'context' });
});

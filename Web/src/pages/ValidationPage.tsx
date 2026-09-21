// src/pages/ValidationPage.tsx — contraste contra laboratorios acreditados.
//
// Esta pantalla existía sin ruta que la alcanzara: no aparecía en `App.tsx`
// ni en la navegación. Es, además, la única tabla que un operador de soporte
// puede leer entera sin ser miembro de ningún equipo — su política
// `ts_lab_select_auth` autoriza a cualquier sesión autenticada.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FlaskConical, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { LabValidationRecord } from '../types';
import { concordance } from '../utils/verdict';
import { absoluteDate, num } from '../utils/format';
import { downloadCsv, fileStamp } from '../utils/csv';
import { PageHeader } from '../ui/PageHeader';
import { Panel, PanelHeader, PanelNote } from '../ui/Panel';
import { Button } from '../ui/Button';
import { Badge, StatTile, TableScroll } from '../ui/Data';
import { EmptyState, ErrorState, TableSkeleton } from '../ui/Feedback';

/** Umbral por debajo del cual la muestra merece revisión, no una conclusión. */
const GOOD_ENOUGH = 90;

function Pair({
  lab,
  ts,
  decimals = 1,
}: {
  lab: number | string | null;
  ts: number | string | null;
  decimals?: number;
}) {
  return (
    <span className="tabular whitespace-nowrap">
      <span className="text-terra-muted">{num(lab, decimals)}</span>
      <span className="mx-1.5 text-terra-faint">/</span>
      <span className="text-terra-text">{num(ts, decimals)}</span>
    </span>
  );
}

export function ValidationPage() {
  const [records, setRecords] = useState<LabValidationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('lab_validation_records')
        .select('*')
        .order('sample_date', { ascending: false });
      if (err) throw err;
      setRecords((data ?? []) as unknown as LabValidationRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const values = records
      .map((r) => concordance(r.lab_ph, r.terrasense_ph))
      .filter((v): v is number => v != null);
    const media = values.length
      ? values.reduce((acc, v) => acc + v, 0) / values.length
      : null;
    const labs = new Set(records.map((r) => r.lab_name));
    return {
      total: records.length,
      labs: labs.size,
      media,
      bajo: values.filter((v) => v < GOOD_ENOUGH).length,
    };
  }, [records]);

  const exportCsv = () => {
    downloadCsv(
      `terrasense-validacion-${fileStamp()}.csv`,
      [
        'Muestra', 'Fecha', 'Laboratorio', 'Serie de suelo',
        'pH lab', 'pH TerraSense', 'CE lab', 'CE TerraSense',
        'VWC lab', 'VWC TerraSense', 'Concordancia pH (%)',
      ],
      records.map((r) => [
        r.sample_code, r.sample_date, r.lab_name, r.soil_series ?? '',
        r.lab_ph, r.terrasense_ph, r.lab_ec, r.terrasense_ec,
        r.lab_vwc, r.terrasense_vwc,
        concordance(r.lab_ph, r.terrasense_ph)?.toFixed(1) ?? '',
      ]),
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Validación de laboratorio"
        icon={FlaskConical}
        description="Corpus de contraste contra laboratorios acreditados: la evidencia que sostiene la fiabilidad de las mediciones."
        actions={
          <>
            <Button icon={Download} size="sm" onClick={exportCsv} disabled={records.length === 0}>
              CSV
            </Button>
            <Button icon={RefreshCw} size="sm" onClick={() => void load()} busy={loading}>
              Actualizar
            </Button>
          </>
        }
      />

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!error && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Muestras" value={summary.total} />
            <StatTile label="Laboratorios" value={summary.labs} />
            <StatTile
              label="Concordancia media de pH"
              value={summary.media == null ? '—' : `${summary.media.toFixed(1)} %`}
              tone={summary.media != null && summary.media >= GOOD_ENOUGH ? 'green' : 'amber'}
            />
            <StatTile
              label={`Muestras bajo ${GOOD_ENOUGH} %`}
              value={summary.bajo}
              tone={summary.bajo > 0 ? 'amber' : 'neutral'}
            />
          </div>

          <Panel>
            <PanelHeader
              icon={FlaskConical}
              title={`Registros (${records.length})`}
              hint="Laboratorio / TerraSense"
            />

            {loading ? (
              <TableSkeleton label="Cargando los registros de laboratorio" rows={5} />
            ) : records.length === 0 ? (
              <EmptyState icon={FlaskConical} title="Todavía no hay registros de validación">
                Las muestras se cargan desde el laboratorio con la clave de servicio; esta pantalla
                es de consulta.
              </EmptyState>
            ) : (
              <TableScroll label="Registros de validación metrológica" maxHeight="32rem">
                <table className="data-table w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-5 py-2.5">Muestra</th>
                      <th className="px-3 py-2.5">Fecha</th>
                      <th className="px-3 py-2.5">Laboratorio</th>
                      <th className="px-3 py-2.5">Serie</th>
                      <th className="px-3 py-2.5 text-right">pH</th>
                      <th className="px-3 py-2.5 text-right">CE (µS/cm)</th>
                      <th className="px-3 py-2.5 text-right">VWC (%)</th>
                      <th className="px-3 py-2.5 text-right">Concordancia pH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terra-border">
                    {records.map((r) => {
                      const c = concordance(r.lab_ph, r.terrasense_ph);
                      return (
                        <tr key={r.id}>
                          <td className="px-5 py-2.5 font-medium text-terra-text">
                            {r.sample_code}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-terra-muted">
                            {absoluteDate(r.sample_date)}
                          </td>
                          <td className="px-3 py-2.5 text-terra-muted">{r.lab_name}</td>
                          <td className="px-3 py-2.5 text-terra-muted">{r.soil_series ?? '—'}</td>
                          <td className="px-3 py-2.5 text-right">
                            <Pair lab={r.lab_ph} ts={r.terrasense_ph} />
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Pair lab={r.lab_ec} ts={r.terrasense_ec} decimals={0} />
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Pair lab={r.lab_vwc} ts={r.terrasense_vwc} decimals={0} />
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {c == null ? (
                              <span className="text-terra-muted">—</span>
                            ) : (
                              <Badge tone={c >= GOOD_ENOUGH ? 'green' : 'amber'}>
                                {c.toFixed(1)} %
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableScroll>
            )}

            <PanelNote>
              La concordancia se calcula como error relativo respecto al valor de laboratorio, que
              es el de referencia. Una muestra sin uno de los dos valores queda fuera del promedio
              en vez de entrar como 0 %.
            </PanelNote>
          </Panel>
        </>
      )}
    </div>
  );
}

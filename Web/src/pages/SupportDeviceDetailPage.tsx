import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getDeviceDetail,
  setMemberRole,
  setMemberAuthorized,
  removeMember,
  listPublishedFirmware,
  pushFirmwareUpdate
} from '../../backend/adminApi';
import type { DeviceDetail, DeviceMemberRole, FirmwareReleaseRow } from '../../backend/types';
import { downloadCsv, fileStamp } from '../utils/csv';
import { FactoryResetModal } from '../components/admin/FactoryResetModal';
import {
  ChevronLeft,
  Cpu,
  Battery,
  MapPin,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Trash2,
  Shield,
  Wifi,
  Calendar,
  Smartphone,
  ExternalLink,
  RefreshCw,
  BatteryMedium,
  Download,
  UploadCloud,
  Sprout,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';

export function SupportDeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Battery filters
  const [batteryFromDate, setBatteryFromDate] = useState('');
  const [batteryToDate, setBatteryToDate] = useState('');

  // Firmware OTA individual
  const [releases, setReleases] = useState<FirmwareReleaseRow[]>([]);
  const [selectedRelease, setSelectedRelease] = useState('');
  const [pushing, setPushing] = useState(false);

  // Confirmaciones y avisos en pantalla (nada de alert()/confirm(): bloquean
  // el hilo del navegador y no dejan rastro de lo ocurrido).
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDeviceDetail(id);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    // Catálogo completo, sin filtrar por hardware_target: `devices.hardware_version`
    // y `firmware_releases.hardware_target` no siempre usan la misma nomenclatura,
    // y un selector vacío por un desajuste de cadenas sería peor que mostrar de
    // más. Cada opción declara su target para que el operador elija con criterio.
    listPublishedFirmware()
      .then(setReleases)
      .catch(() => setReleases([]));
  }, []);

  const handleRoleChange = async (userId: string, role: DeviceMemberRole) => {
    if (!id) return;
    setFeedback(null);
    try {
      await setMemberRole(id, userId, role);
      setFeedback({ tone: 'ok', text: `Rol actualizado a ${role}.` });
      await load();
    } catch (err) {
      setFeedback({ tone: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleAuthChange = async (userId: string, authorized: boolean) => {
    if (!id) return;
    setFeedback(null);
    try {
      await setMemberAuthorized(id, userId, authorized);
      setFeedback({ tone: 'ok', text: authorized ? 'Miembro autorizado.' : 'Acceso suspendido.' });
      await load();
    } catch (err) {
      setFeedback({ tone: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleRemove = async (userId: string) => {
    if (!id) return;
    setFeedback(null);
    setPendingRemoval(null);
    try {
      await removeMember(id, userId);
      setFeedback({ tone: 'ok', text: 'Usuario desvinculado del equipo.' });
      await load();
    } catch (err) {
      setFeedback({ tone: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  const handlePushFirmware = async () => {
    if (!id || !selectedRelease) return;
    setFeedback(null);
    setPushing(true);
    try {
      const res = await pushFirmwareUpdate(id, selectedRelease);
      if (res.success === false) {
        setFeedback({ tone: 'error', text: res.message ?? 'No se pudo generar el aviso.' });
      } else {
        setFeedback({
          tone: 'ok',
          text: 'Aviso enviado a los usuarios del equipo. La descarga y la instalación las inicia la sonda, no la consola.',
        });
      }
    } catch (err) {
      setFeedback({ tone: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setPushing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-terra-muted">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-verdict-amber border-t-transparent rounded-full animate-spin" />
          <p>Obteniendo ficha técnica del equipo...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-terra-muted hover:text-terra-text mb-6">
          <ChevronLeft size={20} /> Volver al buscador
        </button>
        <div className="rounded-xl bg-verdict-red/10 border border-verdict-red/30 text-verdict-red p-6">
          <h2 className="font-bold text-lg mb-2">Error al cargar el equipo</h2>
          <p>{error || 'No se encontró el equipo.'}</p>
        </div>
      </div>
    );
  }

  const { device, members, last_location, battery_history } = detail;

  // Calculate online status (e.g. seen in last 1 hour)
  const isOnline = device.last_seen_at && (new Date().getTime() - new Date(device.last_seen_at).getTime() < 3600000);

  // Filter battery history
  const filteredBatteryHistory = (battery_history || []).filter(h => {
    if (!batteryFromDate && !batteryToDate) return true;
    const hDate = new Date(h.recorded_at).getTime();
    if (batteryFromDate && hDate < new Date(batteryFromDate).getTime()) return false;
    // To date includes the whole day, so we add 24 hours to it
    if (batteryToDate && hDate > new Date(batteryToDate).getTime() + 86400000) return false;
    return true;
  });

  const measurements = detail.measurements ?? [];

  const exportBattery = () => {
    const ok = downloadCsv(
      `terrasense-bateria-${device.device_code}-${fileStamp()}.csv`,
      ['Fecha', 'Bateria (%)', 'Firmware'],
      filteredBatteryHistory.map((h) => [
        new Date(h.recorded_at).toISOString(),
        h.battery_level ?? '',
        h.firmware_version ?? '',
      ]),
    );
    if (!ok) setFeedback({ tone: 'error', text: 'El navegador bloqueó la descarga del CSV.' });
  };

  const exportMeasurements = () => {
    const ok = downloadCsv(
      `terrasense-mediciones-${device.device_code}-${fileStamp()}.csv`,
      ['Fecha', 'Predio', 'Etapa', 'Veredicto', 'Humedad (%)', 'Temp suelo (C)',
       'CE (uS/cm)', 'pH', 'N (mg/kg)', 'P (mg/kg)', 'K (mg/kg)', 'Latitud', 'Longitud'],
      measurements.map((m) => [
        new Date(m.measured_at).toISOString(), m.field_name, m.phenological_stage,
        m.verdict, m.vwc_percent, m.soil_temp_c, m.ec_us_cm, m.ph,
        m.nitrogen, m.phosphorus, m.potassium, m.latitude, m.longitude,
      ]),
    );
    if (!ok) setFeedback({ tone: 'error', text: 'El navegador bloqueó la descarga del CSV.' });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-12">
      {/* HEADER BANNER */}
      <div className="glass-panel w-full rounded-2xl overflow-hidden relative shadow-[0_0_40px_rgba(18,210,113,0.05)] border border-terra-border/50 mt-6">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-terra-surface/90 to-terra-primary/5"></div>
        <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/admin')}
              className="p-2.5 rounded-xl bg-terra-surface/80 border border-terra-border/80 text-terra-muted hover:text-terra-text hover:bg-terra-surface transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-terra-primary/20 to-terra-surface border border-terra-primary/30 flex items-center justify-center text-terra-primary shadow-lg">
                <Cpu size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  {device.alias || device.name}
                  <span className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${device.is_active ? 'bg-terra-primary text-terra-primary' : 'bg-terra-muted text-terra-muted'}`}></span>
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                  <p className="text-terra-muted text-sm font-mono flex items-center gap-1.5">
                    <span className="text-terra-muted/70 uppercase text-xs font-bold tracking-wider">UUID</span> {device.device_code}
                  </p>
                  <p className="text-terra-muted text-sm font-mono flex items-center gap-1.5">
                    <span className="text-terra-muted/70 uppercase text-xs font-bold tracking-wider">FW</span> v{device.firmware_version}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            feedback.tone === 'ok'
              ? 'bg-terra-primary/10 border-terra-primary/30 text-terra-primary'
              : 'bg-verdict-red/10 border-verdict-red/30 text-verdict-red'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CARD 1: DATOS PRINCIPALES */}
        <div className="glass-panel rounded-2xl lg:col-span-5 flex flex-col">
          <div className="px-6 py-4 border-b border-terra-border/50 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-terra-primary/10 text-terra-primary">
              <MapPin size={18} />
            </div>
            <h2 className="font-semibold text-lg">Datos principales</h2>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-terra-border/30">
                <tr>
                  <td className="py-3 text-terra-muted font-medium flex items-center gap-2"><MapPin size={14}/> Últimas coordenadas:</td>
                  <td className="py-3 text-right font-mono text-terra-text">
                    {last_location ? (
                      <a
                        href={`https://www.google.com/maps?q=${last_location.latitude},${last_location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-terra-primary hover:underline"
                        title={`${last_location.field_name} · ${new Date(last_location.measured_at).toLocaleString()}`}
                      >
                        {last_location.latitude}, {last_location.longitude}
                        <ExternalLink size={13} />
                      </a>
                    ) : (
                      'Sin datos'
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-terra-muted font-medium flex items-center gap-2"><Battery size={14}/> Batería:</td>
                  <td className="py-3 text-right font-bold text-terra-text">{device.battery_level}%</td>
                </tr>
                <tr>
                  <td className="py-3 text-terra-muted font-medium flex items-center gap-2"><Calendar size={14}/> Última conexión:</td>
                  <td className="py-3 text-right text-terra-text">
                    {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : 'Nunca'}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-terra-muted font-medium flex items-center gap-2"><Calendar size={14}/> Primera vinculación:</td>
                  <td className="py-3 text-right text-terra-text">
                    {device.created_at ? new Date(device.created_at).toLocaleString() : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-terra-muted font-medium flex items-center gap-2"><Smartphone size={14}/> Pushy token:</td>
                  <td className="py-3 text-right text-terra-muted italic">No disponible</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CARD 2: CONECTIVIDAD */}
        <div className="glass-panel rounded-2xl lg:col-span-4 flex flex-col">
          <div className="px-6 py-4 border-b border-terra-border/50 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-terra-primary/10 text-terra-primary">
              <Wifi size={18} />
            </div>
            <h2 className="font-semibold text-lg">Conectividad</h2>
            <span className="text-xs text-terra-muted ml-1">Última conexión y estado</span>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className={`p-4 rounded-xl border ${isOnline ? 'bg-terra-primary/10 border-terra-primary/30 text-terra-primary' : 'bg-terra-muted/10 border-terra-muted/30 text-terra-muted'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm uppercase tracking-wider">Estado de Red</span>
                <span className="flex items-center gap-1.5 font-bold">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-terra-primary shadow-[0_0_8px_currentColor]' : 'bg-terra-muted'}`}></span>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-sm opacity-80">
                Última actividad: {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : 'Nunca'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-terra-surface/50 border border-terra-border/50">
              <span className="font-bold text-sm uppercase tracking-wider text-terra-muted block mb-1">Versión de Software</span>
              <p className="text-terra-text font-mono">v{device.firmware_version}</p>
              {!detail.is_up_to_date && (
                <p className="text-verdict-amber text-xs mt-2 flex items-center gap-1">
                  <ShieldAlert size={12} /> Versión desactualizada
                </p>
              )}
            </div>
          </div>
        </div>

        {/* CARD 3: COMANDOS */}
        <div className="glass-panel rounded-2xl lg:col-span-3 flex flex-col">
          <div className="px-6 py-4 border-b border-terra-border/50 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-verdict-red/10 text-verdict-red">
              <ShieldAlert size={18} />
            </div>
            <h2 className="font-semibold text-lg">Comandos</h2>
          </div>
          <div className="p-6 flex flex-col gap-5 flex-1">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-terra-muted">
                Avisar de actualización OTA
              </span>
              {releases.length === 0 ? (
                <p className="text-xs text-terra-muted">
                  No hay versiones publicadas en el catálogo.
                </p>
              ) : (
                <>
                  <select
                    value={selectedRelease}
                    onChange={(e) => setSelectedRelease(e.target.value)}
                    className="bg-terra-surface border border-terra-border rounded-lg px-3 py-2 outline-none focus:border-terra-primary text-terra-text text-sm"
                  >
                    <option value="">Elegir versión…</option>
                    {releases.map((r) => (
                      <option key={r.id} value={r.id}>
                        v{r.version} · {r.hardware_target}
                        {r.is_mandatory ? ' · obligatoria' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void handlePushFirmware()}
                    disabled={!selectedRelease || pushing}
                    className="w-full py-3 rounded-xl bg-terra-primary/15 text-terra-primary border border-terra-primary/30 hover:bg-terra-primary/25 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <UploadCloud size={18} />
                    {pushing ? 'Enviando aviso…' : 'Enviar aviso'}
                  </button>
                  <p className="text-[11px] leading-snug text-terra-muted">
                    Genera una alerta push para los usuarios del equipo. No transfiere el binario:
                    la descarga, la verificación del SHA-256 y la instalación las hace la sonda.
                  </p>
                </>
              )}
            </div>

            <div className="border-t border-terra-border/50 pt-4 mt-auto">
              <button
                onClick={() => setShowResetModal(true)}
                className="w-full py-4 rounded-xl bg-verdict-red text-white hover:bg-red-600 font-bold transition-colors shadow-lg shadow-verdict-red/20 flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Resetear de Fábrica
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 4: USUARIOS */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-terra-border/50 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-terra-primary/10 text-terra-primary">
            <Shield size={18} />
          </div>
          <h2 className="font-semibold text-lg">Usuarios ({members.length})</h2>
          <span className="text-xs text-terra-muted ml-1">Miembros vinculados</span>
        </div>

        {members.length === 0 ? (
          <div className="py-12 text-center text-terra-muted">Este equipo no tiene usuarios vinculados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center">
              <thead className="bg-terra-surface/50 text-terra-muted uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left">Nombre</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Autorizar</th>
                  <th className="px-6 py-4">Desvincular</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terra-border/30">
                {members.map((m) => {
                  const isAdmin = m.role === 'admin';
                  return (
                    <tr key={m.user_id} className="hover:bg-terra-surface/40 transition-colors">
                      <td className="px-6 py-4 text-left font-bold text-terra-text">{m.full_name}</td>
                      <td className="px-6 py-4 text-terra-muted">{m.email}</td>
                      <td className="px-6 py-4">
                        <span>{isAdmin ? 'Administrador' : 'Usuario'}</span>
                        {!isAdmin && m.is_authorized && <button
                          onClick={() => setPendingTransfer(m.user_id)}
                          className="ml-2 text-terra-primary text-xs font-bold"
                        >Delegar administración</button>}
                        {pendingTransfer === m.user_id && <div className="mt-2 text-xs">
                          <p>El administrador actual pasará a ser usuario.</p>
                          <button onClick={() => { setPendingTransfer(null); void handleRoleChange(m.user_id, 'admin'); }} className="mr-3 text-terra-primary">Confirmar</button>
                          <button onClick={() => setPendingTransfer(null)}>Cancelar</button>
                        </div>}
                      </td>
                      <td className="px-6 py-4 font-bold text-xs">
                        {m.is_authorized ? (
                          <span className="text-terra-primary uppercase">Autorizado</span>
                        ) : (
                          <span className="text-verdict-amber uppercase">Pendiente de aprobación</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          disabled={m.is_authorized}
                          onClick={() => handleAuthChange(m.user_id, true)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${m.is_authorized ? 'bg-verdict-amber/10 text-verdict-amber hover:bg-verdict-amber/20' : 'bg-terra-primary/10 text-terra-primary hover:bg-terra-primary/20'}`}
                        >
                          {m.is_authorized ? 'Aprobado' : 'Aprobar'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {pendingRemoval === m.user_id ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => void handleRemove(m.user_id)}
                              className="px-3 py-1.5 rounded-full text-xs font-bold bg-verdict-red text-white hover:bg-red-600 transition-colors"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setPendingRemoval(null)}
                              className="px-3 py-1.5 rounded-full text-xs font-bold border border-terra-border text-terra-muted hover:text-terra-text transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={isAdmin || members.length <= 1}
                            onClick={() => setPendingRemoval(m.user_id)}
                            className="p-2 rounded-full text-terra-muted hover:text-verdict-red hover:bg-verdict-red/10 transition-colors mx-auto block"
                            title={isAdmin ? "Delega la administración antes de eliminar este usuario" : members.length <= 1 ? "Debe quedar al menos un usuario" : "Eliminar usuario del equipo"}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CARD 5: HISTORIAL BATERÍA */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-terra-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-terra-primary/10 text-terra-primary">
              <BatteryMedium size={18} />
            </div>
            <h2 className="font-semibold text-lg">Historial batería</h2>
            <span className="text-xs text-terra-muted ml-1">Baterías</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-terra-muted">Desde:</span>
              <input
                type="date"
                value={batteryFromDate}
                onChange={(e) => setBatteryFromDate(e.target.value)}
                className="bg-terra-surface border border-terra-border rounded-lg px-2 py-1 outline-none focus:border-terra-primary text-terra-text text-sm"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-terra-muted">Hasta:</span>
              <input
                type="date"
                value={batteryToDate}
                onChange={(e) => setBatteryToDate(e.target.value)}
                className="bg-terra-surface border border-terra-border rounded-lg px-2 py-1 outline-none focus:border-terra-primary text-terra-text text-sm"
              />
            </div>
            <button
              onClick={() => { setBatteryFromDate(''); setBatteryToDate(''); }}
              className="px-3 py-1.5 rounded-lg border border-terra-border hover:bg-terra-surface text-sm transition-colors"
            >
              Restablecer
            </button>
            <button
              onClick={exportBattery}
              disabled={filteredBatteryHistory.length === 0}
              className="px-3 py-1.5 rounded-lg border border-terra-border hover:bg-terra-surface text-sm transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Descargar el rango visible en CSV"
            >
              <Download size={14} />
              CSV
            </button>
          </div>
        </div>

        <div className="p-6 bg-terra-surface/20 min-h-[300px]">
          {filteredBatteryHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-terra-muted py-20">
              <BatteryMedium size={48} className="opacity-20 mb-4" />
              <p>No hay datos de batería cargados</p>
              <p className="text-sm opacity-70">Selecciona un rango de fechas y haz clic en buscar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left max-w-3xl mx-auto">
                <thead className="text-terra-muted uppercase text-[10px] font-bold tracking-wider border-b border-terra-border/50">
                  <tr>
                    <th className="pb-3 px-4">Fecha y Hora</th>
                    <th className="pb-3 px-4">Nivel de Batería</th>
                    <th className="pb-3 px-4">Versión Firmware</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terra-border/30">
                  {filteredBatteryHistory.map((h, i) => (
                    <tr key={i} className="hover:bg-terra-surface/30">
                      <td className="py-3 px-4">{new Date(h.recorded_at).toLocaleString()}</td>
                      <td className="py-3 px-4 font-bold">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-terra-surface rounded-full overflow-hidden">
                            <div
                              className={`h-full ${h.battery_level > 20 ? 'bg-terra-primary' : 'bg-verdict-red'}`}
                              style={{ width: `${h.battery_level}%` }}
                            ></div>
                          </div>
                          {h.battery_level}%
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-terra-muted">v{h.firmware_version || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CARD 6: MEDICIONES AGRONÓMICAS */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-terra-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-terra-primary/10 text-terra-primary">
              <Sprout size={18} />
            </div>
            <h2 className="font-semibold text-lg">Mediciones agronómicas</h2>
            <span className="text-xs text-terra-muted ml-1">
              Últimas {measurements.length} lecturas de los sensores
            </span>
          </div>
          <button
            onClick={exportMeasurements}
            disabled={measurements.length === 0}
            className="px-3 py-1.5 rounded-lg border border-terra-border hover:bg-terra-surface text-sm transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Descargar las mediciones en CSV"
          >
            <Download size={14} />
            CSV
          </button>
        </div>

        {measurements.length === 0 ? (
          <div className="py-16 text-center text-terra-muted">
            <Sprout size={48} className="opacity-20 mb-4 mx-auto" />
            <p>Este equipo todavía no ha reportado mediciones.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-terra-surface/50 text-terra-muted uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-4">Fecha</th>
                  <th className="px-4 py-4">Predio / Etapa</th>
                  <th className="px-4 py-4">Veredicto</th>
                  <th className="px-4 py-4 text-right">Humedad</th>
                  <th className="px-4 py-4 text-right">Temp.</th>
                  <th className="px-4 py-4 text-right">CE</th>
                  <th className="px-4 py-4 text-right">pH</th>
                  <th className="px-4 py-4 text-right">N / P / K</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terra-border/30">
                {measurements.map((m) => {
                  const tone =
                    m.verdict === 'GREEN'
                      ? 'bg-terra-primary/10 text-terra-primary'
                      : m.verdict === 'AMBER'
                        ? 'bg-verdict-amber/10 text-verdict-amber'
                        : 'bg-verdict-red/10 text-verdict-red';
                  return (
                    <tr key={m.id} className="hover:bg-terra-surface/40 transition-colors">
                      <td className="px-4 py-3 text-terra-muted">
                        {new Date(m.measured_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-terra-text">{m.field_name || '—'}</div>
                        <div className="text-xs text-terra-muted">{m.phenological_stage}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${tone}`}
                          title={m.verdict_title}
                        >
                          {m.verdict}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular">{m.vwc_percent} %</td>
                      <td className="px-4 py-3 text-right tabular">{m.soil_temp_c} °C</td>
                      <td className="px-4 py-3 text-right tabular">{m.ec_us_cm} µS/cm</td>
                      <td className="px-4 py-3 text-right tabular">{m.ph}</td>
                      <td className="px-4 py-3 text-right tabular text-terra-muted">
                        {m.nitrogen} / {m.phosphorus} / {m.potassium}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3 border-t border-terra-border/50 flex items-start gap-2 text-xs text-terra-muted">
          <AlertTriangle size={14} className="text-verdict-amber shrink-0 mt-0.5" />
          <span>
            N, P y K se derivan de la conductividad eléctrica, no de electrodos ion-selectivos: sirven
            para verificar que el sensor responde, no para calcular dosis de fertilizante.
          </span>
        </div>
      </div>

      {showResetModal && id && (
        <FactoryResetModal
          deviceId={id}
          expectedCode={device.device_code}
          onClose={() => setShowResetModal(false)}
          onSuccess={(res) => {
            setFeedback({
              tone: 'ok',
              text:
                `Reseteo completado: ${res.members_removed} miembro(s) desvinculado(s), ` +
                `${res.measurements_deleted} medición(es), ${res.quadrants_deleted} cuadrante(s) y ` +
                `${res.alerts_deleted} alerta(s) eliminadas. El código del equipo se conserva.`,
            });
            setShowResetModal(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

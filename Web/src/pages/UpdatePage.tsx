// src/pages/UpdatePage.tsx — cargar una versión de firmware y enviarla a todos.
//
// Flujo: cargar el .bin (el navegador calcula su SHA-256) → queda como
// borrador → publicar → enviar a todos. Publicar y enviar son pasos separados
// a propósito: la versión se puede probar antes en un solo equipo desde su
// tarjeta Actualización.

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, FileUp, RefreshCw, Rocket, Send, Trash2, UploadCloud } from 'lucide-react';
import {
  createRelease,
  deleteRelease,
  friendlyError,
  listReleaseDevices,
  listReleases,
  publishRelease,
  sendUpdateToAll,
} from '../../backend/adminApi';
import type { Release, ReleaseDevice } from '../../backend/types';
import { UpdateStatusBadge } from '../components/device/UpdateCard';
import { useCardData } from '../hooks/useCardData';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../ui/Dialog';
import { TextField } from '../ui/Field';
import { Badge, EmptyState, Notice, SkeletonRows } from '../ui/Feedback';
import { dateTime, formatDeviceCode } from '../utils/format';

type Pending = { kind: 'publish' | 'send' | 'delete'; release: Release } | null;

const kb = (bytes: number | null) => (bytes == null ? '—' : `${Math.round(bytes / 1024).toLocaleString('es-CL')} KB`);

function UploadForm({ onCreated }: { onCreated: (version: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [mandatory, setMandatory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return setError('Elige el archivo .bin del firmware.');
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(version.trim())) {
      return setError('La versión debe tener el formato X.Y.Z, por ejemplo 1.2.0.');
    }
    setBusy(true);
    setError(null);
    try {
      await createRelease({ file, version: version.trim(), notes, mandatory });
      onCreated(version.trim());
      setFile(null);
      setVersion('');
      setNotes('');
      setMandatory(false);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Cargar versión" labelledBy="card-cargar" description="Queda como borrador hasta que la publiques">
      <form onSubmit={submit} className="grid gap-5 px-5 py-5 md:grid-cols-2" noValidate>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <span className="text-[13px] font-medium text-ink">Archivo de firmware</span>
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-4 py-4 text-sm
              transition-colors hover:border-primary hover:bg-primary-soft/40
              ${file ? 'border-primary/50 bg-primary-soft/30' : 'border-line-strong'}`}
          >
            <FileUp size={20} className="shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0">
              {file ? (
                <>
                  <span className="block truncate font-medium text-ink">{file.name}</span>
                  <span className="text-[13px] text-muted">{kb(file.size)}</span>
                </>
              ) : (
                <>
                  <span className="block font-medium text-ink">Elegir el .bin</span>
                  <span className="text-[13px] text-muted">
                    Arduino IDE: Programa → Exportar binario compilado. Usa el archivo sin «merged».
                  </span>
                </>
              )}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".bin,application/octet-stream"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={busy}
            />
          </label>
        </div>
        <TextField
          label="Versión"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="1.1.0"
          hint="Debe coincidir con FIRMWARE_VERSION de config.h"
          disabled={busy}
          className="font-mono"
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="notas" className="text-[13px] font-medium text-ink">
            Notas <span className="font-normal text-muted">(las verá el administrador)</span>
          </label>
          <textarea
            id="notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={busy}
            className="rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint
              focus:border-primary focus:ring-3 focus:ring-primary/15 focus:outline-none"
            placeholder="Qué cambia en esta versión"
          />
        </div>
        <label className="flex items-center gap-2.5 text-sm text-ink md:col-span-2">
          <input
            type="checkbox"
            checked={mandatory}
            onChange={(e) => setMandatory(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 accent-[var(--ts-primary)]"
          />
          Obligatoria <span className="text-muted">(la app la marca como necesaria)</span>
        </label>
        {error && (
          <div className="md:col-span-2">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        <div className="md:col-span-2">
          <Button type="submit" variant="primary" icon={UploadCloud} busy={busy}>
            Cargar versión
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ReleaseDevices({ releaseId }: { releaseId: string }) {
  const data = useCardData(() => listReleaseDevices(releaseId), `release-${releaseId}`);
  if (data.loading && !data.data) return <SkeletonRows rows={2} label="Cargando equipos" />;
  if (data.error) return <div className="px-5 py-3"><Notice tone="error">{data.error}</Notice></div>;
  if (!data.data?.length) return <p className="px-5 py-4 text-[13px] text-muted">Todavía no se envió a ningún equipo.</p>;
  return (
    <ul className="divide-y divide-line">
      {data.data.map((d: ReleaseDevice) => (
        <li key={d.device_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-sm">
          <Link to={`/equipo/${d.device_id}`} className="font-mono text-[13px] text-primary-ink tabular hover:underline">
            {formatDeviceCode(d.device_code)}
          </Link>
          <UpdateStatusBadge status={d.status} />
          <span className="text-xs text-faint">{dateTime(d.updated_at)}</span>
          {d.error && <span className="w-full text-[13px] text-danger">{d.error}</span>}
        </li>
      ))}
    </ul>
  );
}

function ReleaseRow({ release, onAction }: { release: Release; onAction: (p: NonNullable<Pending>) => void }) {
  const [open, setOpen] = useState(false);
  const counts: [string, number, 'amber' | 'green' | 'red'][] = [
    ['Pendientes', release.pending, 'amber'],
    ['Instalando', release.installing, 'amber'],
    ['Instaladas', release.installed, 'green'],
    ['Fallidas', release.failed, 'red'],
  ];
  return (
    <li>
      <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-medium text-ink tabular">{release.version}</span>
            {release.is_published ? <Badge tone="green">Publicada</Badge> : <Badge>Borrador</Badge>}
            {release.is_mandatory && <Badge tone="amber">Obligatoria</Badge>}
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {kb(release.size_bytes)} · SHA-256 <span className="font-mono">{release.sha256?.slice(0, 12)}…</span> ·{' '}
            {release.is_published ? `publicada ${dateTime(release.published_at)}` : `cargada ${dateTime(release.created_at)}`}
          </p>
          {release.release_notes && <p className="mt-1.5 text-sm text-ink">{release.release_notes}</p>}
        </div>

        {release.is_published && (
          <dl className="flex gap-5 text-center">
            {counts.map(([label, value, tone]) => (
              <div key={label}>
                <dd className={`font-mono text-lg tabular ${value ? (tone === 'green' ? 'text-primary-ink' : tone === 'red' ? 'text-danger' : 'text-warning') : 'text-faint'}`}>
                  {value}
                </dd>
                <dt className="text-xs text-muted">{label}</dt>
              </div>
            ))}
          </dl>
        )}

        <div className="flex flex-wrap gap-2">
          {release.is_published ? (
            <>
              <Button variant="primary" icon={Send} onClick={() => onAction({ kind: 'send', release })}>
                Asignar a todos
              </Button>
              <Button icon={ChevronDown} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                {open ? 'Ocultar equipos' : 'Ver equipos'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" icon={Rocket} onClick={() => onAction({ kind: 'publish', release })}>
                Publicar
              </Button>
              <Button variant="danger" icon={Trash2} onClick={() => onAction({ kind: 'delete', release })}>
                Borrar
              </Button>
            </>
          )}
        </div>
      </div>
      {open && (
        <div className="border-t border-dashed border-line bg-sunken">
          <ReleaseDevices releaseId={release.id} />
        </div>
      )}
    </li>
  );
}

export function UpdatePage() {
  const releases = useCardData(listReleases, 'releases');
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const confirmAction = async () => {
    if (!pending) return;
    setBusy(true);
    setDialogError(null);
    try {
      const { kind, release } = pending;
      if (kind === 'publish') {
        await publishRelease(release.id);
        setNotice(`Versión ${release.version} publicada. Ya se puede asignar a un equipo o a todos.`);
      } else if (kind === 'delete') {
        await deleteRelease(release.id);
        setNotice(`Borrador ${release.version} eliminado.`);
      } else {
        const result = await sendUpdateToAll(release.id);
        setNotice(
          result.sent === 0
            ? 'Ningún equipo necesitaba esta versión: todos la tienen, tienen una más nueva, ya la tienen asignada o no tienen administrador.'
            : `Versión ${release.version} asignada a ${result.sent} ${result.sent === 1 ? 'equipo' : 'equipos'}.` +
                (result.skipped ? ` ${result.skipped} no la necesitaban o no tienen administrador.` : ''),
        );
      }
      setPending(null);
      await releases.refresh();
    } catch (e) {
      setDialogError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const dialogText: Record<NonNullable<Pending>['kind'], { title: string; label: string; body: string }> = {
    publish: {
      title: `¿Publicar la versión ${pending?.release.version}?`,
      label: 'Publicar',
      body: 'Quedará disponible para asignarla a los equipos. La instalación desde la app aún no está disponible.',
    },
    send: {
      title: `¿Asignar la versión ${pending?.release.version} a todos?`,
      label: 'Asignar a todos',
      body: 'Quedará asignada a cada equipo con una versión anterior o sin versión informada. Los equipos que ya la tienen, tienen una más nueva o no tienen administrador se omiten. La instalación desde la app aún no está disponible.',
    },
    delete: {
      title: `¿Borrar el borrador ${pending?.release.version}?`,
      label: 'Borrar',
      body: 'Se borran la versión y su archivo. Nadie la recibió porque no está publicada.',
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Update</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          Carga versiones del firmware y asígnalas a los equipos. La instalación desde la app aún está pendiente
          de habilitación.
        </p>
      </div>

      {notice && (
        <Notice tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Notice>
      )}

      <UploadForm
        onCreated={(v) => {
          setNotice(`Versión ${v} cargada como borrador.`);
          void releases.refresh();
        }}
      />

      <Card
        title="Versiones"
        labelledBy="card-versiones"
        actions={
          <Button size="sm" icon={RefreshCw} onClick={() => void releases.refresh()} busy={releases.loading && releases.data != null}>
            Refrescar
          </Button>
        }
      >
        {releases.error && (
          <div className="px-5 pt-4">
            <Notice tone="error">{releases.error}</Notice>
          </div>
        )}
        {!releases.data ? (
          releases.loading && <SkeletonRows rows={3} label="Cargando versiones" />
        ) : releases.data.length === 0 ? (
          <EmptyState icon={UploadCloud} title="Sin versiones cargadas">
            Carga el primer binario con el formulario de arriba.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {releases.data.map((r) => (
              <ReleaseRow
                key={r.id}
                release={r}
                onAction={(p) => {
                  setDialogError(null);
                  setPending(p);
                }}
              />
            ))}
          </ul>
        )}
      </Card>

      {pending && (
        <ConfirmDialog
          title={dialogText[pending.kind].title}
          confirmLabel={dialogText[pending.kind].label}
          tone={pending.kind === 'delete' ? 'danger' : 'primary'}
          busy={busy}
          error={dialogError}
          onClose={() => setPending(null)}
          onConfirm={() => void confirmAction()}
        >
          <p>{dialogText[pending.kind].body}</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

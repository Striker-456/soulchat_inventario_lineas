import { useMemo, useState } from 'react';
import {
  api, errorMessage,
  type AuditoriaEntry, type Connectly, type ConnectlyInput, type ConnectlyReveal, type Linea, type LineaInput, type Smart, type SmartInput,
} from '../api';
import {
  Button, Tabs, Input, Select, Textarea, Toggle, CollapsibleSection, EmptyState, StatusBadge, Modal, ConfirmModal, LoadingBlock, ErrorBanner, Spinner,
  CredentialField, CredentialCreateInput, KEEP_CREDENTIAL, credentialToPayload, type CredentialChange, PlusIcon,
} from '../components/ui';
import AuditTable from '../components/AuditTable';
import { lineaTexto } from '../components/LineaCells';
import { useAuth } from '../auth/AuthContext';
import { useCatalogos } from '../context/CatalogosContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../lib/useAsync';
import { emptyToNull, formatDateTime, idToString, normalize, parseServerDate, toIdOrNull } from '../lib/format';

type ModuleTab = 'Connectly' | 'Smart';

export interface LineaDetailOptions {
  /** Pestaña a mostrar al abrir. */
  tab?: ModuleTab;
  /** Abre el formulario para crear la configuración de ese módulo. */
  addConnectly?: boolean;
  addSmart?: boolean;
}

interface Loaded {
  linea: Linea;
  connectly: Connectly | null;
  smart: Smart | null;
}

async function loadAll(id: number): Promise<Loaded> {
  const linea = await api.lineas.get(id);
  const [connectly, smart] = await Promise.all([
    linea.tieneConnectly ? api.connectly.get(id) : Promise.resolve(null),
    linea.tieneSmart ? api.smart.get(id) : Promise.resolve(null),
  ]);
  return { linea, connectly, smart };
}

// ─── Formularios ──────────────────────────────────────────────────────────────
interface GeneralForm {
  numero: string;
  clienteId: string;
  statusId: string;
  tenenciaId: string;
  coordinadorId: string;
  programadorId: string;
  descripcion: string;
}

const toGeneralForm = (l: Linea): GeneralForm => ({
  numero: l.numero ?? '',
  clienteId: idToString(l.clienteId),
  statusId: idToString(l.statusDesarrolloId),
  tenenciaId: idToString(l.tenenciaSimCardId),
  coordinadorId: idToString(l.coordinadorId),
  programadorId: idToString(l.programadorId),
  descripcion: l.descripcionUso ?? '',
});

const toLineaInput = (f: GeneralForm): LineaInput => ({
  numero: f.numero.trim(),
  clienteId: Number(f.clienteId),
  descripcionUso: emptyToNull(f.descripcion),
  statusDesarrolloId: toIdOrNull(f.statusId),
  coordinadorId: toIdOrNull(f.coordinadorId),
  programadorId: toIdOrNull(f.programadorId),
  tenenciaSimCardId: toIdOrNull(f.tenenciaId),
});

interface ConnectlyForm {
  numeroConnectly: string;
  usuario: string;
  businessId: string;
  webhook: string;
  dns: string;
  contrasena: CredentialChange;
  apiKey: CredentialChange;
}

const emptyConnectlyForm = (): ConnectlyForm => ({
  numeroConnectly: '', usuario: '', businessId: '', webhook: '', dns: '', contrasena: KEEP_CREDENTIAL, apiKey: KEEP_CREDENTIAL,
});

const connectlyToForm = (c: Connectly): ConnectlyForm => ({
  numeroConnectly: c.numeroConnectly,
  usuario: c.usuario,
  businessId: c.businessId ?? '',
  webhook: c.webhook ?? '',
  dns: c.dns ?? '',
  contrasena: KEEP_CREDENTIAL,
  apiKey: KEEP_CREDENTIAL,
});

const setValue = (c: CredentialChange): string => (c.mode === 'set' ? c.value : '');

function connectlyToInput(f: ConnectlyForm, isNew: boolean): ConnectlyInput {
  return {
    numeroConnectly: f.numeroConnectly.trim(),
    usuario: f.usuario.trim(),
    businessId: emptyToNull(f.businessId),
    webhook: emptyToNull(f.webhook),
    dns: emptyToNull(f.dns),
    // Alta: valores tal cual. Edición: null = conservar, "" = borrar, otro = reemplazar.
    contrasena: isNew ? setValue(f.contrasena) : credentialToPayload(f.contrasena),
    apiKey: isNew ? emptyToNull(setValue(f.apiKey)) : credentialToPayload(f.apiKey),
  };
}

interface SmartForm {
  numeroLinea: string;
  tipoActivacionId: string;
  bspId: string;
  appChannelId: string;
  fechaVerificacion: string;
  companyBot: string;
  botId: string;
  botVersion: string;
  companyCampanasBotai: string;
  companyIdCampanas: string;
  webhookCos: string;
  webhookSda: string;
  usuarioCompanyId: string;
  clave: CredentialChange;
  envioPush: boolean;
  facturado: boolean;
  uso: string;
  observaciones: string;
}

const emptySmartForm = (): SmartForm => ({
  numeroLinea: '', tipoActivacionId: '', bspId: '', appChannelId: '', fechaVerificacion: '',
  companyBot: '', botId: '', botVersion: '', companyCampanasBotai: '', companyIdCampanas: '',
  webhookCos: '', webhookSda: '', usuarioCompanyId: '', clave: KEEP_CREDENTIAL,
  envioPush: false, facturado: false, uso: '', observaciones: '',
});

const smartToForm = (s: Smart): SmartForm => ({
  numeroLinea: s.numeroLinea,
  tipoActivacionId: idToString(s.tipoActivacionId),
  bspId: idToString(s.bspId),
  appChannelId: idToString(s.appChannelId),
  fechaVerificacion: s.fechaVerificacion ? s.fechaVerificacion.slice(0, 10) : '',
  companyBot: s.companyBot ?? '',
  botId: s.botId ?? '',
  botVersion: s.botVersion ?? '',
  companyCampanasBotai: s.companyCampanasBotai ?? '',
  companyIdCampanas: s.companyIdCampanas ?? '',
  webhookCos: s.webhookCos ?? '',
  webhookSda: s.webhookSda ?? '',
  usuarioCompanyId: s.usuarioCompanyId ?? '',
  clave: KEEP_CREDENTIAL,
  envioPush: s.envioPush,
  facturado: s.facturado,
  uso: s.uso ?? '',
  observaciones: s.observaciones ?? '',
});

function smartToInput(f: SmartForm, isNew: boolean): SmartInput {
  return {
    numeroLinea: f.numeroLinea.trim(),
    tipoActivacionId: toIdOrNull(f.tipoActivacionId),
    bspId: toIdOrNull(f.bspId),
    appChannelId: toIdOrNull(f.appChannelId),
    fechaVerificacion: emptyToNull(f.fechaVerificacion),
    companyBot: emptyToNull(f.companyBot),
    botId: emptyToNull(f.botId),
    botVersion: emptyToNull(f.botVersion),
    companyCampanasBotai: emptyToNull(f.companyCampanasBotai),
    companyIdCampanas: emptyToNull(f.companyIdCampanas),
    webhookCos: emptyToNull(f.webhookCos),
    webhookSda: emptyToNull(f.webhookSda),
    usuarioCompanyId: emptyToNull(f.usuarioCompanyId),
    clave: isNew ? emptyToNull(setValue(f.clave)) : credentialToPayload(f.clave),
    envioPush: f.envioPush,
    facturado: f.facturado,
    uso: emptyToNull(f.uso),
    observaciones: emptyToNull(f.observaciones),
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type FieldErrors = Record<string, string>;

// ─── Página ───────────────────────────────────────────────────────────────────
export default function LineaDetailPage({ lineaId, options, onBack }: { lineaId: number; options?: LineaDetailOptions; onBack: () => void }) {
  const { data, error, reload } = useAsync(() => loadAll(lineaId), [lineaId]);

  return (
    <div className="space-y-4">
      {error && (
        <>
          <BackButton onBack={onBack} />
          <ErrorBanner message={error} onRetry={reload} />
        </>
      )}
      {!data && !error && <LoadingBlock label="Cargando línea..." />}
      {data && <LineaDetailForm lineaId={lineaId} initial={data} options={options} onBack={onBack} />}
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#3FB6C4] mb-3 transition-colors">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      Volver a Líneas
    </button>
  );
}

interface ModuleState<TSaved, TForm, TReveal> {
  saved: TSaved | null;
  form: TForm;
  /** El usuario abrió el formulario para crear la configuración. */
  adding: boolean;
  revealed?: TReveal;
}

function LineaDetailForm({ lineaId, initial, options, onBack }: { lineaId: number; initial: Loaded; options?: LineaDetailOptions; onBack: () => void }) {
  const { can } = useAuth();
  const canEdit = can('lineas', 'editar');
  const canDelete = can('lineas', 'eliminar');
  const canReveal = can('credenciales', 'ver');
  const canHistory = can('auditoria', 'ver');
  const toast = useToast();
  const { clientes, empleados, status, tenencias, tiposActivacion, bsps, appChannels } = useCatalogos();

  const [linea, setLinea] = useState(initial.linea);
  const [general, setGeneral] = useState<GeneralForm>(() => toGeneralForm(initial.linea));
  const [connectly, setConnectly] = useState<ModuleState<Connectly, ConnectlyForm, ConnectlyReveal>>({
    saved: initial.connectly,
    form: initial.connectly ? connectlyToForm(initial.connectly) : emptyConnectlyForm(),
    adding: !initial.connectly && !!options?.addConnectly,
  });
  const [smart, setSmart] = useState<ModuleState<Smart, SmartForm, { clave: string | null }>>({
    saved: initial.smart,
    form: initial.smart ? smartToForm(initial.smart) : emptySmartForm(),
    adding: !initial.smart && !!options?.addSmart,
  });

  const [activeTab, setActiveTab] = useState<ModuleTab>(options?.tab ?? 'Connectly');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ general: FieldErrors; connectly: FieldErrors; smart: FieldErrors }>({ general: {}, connectly: {}, smart: {} });
  const [confirm, setConfirm] = useState<'linea' | 'connectly' | 'smart' | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ─── Dirty tracking ─────────────────────────────────────────────────────────
  const generalDirty = !same(general, toGeneralForm(linea));
  const connectlyBaseline = connectly.saved ? connectlyToForm(connectly.saved) : emptyConnectlyForm();
  const smartBaseline = smart.saved ? smartToForm(smart.saved) : emptySmartForm();
  const connectlyDirty = !same(connectly.form, connectlyBaseline);
  const smartDirty = !same(smart.form, smartBaseline);
  const dirty = generalDirty || connectlyDirty || smartDirty;

  const hasConnectly = connectly.saved !== null || connectly.adding;
  const hasSmart = smart.saved !== null || smart.adding;

  const lastModified = useMemo(() => {
    const dates = [linea.updatedAt, connectly.saved?.updatedAt, smart.saved?.updatedAt].filter((d): d is string => !!d);
    return dates.reduce((a, b) => (parseServerDate(a) > parseServerDate(b) ? a : b));
  }, [linea.updatedAt, connectly.saved, smart.saved]);

  // ─── Validación previa (espejo de los validators del backend) ───────────────
  const validate = () => {
    const e = { general: {} as FieldErrors, connectly: {} as FieldErrors, smart: {} as FieldErrors };
    if (generalDirty && !general.numero.trim()) e.general.numero = 'Requerido';
    if (generalDirty && !general.clienteId) e.general.clienteId = 'Selecciona un cliente';
    if (connectlyDirty) {
      if (!connectly.form.numeroConnectly.trim()) e.connectly.numeroConnectly = 'Requerido';
      if (!connectly.form.usuario.trim()) e.connectly.usuario = 'Requerido';
      if (!connectly.saved && !setValue(connectly.form.contrasena)) e.connectly.contrasena = 'Requerida';
    }
    if (smartDirty && !smart.form.numeroLinea.trim()) e.smart.numeroLinea = 'Requerido';
    return e;
  };

  const save = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e.general).length + Object.keys(e.connectly).length + Object.keys(e.smart).length > 0) {
      if (Object.keys(e.connectly).length > 0) setActiveTab('Connectly');
      else if (Object.keys(e.smart).length > 0) setActiveTab('Smart');
      toast.error('Revisa los campos marcados en rojo.');
      return;
    }

    setSaving(true);
    try {
      if (generalDirty) {
        const updated = await api.lineas.update(lineaId, toLineaInput(general));
        setLinea(updated);
        setGeneral(toGeneralForm(updated));
      }
      if (connectlyDirty) {
        const isNew = connectly.saved === null;
        const dto = connectlyToInput(connectly.form, isNew);
        const saved = isNew ? await api.connectly.create(lineaId, dto) : await api.connectly.update(lineaId, dto);
        setConnectly({ saved, form: connectlyToForm(saved), adding: false });
        setLinea(l => ({ ...l, tieneConnectly: true }));
      }
      if (smartDirty) {
        const isNew = smart.saved === null;
        const dto = smartToInput(smart.form, isNew);
        const saved = isNew ? await api.smart.create(lineaId, dto) : await api.smart.update(lineaId, dto);
        setSmart({ saved, form: smartToForm(saved), adding: false });
        setLinea(l => ({ ...l, tieneSmart: true }));
      }
      toast.success('Cambios guardados exitosamente');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setGeneral(toGeneralForm(linea));
    setConnectly(s => ({ ...s, form: connectlyBaseline, adding: s.saved === null ? false : s.adding, revealed: undefined }));
    setSmart(s => ({ ...s, form: smartBaseline, adding: s.saved === null ? false : s.adding, revealed: undefined }));
    setErrors({ general: {}, connectly: {}, smart: {} });
  };

  // ─── Revelar credenciales (solo Admin) ──────────────────────────────────────
  const revealConnectly = async (): Promise<boolean> => {
    try {
      const revealed = await api.connectly.reveal(lineaId);
      setConnectly(s => ({ ...s, revealed }));
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };

  const revealSmart = async (): Promise<boolean> => {
    try {
      const revealed = await api.smart.reveal(lineaId);
      setSmart(s => ({ ...s, revealed }));
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };

  // ─── Eliminaciones ──────────────────────────────────────────────────────────
  const runConfirmed = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      if (confirm === 'linea') {
        await api.lineas.remove(lineaId);
        toast.success(`Línea ${lineaTexto(linea)} eliminada`);
        onBack();
        return;
      }
      if (confirm === 'connectly') {
        await api.connectly.remove(lineaId);
        setConnectly({ saved: null, form: emptyConnectlyForm(), adding: false });
        setLinea(l => ({ ...l, tieneConnectly: false }));
      } else {
        await api.smart.remove(lineaId);
        setSmart({ saved: null, form: emptySmartForm(), adding: false });
        setLinea(l => ({ ...l, tieneSmart: false }));
      }
      toast.success('Configuración eliminada');
      setConfirm(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setConfirmBusy(false);
    }
  };

  const catalogOptions = (items: { id: number; nombre: string }[], placeholder = 'Sin asignar') => [
    { value: '', label: placeholder },
    ...items.map(i => ({ value: String(i.id), label: i.nombre })),
  ];
  const empleadoOptions = (rolMatch: string) => {
    const preferidos = empleados.filter(e => normalize(e.rol).includes(rolMatch));
    // Conserva al empleado ya asignado aunque su rol no coincida, para no perder el valor al mostrarlo.
    const seleccionado = empleados.filter(e => [general.coordinadorId, general.programadorId].includes(String(e.id)));
    const lista = preferidos.length > 0 ? [...new Map([...preferidos, ...seleccionado].map(e => [e.id, e])).values()] : empleados;
    return catalogOptions(lista);
  };

  const setG = <K extends keyof GeneralForm>(k: K, v: GeneralForm[K]) => {
    setGeneral(g => ({ ...g, [k]: v }));
    if (errors.general[k]) setErrors(e => ({ ...e, general: { ...e.general, [k]: '' } }));
  };

  const catalogosSmartVacios = tiposActivacion.length === 0 || bsps.length === 0 || appChannels.length === 0;

  return (
    <div className="space-y-4 pb-20">
      {/* Breadcrumb + Header */}
      <div>
        <BackButton onBack={onBack} />
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#1A202C] font-mono">{lineaTexto(linea)}</h1>
              <StatusBadge status={linea.statusDesarrolloNombre} />
            </div>
            <p className="text-sm text-[#64748B] mt-0.5">
              {linea.clienteNombre}{smart.saved?.appChannelNombre ? ` · ${smart.saved.appChannelNombre}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {canHistory && <Button variant="outline" onClick={() => setShowHistory(true)}>Historial de cambios</Button>}
            {canDelete && (
              <Button variant="danger" className="px-3" title="Eliminar línea" aria-label="Eliminar línea" onClick={() => setConfirm('linea')}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* General Data */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#1A202C] mb-4">Datos generales</h3>
        <fieldset disabled={!canEdit} className="min-w-0 border-0 p-0 m-0">
          <div className="grid grid-cols-4 gap-4">
            <Input label="Número de línea *" value={general.numero} onChange={ev => setG('numero', ev.target.value)} maxLength={20} error={errors.general.numero} />
            <Select label="Cliente *" value={general.clienteId} onChange={ev => setG('clienteId', ev.target.value)} options={catalogOptions(clientes, 'Seleccionar...')} error={errors.general.clienteId} />
            <Select label="Status" value={general.statusId} onChange={ev => setG('statusId', ev.target.value)} options={catalogOptions(status)} />
            <Select label="Tenencia SIM" value={general.tenenciaId} onChange={ev => setG('tenenciaId', ev.target.value)} options={catalogOptions(tenencias)} />
            <Select label="Coordinador" value={general.coordinadorId} onChange={ev => setG('coordinadorId', ev.target.value)} options={empleadoOptions('coord')} />
            <Select label="Programador" value={general.programadorId} onChange={ev => setG('programadorId', ev.target.value)} options={empleadoOptions('program')} />
            <Textarea label="Descripción de uso" wrapperClassName="col-span-4" value={general.descripcion} onChange={ev => setG('descripcion', ev.target.value)} maxLength={4000} placeholder="Para qué se usa esta línea..." />
          </div>
        </fieldset>
      </div>

      {/* Modules Tabs */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="px-5 pt-4">
          <Tabs tabs={['Connectly', 'Smart']} active={activeTab} onChange={t => setActiveTab(t as ModuleTab)} />
        </div>

        <div className="p-5">
          {activeTab === 'Connectly' && (
            hasConnectly ? (
              <fieldset disabled={!canEdit} className="min-w-0 border-0 p-0 m-0">
                <ConnectlyTab
                  state={connectly}
                  errors={errors.connectly}
                  canReveal={canReveal}
                  onChange={(form) => { setConnectly(s => ({ ...s, form })); setErrors(e => ({ ...e, connectly: {} })); }}
                  onReveal={revealConnectly}
                />
                {canEdit && connectly.saved && (
                  <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
                    <button type="button" onClick={() => setConfirm('connectly')} className="text-xs text-[#DC2626] hover:underline">Eliminar configuración Connectly</button>
                  </div>
                )}
              </fieldset>
            ) : (
              <EmptyState
                title="Sin configuración Connectly"
                description="Esta línea no tiene integración con Connectly configurada aún."
                action={canEdit ? <Button variant="primary" onClick={() => setConnectly(s => ({ ...s, adding: true }))}><PlusIcon /> Agregar configuración</Button> : undefined}
              />
            )
          )}

          {activeTab === 'Smart' && (
            hasSmart ? (
              <fieldset disabled={!canEdit} className="min-w-0 border-0 p-0 m-0">
                <SmartTab
                  state={smart}
                  errors={errors.smart}
                  canReveal={canReveal}
                  onChange={(form) => { setSmart(s => ({ ...s, form })); setErrors(e => ({ ...e, smart: {} })); }}
                  onReveal={revealSmart}
                  tiposActivacion={catalogOptions(tiposActivacion)}
                  bsps={catalogOptions(bsps)}
                  appChannels={catalogOptions(appChannels)}
                  catalogosVacios={catalogosSmartVacios}
                />
                {canEdit && smart.saved && (
                  <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
                    <button type="button" onClick={() => setConfirm('smart')} className="text-xs text-[#DC2626] hover:underline">Eliminar configuración Smart</button>
                  </div>
                )}
              </fieldset>
            ) : (
              <EmptyState
                title="Sin configuración Smart"
                description="Esta línea no tiene integración con Smart configurada aún."
                action={canEdit ? <Button variant="primary" onClick={() => setSmart(s => ({ ...s, adding: true }))}><PlusIcon /> Agregar configuración</Button> : undefined}
              />
            )
          )}
        </div>
      </div>

      {/* Fixed Save Bar */}
      {canEdit && (
        <div className="fixed bottom-0 right-0 left-56 bg-white border-t border-[#E2E8F0] px-8 py-3 flex items-center justify-between z-10">
          <span className="text-xs text-[#94A3B8]">
            Última modificación: {formatDateTime(lastModified)}
            {dirty && <span className="ml-3 text-[#D97706] font-medium">Cambios sin guardar</span>}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={discard} disabled={!dirty || saving}>Descartar</Button>
            <Button variant="primary" onClick={save} disabled={!dirty || saving}>
              {saving && <Spinner />}
              Guardar cambios
            </Button>
          </div>
        </div>
      )}

      {showHistory && (
        <HistoryModal
          lineaId={lineaId}
          etiqueta={lineaTexto(linea)}
          connectlyId={connectly.saved?.id ?? null}
          smartId={smart.saved?.id ?? null}
          onClose={() => setShowHistory(false)}
        />
      )}

      <ConfirmModal
        open={confirm !== null}
        title={confirm === 'linea' ? 'Eliminar línea' : `Eliminar configuración ${confirm === 'connectly' ? 'Connectly' : 'Smart'}`}
        message={
          confirm === 'linea'
            ? <>¿Eliminar la línea <strong>{lineaTexto(linea)}</strong> de <strong>{linea.clienteNombre}</strong> junto con sus configuraciones? Esta acción no se puede deshacer.</>
            : <>Se borrarán todos los datos y credenciales de esta configuración. Esta acción no se puede deshacer.</>
        }
        busy={confirmBusy}
        onConfirm={runConfirmed}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

// ─── Connectly ────────────────────────────────────────────────────────────────
function ConnectlyTab({ state, errors, canReveal, onChange, onReveal }: {
  state: ModuleState<Connectly, ConnectlyForm, ConnectlyReveal>;
  errors: FieldErrors;
  canReveal: boolean;
  onChange: (form: ConnectlyForm) => void;
  onReveal: () => Promise<boolean>;
}) {
  const { form, saved, revealed } = state;
  const set = <K extends keyof ConnectlyForm>(k: K, v: ConnectlyForm[K]) => onChange({ ...form, [k]: v });

  return (
    <div className="grid grid-cols-2 gap-4">
      <Input label="Número Connectly *" value={form.numeroConnectly} onChange={e => set('numeroConnectly', e.target.value)} maxLength={20} error={errors.numeroConnectly} />
      <Input label="Usuario *" value={form.usuario} onChange={e => set('usuario', e.target.value)} maxLength={100} error={errors.usuario} />

      {saved ? (
        <CredentialField
          label="Contraseña"
          masked={saved.contrasenaMasked}
          revealed={revealed?.contrasena}
          change={form.contrasena}
          onChange={c => set('contrasena', c)}
          canReveal={canReveal}
          onReveal={onReveal}
        />
      ) : (
        <CredentialCreateInput label="Contraseña" required value={setValue(form.contrasena)} onChange={v => set('contrasena', { mode: 'set', value: v })} error={errors.contrasena} />
      )}
      <Input label="Business ID" value={form.businessId} onChange={e => set('businessId', e.target.value)} maxLength={100} />

      {saved ? (
        <CredentialField
          label="API Key"
          masked={saved.apiKeyMasked}
          revealed={revealed ? revealed.apiKey : undefined}
          change={form.apiKey}
          onChange={c => set('apiKey', c)}
          canReveal={canReveal}
          onReveal={onReveal}
          clearable
        />
      ) : (
        <CredentialCreateInput label="API Key" value={setValue(form.apiKey)} onChange={v => set('apiKey', { mode: 'set', value: v })} />
      )}
      <Input label="Webhook URL" value={form.webhook} onChange={e => set('webhook', e.target.value)} maxLength={255} />
      <Input label="DNS" wrapperClassName="col-span-2" value={form.dns} onChange={e => set('dns', e.target.value)} maxLength={150} />
    </div>
  );
}

// ─── Smart ────────────────────────────────────────────────────────────────────
type Option = { value: string; label: string };

function SmartTab({ state, errors, canReveal, onChange, onReveal, tiposActivacion, bsps, appChannels, catalogosVacios }: {
  state: ModuleState<Smart, SmartForm, { clave: string | null }>;
  errors: FieldErrors;
  canReveal: boolean;
  onChange: (form: SmartForm) => void;
  onReveal: () => Promise<boolean>;
  tiposActivacion: Option[];
  bsps: Option[];
  appChannels: Option[];
  catalogosVacios: boolean;
}) {
  const { form, saved, revealed } = state;
  const set = <K extends keyof SmartForm>(k: K, v: SmartForm[K]) => onChange({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <CollapsibleSection title="Activación">
        <Input label="Número de línea *" value={form.numeroLinea} onChange={e => set('numeroLinea', e.target.value)} maxLength={20} error={errors.numeroLinea} />
        <Input label="Fecha de verificación" type="date" value={form.fechaVerificacion} onChange={e => set('fechaVerificacion', e.target.value)} />
        <Select label="Tipo de activación" value={form.tipoActivacionId} onChange={e => set('tipoActivacionId', e.target.value)} options={tiposActivacion} />
        <Select label="BSP" value={form.bspId} onChange={e => set('bspId', e.target.value)} options={bsps} />
        <Select label="App Channel" value={form.appChannelId} onChange={e => set('appChannelId', e.target.value)} options={appChannels} />
        {catalogosVacios && (
          <p className="col-span-2 text-xs text-[#94A3B8]">Algunos catálogos (Tipo de activación, BSP o App Channel) todavía no tienen valores registrados.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Bot">
        <Input label="Company bot" value={form.companyBot} onChange={e => set('companyBot', e.target.value)} />
        <Input label="Bot ID" value={form.botId} onChange={e => set('botId', e.target.value)} />
        <Input label="Versión del bot" value={form.botVersion} onChange={e => set('botVersion', e.target.value)} />
        <Input label="Company campañas BotAI" value={form.companyCampanasBotai} onChange={e => set('companyCampanasBotai', e.target.value)} />
        <Input label="Company ID campañas" value={form.companyIdCampanas} onChange={e => set('companyIdCampanas', e.target.value)} />
      </CollapsibleSection>

      <CollapsibleSection title="Integración">
        <Input label="Webhook COS" wrapperClassName="col-span-2" value={form.webhookCos} onChange={e => set('webhookCos', e.target.value)} maxLength={255} />
        <Input label="Webhook SDA" wrapperClassName="col-span-2" value={form.webhookSda} onChange={e => set('webhookSda', e.target.value)} maxLength={255} />
        <Input label="Usuario company ID" value={form.usuarioCompanyId} onChange={e => set('usuarioCompanyId', e.target.value)} />
        {saved ? (
          <CredentialField
            label="Clave"
            masked={saved.claveMasked}
            revealed={revealed?.clave}
            change={form.clave}
            onChange={c => set('clave', c)}
            canReveal={canReveal}
            onReveal={onReveal}
            clearable
          />
        ) : (
          <CredentialCreateInput label="Clave" value={setValue(form.clave)} onChange={v => set('clave', { mode: 'set', value: v })} />
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Operación">
        <Toggle checked={form.envioPush} onChange={v => set('envioPush', v)} label="Envío push" />
        <Toggle checked={form.facturado} onChange={v => set('facturado', v)} label="Facturado" />
        <Input label="Uso" wrapperClassName="col-span-2" value={form.uso} onChange={e => set('uso', e.target.value)} />
        <Textarea label="Observaciones" wrapperClassName="col-span-2" value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
      </CollapsibleSection>
    </div>
  );
}

// ─── Historial de cambios ─────────────────────────────────────────────────────
function HistoryModal({ lineaId, etiqueta, connectlyId, smartId, onClose }: {
  lineaId: number; etiqueta: string; connectlyId: number | null; smartId: number | null; onClose: () => void;
}) {
  const { data, loading, error } = useAsync<AuditoriaEntry[]>(async () => {
    const parts = await Promise.all([
      api.auditoria.list({ tabla: 'lineas', registroId: lineaId }),
      connectlyId !== null ? api.auditoria.list({ tabla: 'linea_connectly_config', registroId: connectlyId }) : Promise.resolve([]),
      smartId !== null ? api.auditoria.list({ tabla: 'linea_smart_config', registroId: smartId }) : Promise.resolve([]),
    ]);
    return parts.flat().sort((a, b) => parseServerDate(b.fecha).getTime() - parseServerDate(a.fecha).getTime());
  });

  return (
    <Modal title={`Historial de cambios · Línea ${etiqueta}`} open onClose={onClose} wide footer={<Button variant="outline" onClick={onClose}>Cerrar</Button>}>
      {error && <ErrorBanner message={error} />}
      {loading && !data ? <LoadingBlock /> : (
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden overflow-x-auto">
          <AuditTable entries={data ?? []} showRegistro={false} emptyText="Esta línea aún no tiene cambios registrados" />
        </div>
      )}
    </Modal>
  );
}

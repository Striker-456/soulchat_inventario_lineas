import { useEffect, useState } from 'react';
import { api, type LogNivel } from '../api';
import { Button, ErrorBanner, FilterDropdown, LoadingBlock, Spinner } from '../components/ui';
import { useAsync } from '../lib/useAsync';
import { formatDateTimeSeconds } from '../lib/format';

const PER_PAGE = 25;

const levelConfig: Record<LogNivel, { label: string; badge: string; dot: string }> = {
  success: { label: 'Éxito', badge: 'bg-[#DCFCE7] text-[#15803D]', dot: 'bg-[#16A34A]' },
  info: { label: 'Info', badge: 'bg-[#EFF6FF] text-[#3A7BC8]', dot: 'bg-[#3A7BC8]' },
  warning: { label: 'Advertencia', badge: 'bg-[#FEF3C7] text-[#B45309]', dot: 'bg-[#D97706]' },
  error: { label: 'Error', badge: 'bg-[#FEE2E2] text-[#B91C1C]', dot: 'bg-[#DC2626]' },
};
const LEVELS: LogNivel[] = ['success', 'info', 'warning', 'error'];

const accionIcon: Record<string, string> = {
  LOGIN: '🔑', LOGIN_FAILED: '⛔', LOGOUT: '👋',
  CREATE: '➕', UPDATE: '✏️', DELETE: '🗑', IMPORT: '📥', EXPORT: '📤',
  ACCESS_DENIED: '🚫', REVEAL_CREDENTIALS: '🔓', RESET_PASSWORD: '🔑',
  UPDATE_PERMISSIONS: '🛡', RESET_PERMISSIONS: '🛡',
};

const th = 'text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide';

export default function LogsPage() {
  const [nivel, setNivel] = useState<LogNivel | ''>('');
  const [modulo, setModulo] = useState('');
  const [usuario, setUsuario] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [texto, setTexto] = useState('');
  const [pagina, setPagina] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  // El texto se envía al servidor con una pequeña espera para no pedir en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => { setTexto(busqueda.trim()); setPagina(1); }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const { data, loading, error, reload } = useAsync(
    () => api.logs.list({ nivel: nivel || undefined, modulo: modulo || undefined, usuario: usuario || undefined, texto: texto || undefined, pagina, tamano: PER_PAGE }),
    [nivel, modulo, usuario, texto, pagina],
  );

  const total = data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / PER_PAGE));
  const desde = total === 0 ? 0 : (pagina - 1) * PER_PAGE + 1;
  const hasta = Math.min(pagina * PER_PAGE, total);
  const hayFiltros = !!(nivel || modulo || usuario || busqueda);

  const cambiar = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPagina(1); setExpanded(null); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">Logs del sistema</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Registro de actividad y eventos del panel</p>
        </div>
        <Button variant="outline" onClick={() => void reload()} disabled={loading}>
          {loading ? <Spinner /> : <RefreshIcon />}
          Actualizar
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      {/* Summary pills */}
      <div className="flex gap-3">
        {LEVELS.map(lv => (
          <button
            key={lv}
            onClick={() => cambiar(setNivel)(nivel === lv ? '' : lv)}
            aria-pressed={nivel === lv}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
              nivel === lv ? `${levelConfig[lv].badge} border-current` : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-[#F8F9FA]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${levelConfig[lv].dot}`} />
            {levelConfig[lv].label}
            <span className="font-bold">{data?.conteoPorNivel[lv] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar en detalle o acción..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-[#F8F9FA] text-[#1A202C] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3FB6C4]"
          />
        </div>
        <FilterDropdown label="Módulo" options={data?.modulos ?? []} value={modulo} onChange={cambiar(setModulo)} />
        <FilterDropdown label="Usuario" options={data?.usuarios ?? []} value={usuario} onChange={cambiar(setUsuario)} />
        {hayFiltros && (
          <button
            onClick={() => { setNivel(''); setModulo(''); setUsuario(''); setBusqueda(''); setTexto(''); setPagina(1); setExpanded(null); }}
            className="text-xs text-[#94A3B8] hover:text-[#64748B] underline"
          >
            Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-[#94A3B8]">{total} {total === 1 ? 'entrada' : 'entradas'}</span>
      </div>

      {/* Log table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        {loading && !data ? <LoadingBlock /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0]">
                    <th className={`${th} px-5 w-44`}>Timestamp</th>
                    <th className={`${th} w-28`}>Nivel</th>
                    <th className={`${th} w-28`}>Módulo</th>
                    <th className={th}>Usuario</th>
                    <th className={`${th} w-44`}>Acción</th>
                    <th className={th}>Detalle</th>
                    <th className={`${th} w-28`}>IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] font-mono">
                  {(data?.items.length ?? 0) === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-sm text-[#94A3B8] font-sans">No hay registros con estos filtros</td></tr>
                  )}
                  {data?.items.map(log => {
                    const lv = levelConfig[log.nivel];
                    const isExp = expanded === log.id;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setExpanded(isExp ? null : log.id)}
                        className={`cursor-pointer transition-colors align-top ${isExp ? 'bg-[#F8F9FA]' : 'hover:bg-[#FAFAFA]'}`}
                      >
                        <td className="px-5 py-2.5 text-xs text-[#64748B] whitespace-nowrap">{formatDateTimeSeconds(log.fecha)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${lv.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${lv.dot}`} />
                            {lv.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[#374151]">{log.modulo}</td>
                        <td className="px-4 py-2.5 text-xs text-[#374151] max-w-[13rem] truncate" title={log.usuarioEmail ?? undefined}>{log.usuarioEmail ?? <span className="text-[#94A3B8]">—</span>}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-[#64748B] whitespace-nowrap">{accionIcon[log.accion] ?? '•'} {log.accion}</span>
                        </td>
                        <td className={`px-4 py-2.5 text-xs text-[#1A202C] ${isExp ? 'whitespace-pre-wrap break-words' : 'max-w-xs truncate'}`} title={log.detalle}>
                          {log.detalle}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[#94A3B8]">{log.ip ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#E2E8F0] text-sm text-[#64748B]">
              <span className="text-xs">Mostrando {desde}–{hasta} de {total}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" className="px-2 py-1 text-xs" disabled={pagina <= 1 || loading} onClick={() => { setPagina(p => p - 1); setExpanded(null); }}>‹ Anterior</Button>
                <span className="px-2 text-xs">Página {pagina} de {paginas}</span>
                <Button variant="outline" className="px-2 py-1 text-xs" disabled={pagina >= paginas || loading} onClick={() => { setPagina(p => p + 1); setExpanded(null); }}>Siguiente ›</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

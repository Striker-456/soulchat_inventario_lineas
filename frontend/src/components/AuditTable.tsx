import type { AuditoriaEntry } from '../api';
import { Badge } from './ui';
import { tablaLabel, useAuditValue } from '../lib/audit';
import { formatDateTime } from '../lib/format';

const th = 'text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide';

/** Tabla de cambios (campo, valor anterior → nuevo) usada en Auditoría y en el historial de una línea. */
export default function AuditTable({ entries, showRegistro = true, emptyText = 'Sin cambios registrados' }: {
  entries: AuditoriaEntry[];
  showRegistro?: boolean;
  emptyText?: string;
}) {
  const valor = useAuditValue();

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0]">
          <th className={`${th} px-5`}>Fecha</th>
          <th className={th}>Usuario</th>
          <th className={th}>Tabla</th>
          {showRegistro && <th className={th}>Registro</th>}
          <th className={th}>Campo</th>
          <th className={th}>Valor anterior</th>
          <th className="px-2 py-3" />
          <th className={th}>Valor nuevo</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#F1F5F9]">
        {entries.length === 0 && (
          <tr><td colSpan={showRegistro ? 8 : 7} className="text-center py-12 text-sm text-[#94A3B8]">{emptyText}</td></tr>
        )}
        {entries.map(a => (
          <tr key={a.id} className="hover:bg-[#FAFAFA] transition-colors">
            <td className="px-5 py-3 font-mono text-xs text-[#64748B] whitespace-nowrap">{formatDateTime(a.fecha)}</td>
            <td className="px-4 py-3">
              {a.usuarioEmail ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#3FB6C4] to-[#3A7BC8] flex items-center justify-center text-white text-[9px] font-bold uppercase">
                    {a.usuarioEmail.charAt(0)}
                  </div>
                  <span className="text-sm text-[#374151]">{a.usuarioEmail}</span>
                </div>
              ) : <span className="text-xs text-[#94A3B8]">—</span>}
            </td>
            <td className="px-4 py-3">
              <Badge variant={a.tablaAfectada === 'lineas' ? 'primary' : a.tablaAfectada.startsWith('linea_') ? 'secondary' : 'neutral'}>
                {tablaLabel(a.tablaAfectada)}
              </Badge>
            </td>
            {showRegistro && <td className="px-4 py-3 font-mono text-xs text-[#64748B]">#{a.registroId}</td>}
            <td className="px-4 py-3 font-mono text-xs text-[#374151]">{a.campo}</td>
            <td className="px-4 py-3">
              <span className="text-xs text-[#94A3B8] bg-[#FEE2E2] px-2 py-0.5 rounded font-mono break-all">{valor(a.campo, a.valorAnterior)}</span>
            </td>
            <td className="px-2 py-3 text-[#94A3B8]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </td>
            <td className="px-4 py-3">
              <span className="text-xs text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded font-mono break-all">{valor(a.campo, a.valorNuevo)}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

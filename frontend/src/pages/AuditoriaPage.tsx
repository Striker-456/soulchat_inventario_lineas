import { useMemo, useState } from 'react';
import { api } from '../api';
import { FilterDropdown, Pagination, LoadingBlock, ErrorBanner } from '../components/ui';
import AuditTable from '../components/AuditTable';
import { useAsync } from '../lib/useAsync';
import { TABLA_LABELS, tablaLabel } from '../lib/audit';

const PER_PAGE = 10;

export default function AuditoriaPage() {
  const { data, loading, error, reload } = useAsync(() => api.auditoria.list());
  const [filterUser, setFilterUser] = useState('');
  const [filterTable, setFilterTable] = useState('');
  const [page, setPage] = useState(1);

  const audits = useMemo(
    () => [...(data ?? [])].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [data],
  );

  const users = useMemo(() => [...new Set(audits.map(a => a.usuarioEmail).filter((u): u is string => !!u))].sort(), [audits]);
  const tables = useMemo(() => [...new Set(audits.map(a => a.tablaAfectada))], [audits]);

  const filtered = audits.filter(a => {
    if (filterUser && a.usuarioEmail !== filterUser) return false;
    if (filterTable && a.tablaAfectada !== filterTable) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // El filtro de tabla muestra etiquetas legibles pero filtra por el nombre real de la tabla.
  const tableByLabel = (label: string) => Object.entries(TABLA_LABELS).find(([, l]) => l === label)?.[0] ?? label;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#1A202C]">Auditoría</h1>
        <p className="text-sm text-[#64748B] mt-0.5">Historial de cambios del sistema</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 flex items-center gap-3">
        <FilterDropdown label="Usuario" options={users} value={filterUser} onChange={v => { setFilterUser(v); setPage(1); }} />
        <FilterDropdown
          label="Tabla"
          options={tables.map(tablaLabel)}
          value={filterTable ? tablaLabel(filterTable) : ''}
          onChange={v => { setFilterTable(v ? tableByLabel(v) : ''); setPage(1); }}
        />
        {(filterUser || filterTable) && (
          <button onClick={() => { setFilterUser(''); setFilterTable(''); setPage(1); }} className="text-xs text-[#94A3B8] hover:text-[#64748B] underline">Limpiar</button>
        )}
        <span className="ml-auto text-xs text-[#94A3B8]">{filtered.length} registros</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        {loading && !data ? <LoadingBlock /> : (
          <>
            <div className="overflow-x-auto">
              <AuditTable entries={paginated} />
            </div>
            <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

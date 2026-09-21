import { useMemo } from 'react';
import { api, type Linea } from '../api';
import { StatCard, Card, CardHeader, Badge, StatusBadge, LoadingBlock, ErrorBanner, EmptyState, statusVariant, type BadgeVariant } from '../components/ui';
import { LineaLabel, ModulosBadges } from '../components/LineaCells';
import { useAuth } from '../auth/AuthContext';
import { useCatalogos } from '../context/CatalogosContext';
import { useAsync } from '../lib/useAsync';
import { formatRelative, normalize } from '../lib/format';

const variantColors: Record<BadgeVariant, { text: string; bg: string }> = {
  success: { text: 'text-[#16A34A]', bg: 'bg-[#16A34A]' },
  warning: { text: 'text-[#D97706]', bg: 'bg-[#D97706]' },
  danger: { text: 'text-[#DC2626]', bg: 'bg-[#DC2626]' },
  neutral: { text: 'text-[#64748B]', bg: 'bg-[#64748B]' },
  primary: { text: 'text-[#3FB6C4]', bg: 'bg-[#3FB6C4]' },
  secondary: { text: 'text-[#3A7BC8]', bg: 'bg-[#3A7BC8]' },
};

const countByStatusName = (lineas: Linea[], name: string) =>
  lineas.filter(l => normalize(l.statusDesarrolloNombre) === name).length;

export default function DashboardPage() {
  const { can } = useAuth();
  // Las cifras salen del listado de líneas; sin acceso a Líneas no hay nada que resumir.
  const puedeVerLineas = can('lineas', 'ver');
  const { data: lineas, loading, error, reload } = useAsync(
    () => (puedeVerLineas ? api.lineas.list() : Promise.resolve([] as Linea[])),
    [puedeVerLineas],
  );
  const { status } = useCatalogos();

  const stats = useMemo(() => {
    const all = lineas ?? [];

    const statusBreakdown = status.map(s => ({
      label: s.nombre,
      count: all.filter(l => l.statusDesarrolloId === s.id).length,
      variant: statusVariant(s.nombre),
    }));
    const sinStatus = all.filter(l => l.statusDesarrolloId == null).length;
    if (sinStatus > 0) statusBreakdown.push({ label: 'Sin status', count: sinStatus, variant: 'neutral' });

    const porCliente = new Map<number, { nombre: string; lineas: number }>();
    for (const l of all) {
      const entry = porCliente.get(l.clienteId) ?? { nombre: l.clienteNombre, lineas: 0 };
      entry.lineas += 1;
      porCliente.set(l.clienteId, entry);
    }
    const topClients = [...porCliente.values()].sort((a, b) => b.lineas - a.lineas).slice(0, 5);

    const recent = [...all]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    return {
      total: all.length,
      produccion: countByStatusName(all, 'produccion'),
      desarrollo: countByStatusName(all, 'en desarrollo'),
      clientesActivos: porCliente.size,
      statusBreakdown,
      topClients,
      recent,
    };
  }, [lineas, status]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A202C]">Dashboard</h1>
        <p className="text-sm text-[#64748B] mt-0.5">Resumen del inventario de líneas</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}
      {!puedeVerLineas && (
        <EmptyState title="Sin datos para mostrar" description="El resumen se calcula con las líneas del inventario y tu cuenta no tiene acceso a ellas." />
      )}
      {puedeVerLineas && (loading && !lineas ? <LoadingBlock /> : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total de líneas" value={stats.total} sub="Registros en el inventario" />
            <StatCard label="En producción" value={stats.produccion} sub="Líneas operativas" accent="text-[#16A34A]" />
            <StatCard label="En desarrollo" value={stats.desarrollo} sub="En configuración" accent="text-[#D97706]" />
            <StatCard label="Clientes activos" value={stats.clientesActivos} sub="Con al menos 1 línea" accent="text-[#3A7BC8]" />
          </div>

          {/* Main content */}
          <div className="grid grid-cols-3 gap-4">
            {/* Breakdown + Clients */}
            <div className="space-y-4">
              {/* Status breakdown */}
              <Card>
                <CardHeader title="Líneas por status" />
                <div className="p-5 space-y-3">
                  {stats.statusBreakdown.length === 0 && <p className="text-xs text-[#94A3B8]">Sin datos</p>}
                  {stats.statusBreakdown.map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-medium ${variantColors[s.variant].text}`}>{s.label}</span>
                        <span className="text-xs font-bold text-[#1A202C]">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${variantColors[s.variant].bg} rounded-full transition-all`}
                          style={{ width: `${stats.total ? (s.count / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Top clients */}
              <Card>
                <CardHeader title="Top clientes" />
                <div className="divide-y divide-[#F1F5F9]">
                  {stats.topClients.length === 0 && <p className="px-5 py-4 text-xs text-[#94A3B8]">Sin datos</p>}
                  {stats.topClients.map((c, i) => (
                    <div key={c.nombre} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#94A3B8] w-4">{i + 1}</span>
                        <span className="text-sm text-[#374151]">{c.nombre}</span>
                      </div>
                      <Badge variant="primary">{c.lineas} {c.lineas === 1 ? 'línea' : 'líneas'}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Recent Lines Table */}
            <div className="col-span-2">
              <Card className="h-full">
                <CardHeader title="Últimas líneas modificadas" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0]">
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Línea</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Cliente</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Status</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Módulos</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Modificado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {stats.recent.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-10 text-sm text-[#94A3B8]">Aún no hay líneas registradas</td></tr>
                      )}
                      {stats.recent.map(line => (
                        <tr key={line.id} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="px-5 py-3"><LineaLabel linea={line} /></td>
                          <td className="px-4 py-3 text-sm text-[#374151]">{line.clienteNombre}</td>
                          <td className="px-4 py-3"><StatusBadge status={line.statusDesarrolloNombre} /></td>
                          <td className="px-4 py-3"><ModulosBadges linea={line} /></td>
                          <td className="px-4 py-3 text-xs text-[#94A3B8]">{formatRelative(line.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </>
      ))}
    </div>
  );
}

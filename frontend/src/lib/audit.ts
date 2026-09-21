import { useCallback } from 'react';
import { useCatalogos } from '../context/CatalogosContext';

/** Nombres de tabla que registra el backend en auditoría → etiqueta para la UI. */
export const TABLA_LABELS: Record<string, string> = {
  lineas: 'Líneas',
  linea_connectly_config: 'Connectly',
  linea_smart_config: 'Smart',
  clientes: 'Clientes',
  empleados: 'Empleados',
  usuarios_sistema: 'Usuarios',
  status_desarrollo: 'Catálogo: Status',
  tipo_activacion: 'Catálogo: Tipo de activación',
  bsp: 'Catálogo: BSP',
  tenencia_sim_card: 'Catálogo: Tenencia SIM',
  app_channel: 'Catálogo: App Channel',
};

export const tablaLabel = (tabla: string) => TABLA_LABELS[tabla] ?? tabla;

/**
 * Devuelve una función que traduce el valor crudo de un campo auditado a algo legible:
 * los `*_id` se resuelven contra los catálogos y los booleanos ("True"/"False") a Sí/No.
 */
export function useAuditValue() {
  const c = useCatalogos();

  return useCallback((campo: string, valor: string | null): string => {
    if (valor == null || valor === '') return '—';

    const catalogo: Record<string, { id: number; nombre: string }[]> = {
      cliente_id: c.clientes,
      status_desarrollo_id: c.status,
      coordinador_id: c.empleados,
      programador_id: c.empleados,
      tenencia_sim_card_id: c.tenencias,
      tipo_activacion_id: c.tiposActivacion,
      bsp_id: c.bsps,
      app_channel_id: c.appChannels,
    };

    const items = catalogo[campo];
    if (items) return items.find(i => String(i.id) === valor)?.nombre ?? `#${valor}`;

    if (valor === 'True') return 'Sí';
    if (valor === 'False') return 'No';
    if (campo === 'fecha_verificacion') return valor.slice(0, 10);
    return valor;
  }, [c]);
}

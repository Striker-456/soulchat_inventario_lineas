import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, errorMessage, type CatalogoItem, type EmpleadoCatalogo } from '../api';

interface CatalogosData {
  clientes: CatalogoItem[];
  empleados: EmpleadoCatalogo[];
  status: CatalogoItem[];
  tiposActivacion: CatalogoItem[];
  bsps: CatalogoItem[];
  tenencias: CatalogoItem[];
  appChannels: CatalogoItem[];
}

const EMPTY: CatalogosData = {
  clientes: [],
  empleados: [],
  status: [],
  tiposActivacion: [],
  bsps: [],
  tenencias: [],
  appChannels: [],
};

interface CatalogosState extends CatalogosData {
  loading: boolean;
  error: string | null;
  /** Vuelve a pedir todos los catálogos (p. ej. tras crear o editar un empleado). */
  reload: () => Promise<void>;
}

const CatalogosContext = createContext<CatalogosState | null>(null);

/** Carga una sola vez los catálogos que usan los formularios y filtros de todas las pantallas. */
export function CatalogosProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CatalogosData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientes, empleados, status, tiposActivacion, bsps, tenencias, appChannels] = await Promise.all([
        api.catalogos.clientes(),
        api.catalogos.empleados(),
        api.catalogos.statusDesarrollo(),
        api.catalogos.tipoActivacion(),
        api.catalogos.bsp(),
        api.catalogos.tenenciaSim(),
        api.catalogos.appChannel(),
      ]);
      setData({ clientes, empleados, status, tiposActivacion, bsps, tenencias, appChannels });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(() => ({ ...data, loading, error, reload }), [data, loading, error, reload]);

  return <CatalogosContext.Provider value={value}>{children}</CatalogosContext.Provider>;
}

export function useCatalogos(): CatalogosState {
  const ctx = useContext(CatalogosContext);
  if (!ctx) throw new Error('useCatalogos debe usarse dentro de <CatalogosProvider>.');
  return ctx;
}

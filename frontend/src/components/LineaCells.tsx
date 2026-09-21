import type { Linea } from '../api';
import { Badge } from './ui';

/** Identificación de una línea: su número (o #id si es una línea antigua sin número) y la descripción de uso. */
export function LineaLabel({ linea }: { linea: Pick<Linea, 'id' | 'numero' | 'descripcionUso'> }) {
  return (
    <div className="min-w-0">
      <span className="font-mono text-xs font-medium text-[#1A202C]">{linea.numero ?? `#${linea.id}`}</span>
      {linea.descripcionUso && (
        <div className="text-xs text-[#94A3B8] truncate max-w-[16rem]" title={linea.descripcionUso}>
          {linea.descripcionUso}
        </div>
      )}
    </div>
  );
}

/** Texto corto para mensajes: "+52 55 1234 5678" o "#12". */
export const lineaTexto = (linea: Pick<Linea, 'id' | 'numero'>) => linea.numero ?? `#${linea.id}`;

export function ModulosBadges({ linea }: { linea: Pick<Linea, 'tieneConnectly' | 'tieneSmart'> }) {
  return (
    <div className="flex gap-1">
      {linea.tieneConnectly && <Badge variant="secondary">Connectly</Badge>}
      {linea.tieneSmart && <Badge variant="primary">Smart</Badge>}
      {!linea.tieneConnectly && !linea.tieneSmart && <span className="text-xs text-[#94A3B8]">—</span>}
    </div>
  );
}

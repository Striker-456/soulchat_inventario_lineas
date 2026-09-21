import React from 'react';
import logoUrl from '../assets/soulchat-logo.png';
import { useAuth } from '../auth/AuthContext';

export type Page = 'dashboard' | 'lineas' | 'clientes' | 'empleados' | 'catalogos' | 'auditoria' | 'usuarios' | 'logs' | 'configuracion';

// `modulo`: el ítem se muestra si el usuario tiene la acción "ver" sobre ese módulo.
const navItems: { id: Page; label: string; icon: React.ReactNode; modulo?: string; adminOnly?: boolean }[] = [
  {
    id: 'dashboard',
    modulo: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'lineas',
    modulo: 'lineas',
    label: 'Líneas',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
  {
    id: 'clientes',
    modulo: 'clientes',
    label: 'Clientes',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 'empleados',
    modulo: 'empleados',
    label: 'Empleados',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'catalogos',
    modulo: 'catalogos',
    label: 'Catálogos',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'auditoria',
    modulo: 'auditoria',
    label: 'Auditoría',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    adminOnly: true,
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'logs',
    modulo: 'logs',
    label: 'Logs',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

type CanFn = (modulo: string, accion: string) => boolean;

/** ¿Puede el usuario abrir esta pantalla? Configuración es para todos; Usuarios solo para Admin. */
export function pageAllowed(page: Page, can: CanFn, isAdmin: boolean): boolean {
  if (page === 'configuracion') return true;
  const item = navItems.find(i => i.id === page);
  if (!item) return false;
  if (item.adminOnly) return isAdmin;
  return item.modulo ? can(item.modulo, 'ver') : true;
}

/** Primera pantalla a la que el usuario tiene acceso (para abrir la app). */
export function firstAllowedPage(can: CanFn, isAdmin: boolean): Page {
  return navItems.find(i => pageAllowed(i.id, can, isAdmin))?.id ?? 'configuracion';
}

export default function Sidebar({ current, onNavigate }: { current: Page; onNavigate: (p: Page) => void }) {
  const { session, isAdmin, can } = useAuth();
  const email = session?.email ?? '';
  // Cuentas antiguas sin nombre muestran su correo hasta que lo completen en Configuración.
  const displayName = session?.nombre?.trim() || email;
  const visibleItems = navItems.filter(item => pageAllowed(item.id, can, isAdmin));

  return (
    <aside className="w-56 flex-shrink-0 h-screen flex flex-col border-r border-[#E2E8F0] bg-white fixed left-0 top-0 z-20">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <img src={logoUrl} alt="SoulChat" className="h-8 w-auto" />
          <div>
            <div className="text-sm font-bold text-[#1A202C] leading-none">SoulChat</div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5 leading-none">Inventario Líneas</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-3 space-y-0.5">
          {visibleItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                current === item.id
                  ? 'bg-[#e8f7f9] text-[#3FB6C4]'
                  : 'text-[#64748B] hover:bg-[#F8F9FA] hover:text-[#1A202C]'
              }`}
            >
              <span className={current === item.id ? 'text-[#3FB6C4]' : 'text-[#94A3B8]'}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="mx-3 my-3 border-t border-[#E2E8F0]" />

        <div className="px-3 space-y-0.5">
          <button
            onClick={() => onNavigate('configuracion')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
              current === 'configuracion' ? 'bg-[#e8f7f9] text-[#3FB6C4]' : 'text-[#64748B] hover:bg-[#F8F9FA] hover:text-[#1A202C]'
            }`}
          >
            <span className={`${current === 'configuracion' ? 'text-[#3FB6C4]' : 'text-[#94A3B8]'}`}>
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            Configuración
          </button>
        </div>
      </nav>

      {/* User */}
      <div className="px-4 py-3 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3FB6C4] to-[#3A7BC8] flex items-center justify-center text-white text-xs font-semibold uppercase">{displayName.charAt(0)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[#1A202C] truncate" title={email}>{displayName}</div>
            <div className="text-[10px] text-[#94A3B8] truncate">{session?.rol}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

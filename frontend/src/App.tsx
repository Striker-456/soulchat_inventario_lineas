import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { CatalogosProvider } from './context/CatalogosContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar, { firstAllowedPage, pageAllowed, type Page } from './components/Sidebar';
import { EmptyState } from './components/ui';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LineasPage from './pages/LineasPage';
import LineaDetailPage, { type LineaDetailOptions } from './pages/LineaDetailPage';
import CatalogosPage from './pages/CatalogosPage';
import AuditoriaPage from './pages/AuditoriaPage';
import UsuariosPage from './pages/UsuariosPage';
import ClientesPage from './pages/ClientesPage';
import EmpleadosPage from './pages/EmpleadosPage';
import LogsPage from './pages/LogsPage';
import ConfiguracionPage from './pages/ConfiguracionPage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Root />
      </ToastProvider>
    </AuthProvider>
  );
}

function Root() {
  const { session } = useAuth();

  if (!session) return <LoginPage />;

  return (
    <CatalogosProvider>
      <Shell />
    </CatalogosProvider>
  );
}

function Shell() {
  const { isAdmin, can } = useAuth();
  const [page, setPage] = useState<Page>(() => firstAllowedPage(can, isAdmin));
  const [detail, setDetail] = useState<{ id: number; options?: LineaDetailOptions } | null>(null);

  const allowed = pageAllowed(page, can, isAdmin);

  // Si el administrador te quita el acceso a la pantalla actual, pasa a la primera que sí tengas.
  useEffect(() => {
    if (!allowed) {
      setDetail(null);
      setPage(firstAllowedPage(can, isAdmin));
    }
  }, [allowed, can, isAdmin]);

  const handleNavigate = (p: Page) => {
    setPage(p);
    setDetail(null);
  };

  const renderPage = () => {
    if (!allowed) {
      return <EmptyState title="Sin acceso" description="Tu cuenta no tiene permiso para ver esta sección. Pídele al administrador que lo habilite." />;
    }
    if (page === 'lineas' && detail !== null) {
      return <LineaDetailPage key={detail.id} lineaId={detail.id} options={detail.options} onBack={() => setDetail(null)} />;
    }
    switch (page) {
      case 'dashboard': return <DashboardPage />;
      case 'lineas': return <LineasPage onViewDetalle={(id, options) => setDetail({ id, options })} />;
      case 'clientes': return <ClientesPage />;
      case 'empleados': return <EmpleadosPage />;
      case 'catalogos': return <CatalogosPage />;
      case 'auditoria': return <AuditoriaPage />;
      case 'usuarios': return <UsuariosPage />;
      case 'logs': return <LogsPage />;
      case 'configuracion': return <ConfiguracionPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar current={page} onNavigate={handleNavigate} />
      <main className="flex-1 ml-56 p-6 min-h-screen overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}

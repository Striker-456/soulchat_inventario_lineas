import { useState } from 'react';
import logoUrl from '../assets/soulchat-logo.png';
// Fondo_login.png sin la trama de puntos del fondo (pesa ~240 KB en vez de 1,6 MB). Si se cambia la imagen original,
// hay que volver a limpiarla y regenerar este archivo.
import fondoLoginUrl from '../assets/fondo-login-limpio.jpg';
import { Button, ErrorBanner, Spinner } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../api';

// Opacidad de la imagen de izquierda a derecha: completa hasta ~74% y luego baja de forma gradual hasta 0.
const FADE_MASK =
  'linear-gradient(to right, #000 0%, #000 74%, rgba(0,0,0,0.9) 80%, rgba(0,0,0,0.65) 86%, rgba(0,0,0,0.35) 92%, rgba(0,0,0,0.12) 97%, transparent 100%)';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F8F9FA] via-white to-[#e8f7f9]">
      {/* Imagen de marca a la izquierda. La máscara la vuelve transparente hacia la derecha, así se funde con el
          fondo del login (sin corte). Empieza a desvanecerse después del final de "Soulchat". Se oculta en pantallas pequeñas. */}
      <div
        className="hidden lg:block absolute inset-y-0 left-0 w-[72%]"
        style={{ WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK }}
      >
        <img
          src={fondoLoginUrl}
          alt="Soulchat · Inventario de líneas WhatsApp"
          draggable={false}
          className="w-full h-full object-cover select-none"
          style={{ objectPosition: '60% center' }}
        />
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#3FB6C4]/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#3A7BC8]/8 blur-3xl" />
      </div>

      {/* Formulario */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 lg:w-[40%] lg:ml-auto">
        <div className="relative w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl shadow-black/5 p-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <img src={logoUrl} alt="SoulChat" className="h-14 w-auto mb-3" />
              <h1 className="text-xl font-bold text-[#1A202C]">SoulChat</h1>
              <p className="text-sm text-[#64748B] mt-0.5">Inventario Líneas</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <ErrorBanner message={error} />}

              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-xs font-medium text-[#374151]">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@soulchat.mx"
                  required
                  className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#1A202C] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3FB6C4] focus:border-transparent transition"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-xs font-medium text-[#374151]">Contraseña</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#1A202C] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3FB6C4] focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full py-2.5 mt-2" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Spinner />
                    Ingresando...
                  </span>
                ) : 'Ingresar'}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-[#94A3B8] mt-5">
            © {new Date().getFullYear()} SoulChat · By <a  href="https://www.linkedin.com/in/héctor-velásquez-b43581409/" target="_blank" rel="noopener noreferrer" className="text-[#3FB6C4] hover:underline">Héctor  Velásquez</a>
          </p>
        </div>
      </div>
    </div>
  );
}

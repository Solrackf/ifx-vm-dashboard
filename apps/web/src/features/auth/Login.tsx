import { useState, type FormEvent } from 'react';
import { ArrowRight, ChevronDown, Server, ShieldCheck, X } from 'lucide-react';

export default function Login({
  onLogin,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('admin@ifx.test');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await onLogin(email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos iniciar sesión.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="login-shell">
      <div className="login-visual">
        <div className="login-brand">
          <div className="brand-mark">I</div>
          <div className="brand-word">
            IFX<span> CLOUD</span>
          </div>
        </div>
        <div className="login-visual-content">
          <div className="login-overline">
            <span /> CLOUD INFRASTRUCTURE
          </div>
          <h1>
            Control total.
            <br />
            <em>Claridad absoluta.</em>
          </h1>
          <p>La infraestructura que impulsa tu negocio, en una sola vista.</p>
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="visual-core">
            <div className="core-glow" />
            <Server size={29} strokeWidth={1.15} />
          </div>
          <div className="visual-caption">
            <span className="live-dot" />
            SISTEMAS OPERATIVOS <i /> TODO EN ORDEN
          </div>
        </div>
        <div className="login-visual-foot">
          <span>IFX NETWORKS</span>
          <span>INFRASTRUCTURE, REFINED</span>
        </div>
      </div>
      <div className="login-main">
        <div className="login-main-top">
          <span>
            CONSOLE <span className="login-slash">/</span> ACCESS
          </span>
          <span className="login-secure">
            <ShieldCheck size={14} /> ACCESO SEGURO
          </span>
        </div>
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <div className="brand-mark">I</div>
            <div className="brand-word">
              IFX<span> CLOUD</span>
            </div>
          </div>
          <div className="login-eyebrow">BIENVENIDO</div>
          <h2>Inicia sesión</h2>
          <p className="login-intro">Accede a tu espacio de infraestructura.</p>
          <form onSubmit={submit} className="login-form">
            <label className="form-field">
              <span>Correo electrónico</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nombre@empresa.com"
                required
              />
            </label>
            <label className="form-field">
              <span>Contraseña</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error && (
              <div className="login-error">
                <X size={15} />
                {error}
              </div>
            )}
            <div className="login-options">
              <span className="session-hint">
                <ShieldCheck size={13} /> Sesión protegida por 8 horas
              </span>
              <button
                type="button"
                onClick={() =>
                  setError('Solicita el restablecimiento de contraseña a tu administrador.')
                }
              >
                ¿Necesitas ayuda?
              </button>
            </div>
            <button className="primary-button login-submit" disabled={pending}>
              {pending ? (
                'Verificando acceso…'
              ) : (
                <>
                  Acceder a la consola <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <div className="login-access-note">
            <ShieldCheck size={16} />
            <span>Tu sesión usa una cookie HttpOnly y no expone el token al navegador.</span>
          </div>
          <div className="login-credentials">
            <div className="credentials-head">
              <span>ACCESO RÁPIDO DE DEMOSTRACIÓN</span>
              <ChevronDown size={14} />
            </div>
            <button
              onClick={() => {
                setEmail('admin@ifx.test');
                setPassword('Admin123!');
              }}
            >
              <span className="credential-dot admin-dot" />
              <span>Administrador</span>
              <small>admin@ifx.test</small>
            </button>
            <button
              onClick={() => {
                setEmail('client@ifx.test');
                setPassword('Client123!');
              }}
            >
              <span className="credential-dot client-dot" />
              <span>Cliente</span>
              <small>client@ifx.test</small>
            </button>
          </div>
        </div>
        <div className="login-footer">
          <span>© IFX Networks 2026</span>
          <span>
            Privacidad <i>·</i> Seguridad <i>·</i> Soporte
          </span>
        </div>
      </div>
    </div>
  );
}

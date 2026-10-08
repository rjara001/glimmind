import { useNavigate } from 'react-router-dom';
import './landing.css';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const onStart = () => navigate('/login');
  const onUpgrade = () => navigate('/login');
  const onDemo = () => document.querySelector('.landing-screenshot-wrap')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="landing-root">
      <div className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-tag">Sistema de 4 ciclos</div>
          <h1>Mientras Duolingo te da puntos, <em>Glimmind te hace recordar</em>.</h1>
          <p className="landing-sub">
            Sistema de 4 ciclos · Validación difusa · Voz. Aprende el vocabulario que realmente necesitas.
          </p>
          <div className="landing-buttons">
            <button className="landing-btn landing-btn-primary" onClick={onStart}>Empezar gratis</button>
            <button className="landing-btn landing-btn-secondary" onClick={onDemo}>Ver demo</button>
          </div>
        </div>
      </div>

      <div className="landing-screenshot-wrap">
        <div className="landing-screenshot">
          <div className="landing-game-header">
            <span className="landing-deck-name">Inglés Básico</span>
            <div className="landing-stats">
              <span>12 correctas</span>
              <span>47%</span>
            </div>
          </div>
          <div className="landing-question">
            <div className="landing-term">I've never really understood why people</div>
            <div className="landing-hint">c*** m****** a* s****</div>
          </div>
          <div className="landing-input-row">
            <input type="text" placeholder="Escribe tu respuesta..." />
            <button className="landing-btn-validate">VALIDAR</button>
          </div>
        </div>
      </div>

      <div className="landing-section">
        <div className="landing-section-head">
          <div className="landing-section-num">01</div>
          <h2>Cómo se mueve una palabra</h2>
        </div>
        <p className="landing-section-lead">
          Cuando fallas, la palabra no desaparece. Entra a un ciclo. Y después a otro. Hasta que se queda.
        </p>
        <div className="landing-flow">
          <div className="landing-flow-step landing-nueva">
            <div className="landing-step-num">STAGE 01</div>
            <div className="landing-step-name">NUEVA</div>
            <div className="landing-step-desc">Primera vez que la ves. Si aciertas, queda aprendida.</div>
          </div>
          <div className="landing-flow-step landing-vista">
            <div className="landing-step-num">STAGE 02</div>
            <div className="landing-step-name">VISTA</div>
            <div className="landing-step-desc">Fallaste. Otra oportunidad. Si aciertas, se queda aquí.</div>
          </div>
          <div className="landing-flow-step landing-reconocida">
            <div className="landing-step-num">STAGE 03</div>
            <div className="landing-step-name">RECONOCIDA</div>
            <div className="landing-step-desc">Fallaste de nuevo. Ya debería sonar. Si aciertas, se queda aquí.</div>
          </div>
          <div className="landing-flow-step landing-frecuente">
            <div className="landing-step-num">STAGE 04</div>
            <div className="landing-step-name">FRECUENTE</div>
            <div className="landing-step-desc">La palabra que se resiste. No hay castigo, solo repetición.</div>
          </div>
        </div>
      </div>

      <div className="landing-section">
        <div className="landing-section-head">
          <div className="landing-section-num">02</div>
          <h2>Validación difusa</h2>
        </div>
        <p className="landing-section-lead">
          Si el 80% de los caracteres coincide, cuenta como acierto.
        </p>
        <div className="landing-validation">
          <div className="landing-validation-row">
            <span className="landing-lbl">Tú</span>
            <span className="landing-word landing-word-wrong">dividens</span>
            <span className="landing-score">—</span>
          </div>
          <div className="landing-validation-row">
            <span className="landing-lbl">Sistema</span>
            <span className="landing-word landing-word-right">dividends</span>
            <span className="landing-score">93%</span>
          </div>
          <div className="landing-validation-row">
            <span className="landing-lbl">Resultado</span>
            <span className="landing-word landing-word-right">Acierto</span>
            <span className="landing-score">≥ 80%</span>
          </div>
        </div>
      </div>

      <div className="landing-why">
        <div className="landing-kicker">Por qué Glimmind</div>
        <h2>Para quienes quieren recordar, no coleccionar puntos.</h2>
        <p className="landing-lead">
          No vas a aprender 5.000 palabras en una semana. Vas a aprender las que necesitas. Y vas a recordarlas.
        </p>

        <div className="landing-why-grid">
          <div className="landing-why-card">
            <div className="landing-icon landing-icon-blue">🔄</div>
            <h3>La palabra no desaparece</h3>
            <p>
              En otras apps fallas una vez y la palabra se va. Aquí <strong>entra a un ciclo</strong>.
              Y después a otro. <strong>Hasta que se queda</strong>. Sin intervalos arbitrarios.
            </p>
          </div>
          <div className="landing-why-card">
            <div className="landing-icon landing-icon-violet">🎮</div>
            <h3>Dos formas de practicar</h3>
            <p>
              <strong>Modo examen:</strong> escribes la respuesta y el sistema valida.
              <strong>Modo práctica:</strong> piensas, revelas y te autoevalúas.
              <em>Cambia cuando quieras.</em>
            </p>
          </div>
          <div className="landing-why-card">
            <div className="landing-icon landing-icon-emerald">✅</div>
            <h3>No te castigamos por un typo</h3>
            <p>
              Escribiste <strong>dividens</strong>, el sistema esperaba <strong>dividends</strong>.
              Coincidencia: <em>93%</em>. Cuenta como acierto. Recordar no es un examen de ortografía.
            </p>
          </div>
          <div className="landing-why-card">
            <div className="landing-icon landing-icon-rose">🎙️</div>
            <h3>Aprende hablando, no solo escribiendo</h3>
            <p>
              Practica <strong>manos libres</strong>. Di la respuesta en voz alta y el sistema la escucha.
              <strong>Funciona sin conexión</strong>. Comandos: revelar, pasar, parar.
            </p>
          </div>
          <div className="landing-why-card">
            <div className="landing-icon landing-icon-amber">📱</div>
            <h3>En tu navegador, tu tablet, tu teléfono</h3>
            <p>
              Web, iOS y Android. <strong>El mismo progreso en todos lados</strong>.
              <em>Funciona offline</em>. Si tienes cuenta, sincroniza.
            </p>
          </div>
          <div className="landing-why-card">
            <div className="landing-icon landing-icon-slate">🔒</div>
            <h3>Tus datos se quedan contigo</h3>
            <p>
              Todo <strong>vive en tu dispositivo</strong>. La nube es opcional.
              <em>Sin tracking, sin anuncios, sin vender tus datos.</em>
            </p>
          </div>
        </div>
      </div>

      <div className="landing-pricing">
        <div className="landing-kicker">Precios</div>
        <h2>Simple y honesto.</h2>
        <p className="landing-lead">
          Empieza gratis. Actualiza cuando lo necesites. Sin sorpresas.
        </p>

        <div className="landing-plans">
          <div className="landing-plan landing-plan-free">
            <div className="landing-plan-name">Free</div>
            <div className="landing-plan-price">
              <span className="landing-amount">€0</span>
              <span className="landing-period">/mes</span>
            </div>
            <p className="landing-plan-desc">Para empezar sin compromiso.</p>
            <ul className="landing-plan-features">
              <li><span className="landing-check">✓</span><span><strong>1.000 tarjetas</strong> activas</span></li>
              <li><span className="landing-check">✓</span><span><strong>Mazos ilimitados</strong></span></li>
              <li><span className="landing-check">✓</span><span>Modo examen y práctica</span></li>
              <li><span className="landing-check">✓</span><span>Estudio con voz (navegador)</span></li>
              <li><span className="landing-check">✓</span><span>Tus datos viven en tu dispositivo</span></li>
              <li><span className="landing-check">✓</span><span>Sincronización con Google</span></li>
              <li><span className="landing-check">✓</span><span>Importa desde CSV, texto o YouTube</span></li>
            </ul>
            <button className="landing-plan-cta landing-plan-cta-free" onClick={onStart}>Empezar gratis</button>
          </div>

          <div className="landing-plan landing-plan-premium">
            <div className="landing-plan-badge">Más elegido</div>
            <div className="landing-plan-name">Premium</div>
            <div className="landing-plan-price">
              <span className="landing-amount">€4,99</span>
              <span className="landing-period">/mes</span>
            </div>
            <p className="landing-plan-desc">Para quienes estudian en serio.</p>
            <ul className="landing-plan-features">
              <li><span className="landing-check">✓</span><span><strong>5.000 tarjetas</strong> activas</span></li>
              <li><span className="landing-check">✓</span><span><strong>Todo lo de Free</strong></span></li>
              <li><span className="landing-check">✓</span><span>Sincronización prioritaria</span></li>
              <li><span className="landing-check">✓</span><span><strong>Voces HD</strong> (Chirp 3)</span></li>
              <li><span className="landing-check">✓</span><span>Estadísticas avanzadas</span></li>
              <li><span className="landing-check">✓</span><span>Exporta todos tus datos</span></li>
              <li><span className="landing-check">✓</span><span>Soporte prioritario</span></li>
            </ul>
            <button className="landing-plan-cta landing-plan-cta-premium" onClick={onUpgrade}>Probar Premium</button>
          </div>
        </div>

        <div className="landing-pricing-note">
          <span className="landing-dot"></span>
          <span>Sin anuncios. Sin tracking. Sin vender tus datos.</span>
        </div>
      </div>

      <div className="landing-closing">
        <h2>¿Listo para recordar de verdad?</h2>
        <p>Crea tu primer mazo gratis. Toma menos de un minuto.</p>
        <button className="landing-btn landing-btn-primary" onClick={onStart}>Crear mi primer mazo →</button>
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-top">
          <div className="landing-footer-brand">
            <div className="landing-logo">
              <div className="landing-logo-icon">G</div>
              <span className="landing-logo-text">Glimmind</span>
            </div>
            <p>
              Flashcards con repetición espaciada para aprender idiomas.
              Construido con React, Firebase y ciencia.
            </p>
            <div className="landing-footer-social">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">GH</a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">X</a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" aria-label="Discord">DC</a>
            </div>
          </div>
          <div className="landing-footer-col">
            <h4>Producto</h4>
            <ul>
              <li><a href="/login">Dashboard</a></li>
              <li><a href="/login">Precios</a></li>
              <li><a href="/privacy">Novedades</a></li>
              <li><a href="/terms">Roadmap</a></li>
            </ul>
          </div>
          <div className="landing-footer-col">
            <h4>Recursos</h4>
            <ul>
              <li><a href="/privacy">Documentación</a></li>
              <li><a href="/terms">Guías</a></li>
              <li><a href="/cookies">Estado del servicio</a></li>
              <li><a href="/privacy">Contacto</a></li>
            </ul>
          </div>
          <div className="landing-footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="/privacy">Privacidad</a></li>
              <li><a href="/terms">Términos</a></li>
              <li><a href="/cookies">Cookies</a></li>
              <li><a href="/privacy">GDPR</a></li>
            </ul>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <div className="landing-footer-bottom-inner">
            <div className="landing-copyright">
              © 2026 Glimmind. Todos los derechos reservados.
            </div>
            <div className="landing-legal">
              <a href="/privacy">Privacidad</a>
              <a href="/terms">Términos</a>
              <a href="/cookies">Cookies</a>
            </div>
            <div className="landing-status">
              <span className="landing-dot"></span>
              <span>Todos los sistemas operativos</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
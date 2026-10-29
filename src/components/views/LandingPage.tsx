import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './landing.css';
import { LandingDemo } from './LandingDemo';
import { LandingValidationAnalysis } from './LandingValidationAnalysis';
import { PREMIUM_LANDING_NEXT_PATH, PREMIUM_LANDING_NEXT_QUERY } from '../../constants/premium';
import { CYCLE_RULE_CHIPS } from '../../utils/cycle-rules';
import { LandingLanguageSelector } from './LandingLanguageSelector';

export const LandingPage: React.FC = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const onStart = () => navigate('/login');
  // Stripe checkout requires a valid ID token, and this page only renders for
  // signed-out visitors (App.tsx redirects authenticated users to /dashboard).
  // So the button routes through login, which forwards to SettingsView where
  // the real checkout is triggered.
  const onUpgrade = () => navigate(`/login?${PREMIUM_LANDING_NEXT_QUERY}=${PREMIUM_LANDING_NEXT_PATH}`);
  const onDemo = () => document.querySelector('.landing-screenshot-wrap')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="landing-root">
      <LandingLanguageSelector />
      <div className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-tag">{t('hero_tag')}</div>
          <h1>{t('hero_title_1')} <em>{t('hero_title_2')}</em>{t('hero_title_3')}</h1>
          <p className="landing-sub">
            {t('hero_sub')}
          </p>
          <div className="landing-buttons">
            <button className="landing-btn landing-btn-primary" onClick={onStart}>{t('btn_start')}</button>
            <button className="landing-btn landing-btn-secondary" onClick={onDemo}>{t('btn_demo')}</button>
          </div>
        </div>
      </div>

      <LandingDemo />

      <div className="landing-section">
        <div className="landing-section-head">
          <div className="landing-section-num">01</div>
          <h2>{t('section_title')}</h2>
        </div>
        <p className="landing-section-lead">
          {t('section_lead')}
        </p>
        <div className="landing-flow-wrap">
          <div className="landing-flow-arrows" aria-hidden="true">
            <svg
              viewBox="0 0 900 110"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              focusable="false"
            >
              <defs>
                <linearGradient id="landing-arc-1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="landing-arc-2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <linearGradient id="landing-arc-3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <path
                d="M 108 88 Q 222 16 336 88"
                fill="none"
                stroke="url(#landing-arc-1)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="9 9"
                opacity="0.9"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M 336 88 Q 450 16 564 88"
                fill="none"
                stroke="url(#landing-arc-2)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="9 9"
                opacity="0.9"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M 564 88 Q 678 16 792 88"
                fill="none"
                stroke="url(#landing-arc-3)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="9 9"
                opacity="0.9"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          <div className="landing-flow">
            <div className="landing-flow-step landing-nueva">
              <div className="landing-step-num">{t('stage_label_1')}</div>
              <div className="landing-step-name">{t('stage_new')}</div>
              <div className="landing-step-desc">{t('stage_new_desc')}</div>
            </div>
            <div className="landing-flow-step landing-vista">
              <div className="landing-step-num">{t('stage_label_2')}</div>
              <div className="landing-step-name">{t('stage_view')}</div>
              <div className="landing-step-desc">{t('stage_view_desc')}</div>
            </div>
            <div className="landing-flow-step landing-reconocida">
              <div className="landing-step-num">{t('stage_label_3')}</div>
              <div className="landing-step-name">{t('stage_recognized')}</div>
              <div className="landing-step-desc">{t('stage_recognized_desc')}</div>
            </div>
            <div className="landing-flow-step landing-frecuente">
              <div className="landing-step-num">{t('stage_label_4')}</div>
              <div className="landing-step-name">{t('stage_frequent')}</div>
              <div className="landing-step-desc">{t('stage_frequent_desc')}</div>
            </div>
          </div>
          <div className="landing-rule">
            <div className="landing-rule-title">{t('rule_title')}</div>
            <div className="landing-rule-chips">
              {CYCLE_RULE_CHIPS.map((chip) => (
                <span key={chip} className="landing-rule-chip">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="landing-section">
        <div className="landing-section-head">
          <div className="landing-section-num">02</div>
          <h2>{t('validation_title')}</h2>
        </div>
        <p className="landing-section-lead">
          {t('validation_lead')} <strong>{t('missed_where')}</strong>.
        </p>
        <LandingValidationAnalysis />
      </div>

      <div className="landing-why">
        <div className="landing-kicker">{t('why_title')}</div>
        <h2>{t('why_sub')}</h2>
        <p className="landing-lead">
          {t('why_desc')}
        </p>

        <div className="landing-why-grid">
          <div className="landing-why-card">
            <div className="landing-icon landing-icon-blue">🔄</div>
            <h3>{t('why_1_title')}</h3>
            <p>
              {t('why_1_p1')} <strong>{t('why_1_s1')}</strong>.
              {t('why_1_p2')} <strong>{t('why_1_s2')}</strong>.
              {t('why_1_p3')}
            </p>
          </div>
          <div className="landing-why-card">
            <div className="landing-icon landing-icon-violet">🎮</div>
            <h3>{t('why_2_title')}</h3>
            <p>
              <strong>{t('why_2_label_exam')}</strong> {t('why_2_exam')}
              <strong>{t('why_2_label_practice')}</strong> {t('why_2_practice')}
              <em>{t('why_2_note')}</em>
            </p>
          </div>
          <div className="landing-why-card">
            <div className="landing-icon landing-icon-emerald">✅</div>
            <h3>{t('why_3_title')}</h3>
            <p>
              {t('why_3_p1')} <strong>{t('why_3_word1')}</strong>, {t('why_3_p2')} <strong>{t('why_3_word2')}</strong>.
              <em>{t('why_3_match')}</em> {t('why_3_desc')}
            </p>
          </div>
          <div className="landing-why-card">
            <div className="landing-icon landing-icon-rose">🎙️</div>
            <h3>{t('why_4_title')}</h3>
            <p>
              {t('why_4_p1')} <strong>{t('why_4_s1')}</strong>.
              {t('why_4_p2')}
              <strong>{t('why_4_offline')}</strong>. {t('why_4_p3')}
            </p>
          </div>
          <div className="landing-why-card">
            <div className="landing-icon landing-icon-amber">📱</div>
            <h3>{t('why_5_title')}</h3>
            <p>
              {t('why_5_p1')} <strong>{t('why_5_s1')}</strong>. <em>{t('why_4_offline')}</em>.
              {t('why_5_sync')}
            </p>
          </div>
          <div className="landing-why-card">
            <div className="landing-icon landing-icon-slate">🔒</div>
            <h3>{t('why_6_title')}</h3>
            <p>
              {t('why_6_p1')} <strong>{t('why_6_s1')}</strong>.
              {t('why_6_p2')}
              <em>{t('why_6_note')}</em>
            </p>
          </div>
        </div>
      </div>

      <div className="landing-pricing">
        <div className="landing-kicker">{t('pricing_title')}</div>
        <h2>{t('pricing_sub')}</h2>
        <p className="landing-lead">
          {t('pricing_desc')}
        </p>

        <div className="landing-plans">
          <div className="landing-plan landing-plan-free">
            <div className="landing-plan-name">{t('plan_free')}</div>
            <div className="landing-plan-price">
              <span className="landing-amount">{t('price_free')}</span>
              <span className="landing-period">{t('price_free_period')}</span>
            </div>
            <p className="landing-plan-desc">{t('plan_free_desc')}</p>
            <ul className="landing-plan-features">
              <li><span className="landing-check">✓</span><span><strong>{t('feature_1000_cards')}</strong></span></li>
              <li><span className="landing-check">✓</span><span>{t('feature_unlimited_decks')}</span></li>
              <li><span className="landing-check">✓</span><span>{t('feature_modes')}</span></li>
              <li><span className="landing-check">✓</span><span>{t('feature_voice_browser')}</span></li>
              <li><span className="landing-check">✓</span><span>{t('feature_local_data')}</span></li>
              <li><span className="landing-check">✓</span><span>{t('feature_google_sync')}</span></li>
              <li><span className="landing-check">✓</span><span>{t('feature_import')}</span></li>
            </ul>
            <button className="landing-plan-cta landing-plan-cta-free" onClick={onStart}>{t('btn_start')}</button>
          </div>

          <div className="landing-plan landing-plan-premium">
            <div className="landing-plan-badge">{t('plan_popular')}</div>
            <div className="landing-plan-name">{t('plan_premium')}</div>
            <div className="landing-plan-price">
              <span className="landing-amount">{t('price_premium')}</span>
              <span className="landing-period">{t('price_premium_period')}</span>
            </div>
            <p className="landing-plan-desc">{t('plan_premium_desc')}</p>
            <ul className="landing-plan-features">
              <li><span className="landing-check">✓</span><span><strong>{t('feature_5000_cards')}</strong></span></li>
              <li><span className="landing-check">✓</span><span>{t('feature_all_free')}</span></li>
              <li><span className="landing-check">✓</span><span>{t('feature_priority_sync')}</span></li>
              <li><span className="landing-check">✓</span><span>{t('feature_hd_voices')}</span></li>
              <li><span className="landing-check">✓</span><span>{t('feature_advanced_stats')}</span></li>
              <li><span className="landing-check">✓</span><span>{t('feature_export_data')}</span></li>
              <li><span className="landing-check">✓</span><span>{t('feature_support')}</span></li>
            </ul>
            <button className="landing-plan-cta landing-plan-cta-premium" onClick={onUpgrade}>{t('btn_premium')}</button>
          </div>
        </div>

        <div className="landing-pricing-note">
          <span className="landing-dot"></span>
          <span>{t('no_ads_tracking')}</span>
        </div>
      </div>

      <div className="landing-closing">
        <h2>{t('closing_title')}</h2>
        <p>{t('closing_desc')}</p>
        <button className="landing-btn landing-btn-primary" onClick={onStart}>{t('btn_create_deck')}</button>
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-top">
          <div className="landing-footer-brand">
            <div className="landing-logo">
              <div className="landing-logo-icon">G</div>
              <span className="landing-logo-text">{t('appName')}</span>
            </div>
            <p>
              {t('footer_desc')}
            </p>
            <div className="landing-footer-social">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label={t('footer_github')}>GH</a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label={t('footer_twitter')}>X</a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" aria-label={t('footer_discord')}>DC</a>
            </div>
          </div>
          <div className="landing-footer-col">
            <h4>{t('footer_product')}</h4>
            <ul>
              <li><a href="/login">{t('footer_dashboard')}</a></li>
              <li><a href="/login">{t('footer_pricing')}</a></li>
              <li><a href="/privacy">{t('footer_news')}</a></li>
              <li><a href="/terms">{t('footer_roadmap')}</a></li>
            </ul>
          </div>
          <div className="landing-footer-col">
            <h4>{t('footer_resources')}</h4>
            <ul>
              <li><a href="/privacy">{t('footer_docs')}</a></li>
              <li><a href="/terms">{t('footer_guides')}</a></li>
              <li><a href="/cookies">{t('footer_status')}</a></li>
              <li><a href="/privacy">{t('footer_contact')}</a></li>
            </ul>
          </div>
          <div className="landing-footer-col">
            <h4>{t('footer_legal')}</h4>
            <ul>
              <li><a href="/privacy">{t('footer_privacy')}</a></li>
              <li><a href="/terms">{t('footer_terms')}</a></li>
              <li><a href="/cookies">{t('footer_cookies')}</a></li>
              <li><a href="/privacy">{t('footer_gdpr')}</a></li>
            </ul>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <div className="landing-footer-bottom-inner">
            <div className="landing-copyright">
              © 2026 {t('appName')}. {t('footer_rights')}
            </div>
            <div className="landing-legal">
              <a href="/privacy">{t('footer_privacy')}</a>
              <a href="/terms">{t('footer_terms')}</a>
              <a href="/privacy">Cookies</a>
            </div>
            <div className="landing-status">
              <span className="landing-dot"></span>
              <span>{t('footer_systems')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

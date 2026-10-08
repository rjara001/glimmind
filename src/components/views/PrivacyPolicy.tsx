import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPolicy: React.FC = () => (
  <div className="min-h-screen bg-slate-50">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-8">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Glimmind
      </Link>

      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Privacy Policy</h1>
      <p className="text-slate-500 mb-8">Last updated: October 2026</p>

      <div className="bg-white rounded-2xl border border-slate-100 p-8 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">1. Data We Collect</h2>
          <ul className="space-y-3 text-slate-600">
            <li><strong>Account data:</strong> Email, display name, profile photo (via Google OAuth)</li>
            <li><strong>Flashcard content:</strong> Terms, definitions, contexts you create or import</li>
            <li><strong>Game progress:</strong> Spaced repetition state, cycles, review history, statistics</li>
            <li><strong>Voice recordings:</strong> Optional audio recordings of your answers (only if enabled)</li>
            <li><strong>Usage analytics:</strong> Feature usage, error logs, performance metrics (no personal identifiers)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">2. How We Use Your Data</h2>
          <ul className="space-y-3 text-slate-600">
            <li>Provide core flashcard functionality (sync, spaced repetition, voice study)</li>
            <li>Improve the app through usage analytics</li>
            <li>Enforce quotas and prevent abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">3. Data Storage & Security</h2>
          <ul className="space-y-3 text-slate-600">
            <li><strong>Local-first:</strong> All data stored in your browser's localStorage by default</li>
            <li><strong>Optional cloud sync:</strong> Encrypted in transit (TLS) and at rest (Firebase)</li>
            <li><strong>Voice recordings:</strong> Stored in user-scoped Firebase Storage, auto-deleted</li>
            <li><strong>No third-party data sales:</strong> Your data is never sold</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">4. Third-Party Services</h2>
          <ul className="space-y-3 text-slate-600">
            <li><strong>Firebase (Google):</strong> Authentication, Firestore, Storage, Functions, Hosting</li>
            <li><strong>Google Cloud TTS/STT:</strong> Voice synthesis & recognition (Chirp 3 HD, browser fallback)</li>
            <li><strong>Vosk:</strong> Offline speech recognition (runs locally in browser)</li>
            <li><strong>DeepL:</strong> Translation service (optional, for card translation)</li>
          </ul>
          <p className="text-slate-600 mt-3">These processors only access data necessary to provide their specific service.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">5. Your Rights (GDPR)</h2>
          <ul className="space-y-3 text-slate-600">
            <li><strong>Access:</strong> Request a copy of your data via Settings → Export Data</li>
            <li><strong>Rectification:</strong> Edit any card or profile data directly in the app</li>
            <li><strong>Erasure:</strong> Delete your account in Settings → Delete Account (removes all data)</li>
            <li><strong>Portability:</strong> Export all data as JSON/CSV</li>
            <li><strong>Objection:</strong> Disable cloud sync or voice features anytime</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">6. Data Retention</h2>
          <ul className="space-y-3 text-slate-600">
            <li>Account & flashcard data: Until you delete your account</li>
            <li>Voice recordings: Auto-deleted after 30 days</li>
            <li>Analytics logs: 13 months (aggregated, non-personal)</li>
            <li>Error logs: 30 days</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">7. Children's Privacy</h2>
          <p className="text-slate-600">Glimmind is not directed at children under 13. We do not knowingly collect data from children under 13.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">8. Changes to This Policy</h2>
          <p className="text-slate-600">We may update this policy. Material changes will be notified via email or in-app notice.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">9. Contact</h2>
          <p className="text-slate-600">Questions? Email <a href="mailto:privacy@glimmind.com" className="text-indigo-600 hover:underline">privacy@glimmind.com</a></p>
        </section>
      </div>

      <div className="mt-8 text-center">
        <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">← Back to Glimmind</Link>
      </div>
    </div>
  </div>
);
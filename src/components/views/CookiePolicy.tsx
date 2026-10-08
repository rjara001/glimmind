import React from 'react';
import { Link } from 'react-router-dom';

export const CookiePolicy: React.FC = () => (
  <div className="min-h-screen bg-slate-50">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-8">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Glimmind
      </Link>

      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Cookie Policy</h1>
      <p className="text-slate-500 mb-8">Last updated: October 2026</p>

      <div className="bg-white rounded-2xl border border-slate-100 p-8 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">1. What Are Cookies</h2>
          <p className="text-slate-600">Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and improve your experience.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">2. Cookies We Use</h2>
          <p className="text-slate-600 mb-4">Glimmind uses only essential cookies. We do not use tracking, advertising, or analytics cookies.</p>
          
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 font-bold text-slate-900">Name</th>
                <th className="pb-3 font-bold text-slate-900">Purpose</th>
                <th className="pb-3 font-bold text-slate-900">Duration</th>
                <th className="pb-3 font-bold text-slate-900">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 font-mono text-slate-700">firebaseAuthToken</td>
                <td className="py-3 text-slate-600">Stores Firebase authentication token for session persistence</td>
                <td className="py-3 text-slate-600">Session / 1 hour (refreshed)</td>
                <td className="py-3 text-slate-600">Essential</td>
              </tr>
              <tr>
                <td className="py-3 font-mono text-slate-700">glimmind_*</td>
                <td className="py-3 text-slate-600">localStorage keys for flashcards, settings, progress (not cookies)</td>
                <td className="py-3 text-slate-600">Persistent (until cleared)</td>
                <td className="py-3 text-slate-600">Local storage</td>
              </tr>
              <tr>
                <td className="py-3 font-mono text-slate-700">__session</td>
                <td className="py-3 text-slate-600">Firebase Auth session cookie (HttpOnly, Secure)</td>
                <td className="py-3 text-slate-600">Session</td>
                <td className="py-3 text-slate-600">Essential</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">3. Local Storage (Not Cookies)</h2>
          <p className="text-slate-600 mb-4">Glimmind is local-first. Most data lives in your browser's localStorage, not cookies:</p>
          <ul className="space-y-2 text-slate-600 list-disc list-inside">
            <li>Flashcards, decks, and spaced repetition state</li>
            <li>User preferences (theme, voice settings, game mode)</li>
            <li>Game progress, statistics, review history</li>
            <li>Offline queue for cloud sync</li>
          </ul>
          <p className="text-slate-600 mt-4">You can clear all local data anytime in Settings → Clear Local Data.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">4. Third-Party Cookies</h2>
          <p className="text-slate-600 mb-4">We do not set third-party cookies. However, these services may set their own when you interact with them:</p>
          <ul className="space-y-2 text-slate-600 list-disc list-inside">
            <li><strong>Google Firebase Auth:</strong> Sets authentication cookies for Google OAuth</li>
            <li><strong>Stripe (Premium only):</strong> Sets cookies during checkout for fraud prevention</li>
            <li><strong>Google Cloud TTS/STT:</strong> No cookies; API calls authenticated via backend</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">5. Managing Cookies</h2>
          <p className="text-slate-600">You can control cookies via your browser settings:</p>
          <ul className="space-y-2 text-slate-600 list-disc list-inside mt-3">
            <li>Block all cookies (may break login/sync)</li>
            <li>Clear cookies on exit</li>
            <li>Allow only essential cookies</li>
          </ul>
          <p className="text-slate-600 mt-4">Note: Blocking Firebase auth cookies will prevent cloud sync and require re-login each session.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">6. Consent</h2>
          <p className="text-slate-600">By using Glimmind with cookies enabled in your browser, you consent to the essential cookies described above. We do not require opt-in for non-essential cookies because we don't use them.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">7. Changes</h2>
          <p className="text-slate-600">We may update this policy. Changes posted here with updated date.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">8. Contact</h2>
          <p className="text-slate-600">Questions? Email <a href="mailto:privacy@glimmind.com" className="text-indigo-600 hover:underline">privacy@glimmind.com</a></p>
        </section>
      </div>

      <div className="mt-8 text-center">
        <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">← Back to Glimmind</Link>
      </div>
    </div>
  </div>
);
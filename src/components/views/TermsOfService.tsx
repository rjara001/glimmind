import React from 'react';
import { Link } from 'react-router-dom';

export const TermsOfService: React.FC = () => (
  <div className="min-h-screen bg-slate-50">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-8">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Glimmind
      </Link>

      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Terms of Service</h1>
      <p className="text-slate-500 mb-8">Last updated: October 2026</p>

      <div className="bg-white rounded-2xl border border-slate-100 p-8 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
          <p className="text-slate-600">By using Glimmind ("the App"), you agree to these Terms. If you disagree, do not use the App.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">2. Description of Service</h2>
          <p className="text-slate-600">Glimmind is a spaced repetition flashcard application for language learning. Features include:</p>
          <ul className="space-y-2 text-slate-600 mt-3 list-disc list-inside">
            <li>4-cycle spaced repetition (New → Seen → Recognized → Known → Learned)</li>
            <li>Exam mode (typed answers with fuzzy validation) and Training mode (self-evaluation)</li>
            <li>Voice study mode (speech recognition + text-to-speech)</li>
            <li>Local-first storage with optional Firebase cloud sync</li>
            <li>Import from CSV, text, YouTube subtitles</li>
            <li>Cross-platform: Web (PWA), iOS, Android</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">3. Accounts</h2>
          <ul className="space-y-3 text-slate-600">
            <li><strong>Authentication:</strong> Google OAuth or guest mode (local only)</li>
            <li><strong>Responsibility:</strong> You are responsible for your account credentials and activity</li>
            <li><strong>Guest mode:</strong> Data stored locally only; cleared if you clear browser data</li>
            <li><strong>Deletion:</strong> You may delete your account anytime in Settings</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">4. Subscriptions & Billing</h2>
          <ul className="space-y-3 text-slate-600">
            <li><strong>Free tier:</strong> 1,000 active cards, all core features</li>
            <li><strong>Premium (€4.99/month):</strong> 5,000 cards, premium voices, priority sync, advanced stats</li>
            <li><strong>Billing:</strong> Handled via Stripe. Cancel anytime; access continues until period ends</li>
            <li><strong>Refunds:</strong> Per Stripe policy; contact support for exceptional cases</li>
            <li><strong>Price changes:</strong> 30 days notice before any price increase</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">5. Acceptable Use</h2>
          <p className="text-slate-600">You agree not to:</p>
          <ul className="space-y-2 text-slate-600 mt-3 list-disc list-inside">
            <li>Reverse engineer, decompile, or attempt to extract source code</li>
            <li>Automate access (scraping, bots) beyond normal usage</li>
            <li>Upload illegal, harmful, or copyright-infringing content</li>
            <li>Abuse voice/translation APIs or exceed reasonable quotas</li>
            <li>Attempt to bypass quota limits or security controls</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">6. Intellectual Property</h2>
          <ul className="space-y-3 text-slate-600">
            <li><strong>Your content:</strong> You retain full ownership of flashcards you create</li>
            <li><strong>Our IP:</strong> The App code, design, and branding are our property</li>
            <li><strong>License:</strong> You grant us a license to store/process your content to provide the service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">7. Disclaimers</h2>
          <ul className="space-y-3 text-slate-600">
            <li>The App is provided "as is" without warranties of any kind</li>
            <li>We do not guarantee uninterrupted, error-free, or secure operation</li>
            <li>Spaced repetition algorithms are educational aids, not guaranteed learning outcomes</li>
            <li>Voice recognition accuracy varies by language, accent, and environment</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">8. Limitation of Liability</h2>
          <p className="text-slate-600">To the maximum extent permitted by law, Glimmind shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or loss of data, profits, or goodwill. Our total liability shall not exceed the amount you paid in the preceding 12 months (or €10 if free tier).</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">9. Termination</h2>
          <p className="text-slate-600">We may suspend or terminate access for violations of these Terms. You may terminate by deleting your account. Provisions that should survive termination (IP, disclaimers, liability limits) will survive.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">10. Governing Law</h2>
          <p className="text-slate-600">These Terms are governed by the laws of Spain. Disputes resolved in courts of Madrid.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">11. Changes</h2>
          <p className="text-slate-600">We may modify these Terms. Material changes notified 30 days in advance via email or in-app.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">12. Contact</h2>
          <p className="text-slate-600">Questions? Email <a href="mailto:legal@glimmind.com" className="text-indigo-600 hover:underline">legal@glimmind.com</a></p>
        </section>
      </div>

      <div className="mt-8 text-center">
        <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">← Back to Glimmind</Link>
      </div>
    </div>
  </div>
);
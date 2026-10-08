import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-600 via-indigo-700 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter mb-6">
              Flashcards on steroids for your brain.
            </h1>
            <p className="text-lg sm:text-xl text-indigo-100 max-w-3xl mx-auto mb-10 leading-relaxed">
              Glimmind uses a 4-cycle spaced repetition system with fuzzy matching, voice study mode, and cross-platform sync. 
              Learn languages faster with science-backed intervals.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-600 font-black uppercase text-sm tracking-widest rounded-2xl hover:bg-indigo-50 transition shadow-xl shadow-white/10 active:scale-95"
              >
                Start Free
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 bg-indigo-800 text-white font-black uppercase text-sm tracking-widest rounded-2xl hover:bg-indigo-700 transition border border-indigo-600 active:scale-95"
              >
                Watch Demo
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              Why Glimmind?
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Built for serious learners who want results, not gamification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              Simple, fair pricing
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Start free. Upgrade when you need more. No surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <PricingCard 
              name="Free"
              price="€0"
              period="/month"
              description="Perfect for casual learners"
              features={[
                '1,000 active cards',
                'Unlimited lists',
                'Exam & Training modes',
                'Voice study (browser TTS/STT)',
                'Local-first storage',
                'Cloud sync (Google OAuth)',
                'Import from CSV/Text/YouTube',
              ]}
              cta="Start Free"
              variant="outline"
              href="/login"
            />
            <PricingCard 
              name="Premium"
              price="€4.99"
              period="/month"
              description="For power users & polyglots"
              features={[
                '5,000 active cards',
                'Everything in Free',
                'Priority cloud sync',
                'Chirp 3 HD voices (premium TTS)',
                'Advanced statistics & reports',
                'Export all data (GDPR)',
                'Priority support',
              ]}
              cta="Upgrade to Premium"
              variant="filled"
              href="/login"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-indigo-600 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-6">
            Ready to learn faster?
          </h2>
          <p className="text-lg text-indigo-100 mb-8">
            Join thousands of learners using spaced repetition that actually works.
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-4 bg-white text-indigo-600 font-black uppercase text-sm tracking-widest rounded-2xl hover:bg-indigo-50 transition shadow-xl active:scale-95"
          >
            Create your first deck free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9" />
                    <path d="M12 21c4.97 0 9-4.03 9-9" opacity="0.4" />
                    <path d="M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0" />
                    <path d="M12 3v2" />
                    <path d="M12 19v2" />
                    <path d="M3 12h2" />
                    <path d="M19 12h2" />
                  </svg>
                </div>
                <span className="text-xl font-black text-white">Glimmind</span>
              </Link>
              <p className="text-sm text-slate-400 max-w-xs">
                Spaced repetition flashcards for language learning. Built with React, Firebase, and science.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/login" className="hover:text-white transition">Dashboard</Link></li>
                <li><Link to="/login" className="hover:text-white transition">Pricing</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">GitHub</a></li>
                <li><a href="mailto:hello@glimmind.com" className="hover:text-white transition">Contact</a></li>
                <li><Link to="/privacy" className="hover:text-white transition">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            © 2026 Glimmind. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const features: Feature[] = [
  {
    title: '4-Cycle Spaced Repetition',
    description: 'Cards progress through New → Seen → Recognized → Known → Learned based on your actual performance. No arbitrary intervals.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Two Game Modes',
    description: 'Exam mode: type your answer with fuzzy validation. Training mode: self-evaluate with reveal. Switch anytime.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    title: 'Fuzzy Answer Validation',
    description: 'Accent-insensitive Levenshtein distance — essential for Spanish vocabulary. "volver" matches "Volver" at 100%.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Voice Study Mode',
    description: 'Speak your answers hands-free. Browser STT + Chirp 3 HD TTS + Vosk offline. Voice commands: reveal, pass, stop.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 11-6 0z" />
      </svg>
    ),
  },
  {
    title: 'Cross-Platform',
    description: 'Web (PWA), iOS, and Android via Capacitor. One codebase, native feel everywhere. Works offline.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Local-First + Cloud Sync',
    description: 'Your data stays on your device. Optional Firebase sync for authenticated users. Google OAuth with guest mode.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
];

const FeatureCard: React.FC<{ feature: Feature }> = ({ feature }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-8 hover:shadow-lg hover:border-indigo-200 transition-all">
    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
      {feature.icon}
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
    <p className="text-slate-500 leading-relaxed">{feature.description}</p>
  </div>
);

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  variant: 'outline' | 'filled';
  href: string;
}

const PricingCard: React.FC<PricingCardProps> = ({ 
  name, price, period, description, features, cta, variant, href 
}) => (
  <Link 
    to={href} 
    className={`relative rounded-2xl p-8 transition-all ${
      variant === 'filled' 
        ? 'bg-indigo-600 text-white border border-indigo-600 shadow-xl shadow-indigo-200' 
        : 'bg-white text-slate-900 border border-slate-200 hover:border-indigo-300 hover:shadow-lg'
    }`}
  >
    {variant === 'filled' && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
        Most Popular
      </div>
    )}
    <div className="mb-6">
      <h3 className="text-xl font-black mb-2">{name}</h3>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-4xl font-black">{price}</span>
        <span className="text-sm opacity-70">{period}</span>
      </div>
      <p className="text-sm opacity-80">{description}</p>
    </div>
    <ul className="space-y-3 mb-8" role="list">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm">{feature}</span>
        </li>
      ))}
    </ul>
    <span className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest transition active:scale-95 inline-block text-center ${
      variant === 'filled'
        ? 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg shadow-white/10'
        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
    }`}>
      {cta}
    </span>
  </Link>
);
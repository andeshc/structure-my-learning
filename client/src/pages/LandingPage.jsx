import { ArrowRight, BookOpen, Brain, Check, Sparkles } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import Footer from '../components/Footer';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

// ─── Data ────────────────────────────────────────────────────────────────────

const DEMOS = [
  {
    query: 'teach me about transformer architecture',
    outline: [
      { title: 'What is a Transformer?', desc: 'The architecture that changed AI forever' },
      { title: 'Self-Attention Explained', desc: 'How models decide what to focus on' },
      { title: 'Positional Encoding', desc: 'Giving the model a sense of sequence' },
      { title: 'Multi-Head Attention', desc: 'Parallel attention streams for richer context' },
      { title: 'Training & Fine-tuning', desc: 'From pre-training to your specific use case' },
    ],
  },
  {
    query: 'I want to learn about flower parts',
    outline: [
      { title: 'Flower Anatomy Overview', desc: 'The key structures that make up a flower' },
      { title: 'Petals & Sepals', desc: 'Colour, attraction, and protection' },
      { title: 'Stamens & Pistils', desc: 'The male and female reproductive organs' },
      { title: 'Pollination', desc: 'How pollen travels and fertilises the ovule' },
      { title: 'Fruit & Seed Formation', desc: 'From fertilised flower to the next generation' },
    ],
  },
];

const STEPS = [
  {
    n: '01',
    Icon: BookOpen,
    title: 'Describe what you want to learn',
    body: 'Type it in plain English — as specific or as open-ended as you like. "Teach me about transformers" or "How does a compiler turn code into machine instructions?"',
    color: { bar: '#0f766e', chip: '#0f766e', icon: 'rgba(15,118,110,0.09)', iconBorder: 'rgba(15,118,110,0.2)', iconText: '#0f766e' },
  },
  {
    n: '02',
    Icon: Sparkles,
    title: 'Get a structured guide instantly',
    body: 'Within seconds you have a complete learning guide — topics in a logical progression from foundational to advanced, written for your exact query.',
    color: { bar: '#4f46e5', chip: '#4f46e5', icon: 'rgba(79,70,229,0.09)', iconBorder: 'rgba(79,70,229,0.2)', iconText: '#4f46e5' },
  },
  {
    n: '03',
    Icon: Brain,
    title: 'Go deep on every topic',
    body: 'Click any topic to generate rich educational content — real explanations, analogies, worked examples, and summaries. Not bullet points. Actual teaching.',
    color: { bar: '#d97706', chip: '#d97706', icon: 'rgba(217,119,6,0.09)', iconBorder: 'rgba(217,119,6,0.2)', iconText: '#d97706' },
  },
];

const FEATURES = [
  { title: 'From curiosity to curriculum',  numColor: 'rgba(15,118,110,0.28)',  body: 'You describe it in plain English. We build the roadmap — structured, logical, starting from the foundations and building toward real depth.' },
  { title: 'AI that teaches, not just answers', numColor: 'rgba(79,70,229,0.28)',  body: 'Every topic gets real educational content: clear explanations, real-world analogies, worked examples, and concise summaries.' },
  { title: 'Your library, always there',     numColor: 'rgba(217,119,6,0.28)', body: 'Every guide lives in your personal library. Come back in a week, a month, a year. Pick up exactly where you left off.' },
  { title: 'Built for depth, not breadth',   numColor: 'rgba(225,29,72,0.25)', body: "We don't surface 50 links. We generate one great guide. You learn one thing properly — then move to the next." },
];

const MARQUEE_TOPICS = [
  { title: 'Transformer Architecture', field: 'AI' },
  { title: 'The Water Cycle', field: 'Earth Science' },
  { title: 'Options Trading', field: 'Finance' },
  { title: 'How Compilers Work', field: 'Computer Science' },
  { title: 'The Roman Empire', field: 'History' },
  { title: 'Quantum Mechanics', field: 'Physics' },
  { title: 'Stoic Philosophy', field: 'Philosophy' },
  { title: 'Music Theory', field: 'Music' },
  { title: 'The French Revolution', field: 'History' },
  { title: 'Human Anatomy', field: 'Biology' },
  { title: 'Keynesian Economics', field: 'Economics' },
  { title: 'The Solar System', field: 'Astronomy' },
  { title: 'Machine Learning Basics', field: 'AI' },
  { title: 'Greek Mythology', field: 'Classics' },
  { title: 'Photosynthesis', field: 'Biology' },
  { title: 'Behavioural Psychology', field: 'Psychology' },
  { title: 'The Big Bang', field: 'Cosmology' },
  { title: 'Cryptocurrency Basics', field: 'Finance' },
];

const FREE_FEATURES = ['3 free guides', 'AI tutor · 10 messages per guide', 'Permanent library access'];
const PRO_FEATURES  = ['Unlimited guides', 'AI tutor · generous fair use', 'Permanent library access'];
const PRICES = {
  INR: { annual: '₹299', suffix: '/mo · billed annually' },
  USD: { annual: '$9',   suffix: '/mo · billed annually' },
};

// RAF-driven so the browser can't throttle it the way it does CSS animations.
// Mutates the DOM directly via ref — zero React re-renders during scroll.
const MARQUEE_PX_PER_SEC = 60;
const MarqueeStrip = memo(function MarqueeStrip() {
  const trackRef = useRef(null);
  const posRef   = useRef(0);
  const rafRef   = useRef(null);
  const lastRef  = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function step(ts) {
      if (lastRef.current !== null) {
        posRef.current -= MARQUEE_PX_PER_SEC * (ts - lastRef.current) / 1000;
        const halfWidth = track.scrollWidth / 2;
        if (posRef.current <= -halfWidth) posRef.current += halfWidth;
        track.style.transform = `translate3d(${posRef.current}px,0,0)`;
      }
      lastRef.current = ts;
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
    };
  }, []);

  const doubled = [...MARQUEE_TOPICS, ...MARQUEE_TOPICS];
  return (
    <div className="relative mt-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-canvas to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-canvas to-transparent" />
      <div
        ref={trackRef}
        className="flex w-max gap-3 py-2"
        style={{ willChange: 'transform' }}
      >
        {doubled.map(({ title, field }, i) => (
          <Link
            key={i}
            to="/login"
            className="flex shrink-0 items-center gap-2.5 rounded-full border border-charcoal/10 bg-white px-5 py-2.5 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span className="text-xs font-semibold text-teal-700">{field}</span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-charcoal-200" />
            <span className="text-sm font-medium text-charcoal">{title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
});

// ─── Reveal component ─────────────────────────────────────────────────────────

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      } ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

// ─── Demo animation hook ──────────────────────────────────────────────────────

function useDemoAnimation() {
  const [displayText, setDisplayText] = useState('');
  const [showOutline, setShowOutline] = useState(false);
  const [visibleTopics, setVisibleTopics] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const demoIndex = animKey % DEMOS.length;
  const { query, outline } = DEMOS[demoIndex];

  useEffect(() => {
    let cancelled = false;
    const timers = [];

    let i = 0;
    const typeInterval = setInterval(() => {
      if (cancelled) return;
      i++;
      setDisplayText(query.slice(0, i));
      if (i >= query.length) {
        clearInterval(typeInterval);
        const t1 = setTimeout(() => {
          if (cancelled) return;
          setShowOutline(true);
          let topicIdx = 0;
          const topicInterval = setInterval(() => {
            if (cancelled) return;
            topicIdx++;
            setVisibleTopics(topicIdx);
            if (topicIdx >= outline.length) {
              clearInterval(topicInterval);
              const t2 = setTimeout(() => {
                if (cancelled) return;
                setShowOutline(false);
                setVisibleTopics(0);
                const t3 = setTimeout(() => {
                  if (cancelled) return;
                  setDisplayText('');
                  const t4 = setTimeout(() => {
                    if (!cancelled) setAnimKey((k) => k + 1);
                  }, 300);
                  timers.push(t4);
                }, 400);
                timers.push(t3);
              }, 3500);
              timers.push(t2);
            }
          }, 170);
        }, 600);
        timers.push(t1);
      }
    }, 42);

    return () => {
      cancelled = true;
      clearInterval(typeInterval);
      timers.forEach(clearTimeout);
    };
  }, [animKey]);

  return { displayText, showOutline, visibleTopics, outline };
}

// Isolated so its 24fps typing state never re-renders the parent page
const HeroDemo = memo(function HeroDemo() {
  const { displayText, showOutline, visibleTopics, outline } = useDemoAnimation();
  return (
    <div className="mx-auto mt-14 max-w-2xl overflow-hidden rounded-xl border border-charcoal/10 bg-white text-left shadow-card">
      <div className="flex items-center gap-1.5 border-b border-charcoal/8 bg-canvas/60 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
        <span className="ml-3 text-xs text-charcoal-200">StructureMyLearning</span>
      </div>

      <div className="px-5 py-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-charcoal-200">
          What do you want to learn?
        </p>
        <div className="flex min-h-10 items-center gap-1 rounded-lg border border-charcoal/10 bg-canvas px-4 py-2.5">
          <span className="text-sm text-charcoal">{displayText}</span>
          <span className="inline-block h-4 w-px animate-pulse bg-teal-700" />
        </div>
      </div>

      <div className="px-5 pb-4">
        <Link to="/login" className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800">
          Generate my guide <ArrowRight size={14} />
        </Link>
      </div>

      <div className="border-t border-charcoal/8 px-5 pb-5">
        <p
          className="mb-3 pt-4 text-xs font-medium uppercase tracking-widest text-charcoal-200 transition-opacity duration-300"
          style={{ opacity: showOutline ? 1 : 0 }}
        >
          Your learning guide — {outline.length} topics
        </p>
        <div className="space-y-2">
          {outline.map((item, i) => (
            <div
              key={i}
              className="flex h-[62px] items-center gap-3 overflow-hidden rounded-lg border border-charcoal/8 px-4 transition-all duration-300"
              style={{
                opacity: showOutline && i < visibleTopics ? 1 : 0,
                transform: showOutline && i < visibleTopics ? 'translateY(0)' : 'translateY(6px)',
                transitionDelay: `${i * 50}ms`,
              }}
            >
              <span className="shrink-0 font-mono text-xs font-semibold text-teal-700">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-charcoal">{item.title}</p>
                <p className="truncate text-xs text-charcoal-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { status, isAuthenticated } = useAuth();
  const [currency, setCurrency] = useState('USD');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch('/api/geo')
      .then((r) => r.json())
      .then((d) => setCurrency(d.country === 'IN' ? 'INR' : 'USD'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  if (status === 'loading') return <div className="min-h-screen bg-canvas" />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const price = PRICES[currency];

  return (
    <div className="flex min-h-screen flex-col bg-canvas">

      {/* ── Navbar ── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-200 ${
          scrolled ? 'border-b border-charcoal/10 bg-canvas/95 shadow-sm backdrop-blur-sm' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/">
            <Logo className="h-8 w-auto" />
          </Link>
          <nav className="hidden items-center gap-7 sm:flex">
            <Link to="/pricing" className="text-sm text-charcoal-400 transition-colors hover:text-charcoal">Pricing</Link>
            <Link to="/login"   className="text-sm text-charcoal-400 transition-colors hover:text-charcoal">Sign in</Link>
            <Link to="/login" className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800">
              Get started free
            </Link>
          </nav>
          <div className="flex items-center gap-3 sm:hidden">
            <Link to="/login" className="text-sm text-charcoal-400">Sign in</Link>
            <Link to="/login" className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative w-full overflow-hidden">
        {/* Fine line grid texture, faded out toward the bottom */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(15,118,110,0.12) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(15,118,110,0.12) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '40px 40px',
            WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 90%)',
            maskImage: 'linear-gradient(to bottom, black 30%, transparent 90%)',
          }}
        />
        {/* Color blooms on top of the texture */}
        <div
          className="pointer-events-none absolute inset-x-0 -top-20 h-[560px]"
          style={{
            background: [
              'radial-gradient(ellipse 55% 70% at 15% 0%, rgba(99,102,241,0.11) 0%, transparent 60%)',
              'radial-gradient(ellipse 80% 110% at 50% 0%, rgba(15,118,110,0.10) 0%, transparent 65%)',
              'radial-gradient(ellipse 45% 60% at 85% 5%, rgba(251,146,60,0.09) 0%, transparent 55%)',
            ].join(', '),
          }}
        />
        <div className="relative mx-auto w-full max-w-4xl px-6 pb-20 pt-16 text-center">
          <span className="inline-block rounded-full border border-teal-700/25 bg-teal-700/6 px-4 py-1.5 text-xs font-medium tracking-wide text-teal-700">
            AI-powered structured learning
          </span>

          <h1 className="mt-6 text-5xl font-semibold leading-[1.1] tracking-tight text-charcoal sm:text-6xl">
            Turn any learning goal into<br />
            <span className="bg-gradient-to-r from-teal-600 via-cyan-500 to-indigo-500 bg-clip-text text-transparent">
              a guide built just for you.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-charcoal-400 sm:text-lg">
            Type what you're curious about. Get a complete, structured learning guide — with real depth
            on every topic. Like having a tutor who wrote a mini-course, just for you.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login" className="flex items-center gap-2 rounded-md bg-teal-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-800">
              Get started free <ArrowRight size={15} />
            </Link>
            <Link to="/pricing" className="rounded-md border border-charcoal/20 px-6 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/5">
              See pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-charcoal-400">No credit card required · 3 free guides to start</p>

          <HeroDemo />

          <p className="mt-6 text-sm text-charcoal-400">
            Join learners building real knowledge — not just watching videos.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-charcoal/8 bg-canvas py-20">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-teal-700" />
            <h2 className="text-center text-2xl font-semibold tracking-tight text-charcoal">How it works</h2>
            <p className="mt-2 text-center text-sm text-charcoal-400">Three steps from curious to knowledgeable.</p>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {STEPS.map(({ n, Icon, title, body, color }, i) => (
              <Reveal key={n} delay={i * 100}>
                <div className="relative overflow-hidden rounded-xl border border-charcoal/10 bg-white p-7 shadow-card h-full">
                  <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: color.bar }} />
                  <div className="mb-6 flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold text-white" style={{ backgroundColor: color.chip }}>
                      {n.replace('0', '')}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: color.icon, border: `1px solid ${color.iconBorder}` }}>
                      <Icon size={17} style={{ color: color.iconText }} />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-charcoal">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-charcoal-400">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built differently — editorial layout ── */}
      <section className="border-t border-charcoal/8 py-20" style={{ backgroundColor: 'rgba(15,118,110,0.03)' }}>
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-teal-700" />
            <h2 className="text-center text-2xl font-semibold tracking-tight text-charcoal">Built differently.</h2>
            <p className="mt-2 text-center text-sm text-charcoal-400">
              Not another link aggregator. Not a chatbot. A proper learning tool.
            </p>
          </Reveal>

          <div className="mt-14">
            {FEATURES.map(({ title, body, numColor }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className={`flex flex-col gap-5 py-10 sm:flex-row sm:items-start sm:gap-14 ${i > 0 ? 'border-t border-charcoal/8' : ''}`}>
                  <span
                    className="shrink-0 font-mono text-7xl font-bold leading-none sm:min-w-[5rem] sm:text-right"
                    style={{ color: numColor }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-charcoal">{title}</h3>
                    <p className="mt-3 max-w-lg text-sm leading-7 text-charcoal-400">{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Learn anything — marquee ── */}
      <section className="border-t border-charcoal/8 bg-canvas py-20">
        <Reveal>
          <div className="mx-auto max-w-5xl px-6">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-teal-700" />
            <h2 className="text-center text-2xl font-semibold tracking-tight text-charcoal">Learn anything.</h2>
            <p className="mt-2 text-center text-sm text-charcoal-400">A few examples of what people are learning about.</p>
          </div>
        </Reveal>

        <MarqueeStrip />

        <p className="mt-8 text-center text-xs text-charcoal-200">
          And anything else you've ever been curious about.
        </p>
      </section>

      {/* ── Pricing teaser ── */}
      <section className="border-t border-charcoal/8 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-teal-700" />
            <h2 className="text-center text-2xl font-semibold tracking-tight text-charcoal">
              Start free. <span className="text-teal-700">Go deeper</span> when you're ready.
            </h2>
            <p className="mt-2 text-center text-sm text-charcoal-400">
              Three full guides before you ever see a paywall. No trials. No tricks.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <Reveal delay={0}>
              <div className="rounded-xl border border-charcoal/10 bg-white p-7 h-full">
                <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-400">Free</p>
                <p className="mt-3 text-3xl font-semibold text-charcoal">Free</p>
                <p className="mt-1 text-sm text-charcoal-400">No credit card required</p>
                <ul className="mt-6 space-y-3">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-charcoal-400">
                      <Check size={14} className="shrink-0 text-teal-700" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/login" className="mt-8 block w-full rounded-md border border-charcoal/20 py-2.5 text-center text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/5">
                  Get started free
                </Link>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-xl border border-teal-700/25 bg-white p-7 shadow-card ring-1 ring-teal-700/15 h-full">
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Pro</p>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <p className="text-3xl font-semibold text-charcoal">{price.annual}</p>
                  <p className="text-sm text-charcoal-400">{price.suffix}</p>
                </div>
                <p className="mt-1 text-sm text-charcoal-400">Monthly option available</p>
                <ul className="mt-6 space-y-3">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-charcoal-400">
                      <Check size={14} className="shrink-0 text-teal-700" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/login" className="mt-8 block w-full rounded-md bg-teal-700 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-teal-800">
                  Start with Pro
                </Link>
              </div>
            </Reveal>
          </div>

          <p className="mt-5 text-center text-sm">
            <Link to="/pricing" className="text-teal-700 hover:underline">See full pricing details →</Link>
          </p>
        </div>
      </section>

      {/* ── Final CTA + Footer — shared dark block ── */}
      <div className="relative" style={{ backgroundColor: '#042f2e' }}>
        {/* White fine-line grid across the whole dark block */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '40px 40px',
          }}
        />

        <section className="relative overflow-hidden py-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-teal-700/40" />
          <Reveal>
            <div className="mx-auto max-w-3xl px-6 text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                The best time to learn something<br className="hidden sm:block" /> properly was yesterday.
              </h2>
              <p className="mt-4 text-teal-200/70">The second best time is right now.</p>
              <Link to="/login" className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-8 py-3 text-sm font-medium text-teal-900 transition-colors hover:bg-teal-50">
                Start learning for free <ArrowRight size={15} />
              </Link>
            </div>
          </Reveal>
        </section>

        <Footer className="relative border-t border-white/10 text-teal-200/50 [&_a]:text-teal-200/50 [&_a:hover]:text-white [&_span]:text-teal-200/50" />
      </div>
    </div>
  );
}

import { ArrowRight, BookOpen, Brain, Check, ChevronRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

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
  },
  {
    n: '02',
    Icon: Sparkles,
    title: 'Get a structured guide instantly',
    body: 'Within seconds you have a complete learning guide — topics in a logical progression from foundational to advanced, written for your exact query.',
  },
  {
    n: '03',
    Icon: Brain,
    title: 'Go deep on every topic',
    body: 'Click any topic to generate rich educational content — real explanations, analogies, worked examples, and summaries. Not bullet points. Actual teaching.',
  },
];

const FEATURES = [
  {
    title: 'From curiosity to curriculum',
    body: 'You describe it in plain English. We build the roadmap — structured, logical, starting from the foundations and building toward real depth.',
  },
  {
    title: 'AI that teaches, not just answers',
    body: 'Every topic gets real educational content: clear explanations, real-world analogies, worked examples, and concise summaries.',
  },
  {
    title: 'Your library, always there',
    body: 'Every guide lives in your personal library. Come back in a week, a month, a year. Pick up exactly where you left off.',
  },
  {
    title: 'Built for depth, not breadth',
    body: "We don't surface 50 links. We generate one great guide. You learn one thing properly — then move to the next.",
  },
];

const TOPICS = [
  { title: 'Transformer Architecture', field: 'Artificial Intelligence' },
  { title: 'The Water Cycle', field: 'Earth Science' },
  { title: 'Options Trading', field: 'Finance' },
  { title: 'How Compilers Work', field: 'Computer Science' },
  { title: 'The Roman Empire', field: 'History' },
  { title: 'Quantum Mechanics', field: 'Physics' },
];

const FREE_FEATURES = ['3 free guides', 'AI tutor · 10 messages per guide', 'Permanent library access'];
const PRO_FEATURES = ['Unlimited guides', 'AI tutor · generous fair use', 'Permanent library access'];
const PRICES = {
  INR: { annual: '₹299', suffix: '/mo · billed annually' },
  USD: { annual: '$9',   suffix: '/mo · billed annually' },
};

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

export default function LandingPage() {
  const { status, isAuthenticated } = useAuth();
  const [currency, setCurrency] = useState('USD');
  const [scrolled, setScrolled] = useState(false);
  const { displayText, showOutline, visibleTopics, outline } = useDemoAnimation();

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
          <Link to="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            StructureMyLearning
          </Link>
          <nav className="hidden items-center gap-7 sm:flex">
            <Link to="/pricing" className="text-sm text-charcoal-400 transition-colors hover:text-charcoal">
              Pricing
            </Link>
            <Link to="/login" className="text-sm text-charcoal-400 transition-colors hover:text-charcoal">
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-charcoal-600"
            >
              Get started free
            </Link>
          </nav>
          <div className="flex items-center gap-3 sm:hidden">
            <Link to="/login" className="text-sm text-charcoal-400">
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto w-full max-w-4xl px-6 pb-20 pt-16 text-center">
        <span className="inline-block rounded-full border border-teal-700/25 bg-teal-700/6 px-4 py-1.5 text-xs font-medium tracking-wide text-teal-700">
          AI-powered structured learning
        </span>

        <h1 className="mt-6 text-5xl font-semibold leading-[1.1] tracking-tight text-charcoal sm:text-6xl">
          Turn any question into<br />
          <span className="text-teal-700">a course worth taking.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-charcoal-400 sm:text-lg">
          Type what you're curious about. Get a complete, structured learning guide — with real depth
          on every topic. Like having a tutor who wrote a mini-course, just for you.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/register"
            className="flex items-center gap-2 rounded-md bg-charcoal px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-charcoal-600"
          >
            Get started free <ArrowRight size={15} />
          </Link>
          <Link
            to="/pricing"
            className="rounded-md border border-charcoal/20 px-6 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/5"
          >
            See pricing
          </Link>
        </div>
        <p className="mt-3 text-xs text-charcoal-200">No credit card required · 3 free guides to start</p>

        {/* ── Animated demo ── */}
        <div className="mx-auto mt-14 max-w-2xl overflow-hidden rounded-xl border border-charcoal/10 bg-white text-left shadow-card">
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 border-b border-charcoal/8 bg-canvas/60 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
            <span className="ml-3 text-xs text-charcoal-200">StructureMyLearning</span>
          </div>

          {/* Input row */}
          <div className="px-5 py-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-charcoal-200">
              What do you want to learn?
            </p>
            <div className="flex min-h-10 items-center gap-1 rounded-lg border border-charcoal/10 bg-canvas px-4 py-2.5">
              <span className="text-sm text-charcoal">{displayText}</span>
              <span className="inline-block h-4 w-px animate-pulse bg-teal-700" />
            </div>
          </div>

          {/* Generate button */}
          <div className="px-5 pb-4">
            <Link
              to="/register"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-charcoal py-2.5 text-sm font-medium text-white transition-colors hover:bg-charcoal-600"
            >
              Generate my guide <ArrowRight size={14} />
            </Link>
          </div>

          {/* Outline — always rendered at full height; only opacity animates */}
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

        <p className="mt-6 text-sm text-charcoal-400">
          Join learners building real knowledge — not just watching videos.
        </p>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-charcoal/8 bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-charcoal">
            How it works
          </h2>
          <p className="mt-2 text-center text-sm text-charcoal-400">
            Three steps from curious to knowledgeable.
          </p>

          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {STEPS.map(({ n, Icon, title, body }) => (
              <div key={n}>
                <p className="font-mono text-5xl font-bold text-charcoal/8 leading-none">{n}</p>
                <div className="mt-3 flex h-9 w-9 items-center justify-center rounded-lg border border-teal-700/20 bg-teal-700/6">
                  <Icon size={16} className="text-teal-700" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-charcoal">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-charcoal-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature highlights ── */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-charcoal">
            Built differently.
          </h2>
          <p className="mt-2 text-center text-sm text-charcoal-400">
            Not another link aggregator. Not a chatbot. A proper learning tool.
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {FEATURES.map(({ title, body }) => (
              <div
                key={title}
                className="group rounded-xl border border-charcoal/10 bg-white p-7 transition-shadow hover:shadow-card-hover"
              >
                <div className="h-0.5 w-8 rounded-full bg-teal-700 transition-all duration-300 group-hover:w-14" />
                <h3 className="mt-5 text-base font-semibold text-charcoal">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-charcoal-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Topic examples ── */}
      <section className="border-t border-charcoal/8 bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-charcoal">
            Learn anything.
          </h2>
          <p className="mt-2 text-center text-sm text-charcoal-400">
            A few examples of what people are learning about.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TOPICS.map(({ title, field }) => (
              <Link
                key={title}
                to="/register"
                className="group flex flex-col gap-2 rounded-xl border border-charcoal/8 bg-canvas px-5 py-4 transition-all duration-200 hover:border-teal-700/25 hover:bg-white hover:shadow-card"
              >
                <span className="text-xs font-medium uppercase tracking-widest text-charcoal-200">
                  {field}
                </span>
                <span className="text-sm font-medium text-charcoal transition-colors group-hover:text-teal-700">
                  {title}
                </span>
                <ChevronRight
                  size={13}
                  className="text-charcoal-200 transition-all duration-200 group-hover:translate-x-1 group-hover:text-teal-700"
                />
              </Link>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-charcoal-200">
            And anything else you've ever been curious about.
          </p>
        </div>
      </section>

      {/* ── Pricing teaser ── */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-charcoal">
            Start free. Go deeper when you're ready.
          </h2>
          <p className="mt-2 text-center text-sm text-charcoal-400">
            Three full guides before you ever see a paywall. No trials. No tricks.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {/* Free */}
            <div className="rounded-xl border border-charcoal/10 bg-white p-7">
              <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-400">Free</p>
              <p className="mt-3 text-3xl font-semibold text-charcoal">Free</p>
              <p className="mt-1 text-sm text-charcoal-400">No credit card required</p>
              <ul className="mt-6 space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-charcoal-400">
                    <Check size={14} className="shrink-0 text-teal-700" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="mt-8 block w-full rounded-md border border-charcoal/20 py-2.5 text-center text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/5"
              >
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-xl border border-teal-700/25 bg-white p-7 shadow-card ring-1 ring-teal-700/15">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Pro</p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <p className="text-3xl font-semibold text-charcoal">{price.annual}</p>
                <p className="text-sm text-charcoal-400">{price.suffix}</p>
              </div>
              <p className="mt-1 text-sm text-charcoal-400">Monthly option available</p>
              <ul className="mt-6 space-y-3">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-charcoal-400">
                    <Check size={14} className="shrink-0 text-teal-700" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="mt-8 block w-full rounded-md bg-teal-700 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-teal-800"
              >
                Start with Pro
              </Link>
            </div>
          </div>

          <p className="mt-5 text-center text-sm">
            <Link to="/pricing" className="text-teal-700 hover:underline">
              See full pricing details →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-charcoal py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The best time to learn something<br className="hidden sm:block" /> properly was yesterday.
          </h2>
          <p className="mt-4 text-charcoal-400">The second best time is right now.</p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-8 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-canvas"
          >
            Start learning for free <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <div className="bg-charcoal">
        <Footer className="border-t border-white/10 text-charcoal-400 [&_a]:text-charcoal-400 [&_a:hover]:text-white [&_span]:text-charcoal-400" />
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { createGuide, fetchClarifyingQuestions } from '../api/guides';

function QuestionSkeleton({ index, visible }) {
  return (
    <div
      style={{ transitionDelay: `${(index + 1) * 60}ms` }}
      className={`rounded-lg border border-charcoal/10 bg-white p-4 transition-all duration-220 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="h-3 w-3/5 rounded-full bg-slate-200 animate-pulse" />
      <div className="mt-0.5 h-2.5 w-2/5 rounded-full bg-slate-100 animate-pulse" />
      <div className="mt-3 flex flex-wrap gap-2">
        <div className="h-8 w-28 rounded-full bg-slate-100 animate-pulse" />
        <div className="h-8 w-20 rounded-full bg-slate-100 animate-pulse" />
        <div className="h-8 w-24 rounded-full bg-slate-100 animate-pulse" />
        <div className="h-8 w-16 rounded-full bg-slate-100 animate-pulse" />
      </div>
    </div>
  );
}

function OptionChip({ label, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        isSelected
          ? 'border-teal-700 bg-teal-700 text-white'
          : 'border-charcoal/15 text-charcoal hover:border-teal-600/40 hover:bg-teal-50'
      }`}
    >
      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
      {label}
    </button>
  );
}

function QuestionCard({ question, index, visible, answers, onToggle }) {
  const ans = answers[question.id];
  const isSelected = (optionId) =>
    Array.isArray(ans) ? ans.includes(optionId) : ans === optionId;

  return (
    <div
      style={{ transitionDelay: `${(index + 1) * 60}ms` }}
      className={`rounded-lg border border-charcoal/10 bg-white p-4 transition-all duration-220 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <p className="text-sm font-semibold text-charcoal">{question.question}</p>
      {question.rationale && (
        <p className="mt-0.5 text-xs text-charcoal-400">{question.rationale}</p>
      )}
      {question.allowMultiple && (
        <p className="mt-0.5 text-xs text-charcoal-400/70">Pick any that apply</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {question.options.map((option) => (
          <OptionChip
            key={option.id}
            label={option.label}
            isSelected={isSelected(option.id)}
            onClick={() => onToggle(question.id, option.id, question.allowMultiple)}
          />
        ))}
      </div>
    </div>
  );
}

export default function ClarifyGoalPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [visible, setVisible] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [skipMessage, setSkipMessage] = useState('');
  const [fetchError, setFetchError] = useState(false);
  const [answers, setAnswers] = useState({});
  const [freeText, setFreeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  );

  const { prompt, learningLevel, coverage } = state ?? {};

  useEffect(() => {
    if (!prompt) {
      navigate('/guides/new', { replace: true });
      return;
    }

    const frame = requestAnimationFrame(() => setVisible(true));

    fetchClarifyingQuestions({ prompt, learningLevel, coverage })
      .then((data) => {
        if (data.skip) {
          setSkipMessage('Your prompt is clear — generating your outline…');
          setTimeout(() => submitGuide([]), 600);
        } else {
          setQuestions(data.questions);
        }
      })
      .catch(() => setFetchError(true));

    return () => cancelAnimationFrame(frame);
  }, []);

  async function submitGuide(clarifications) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { guideId } = await createGuide({
        prompt,
        learningLevel,
        coverage,
        clarifications,
        freeText: freeText.trim() || undefined,
      });
      navigate(`/guides/${guideId}`);
    } catch {
      setIsSubmitting(false);
    }
  }

  function buildClarifications() {
    if (!questions) return [];
    return questions
      .filter((q) => q.id in answers)
      .map((q) => ({
        question: q.question,
        answers: Array.isArray(answers[q.id]) ? answers[q.id] : [answers[q.id]],
      }));
  }

  function toggleAnswer(questionId, optionId, allowMultiple) {
    setAnswers((prev) => {
      const next = { ...prev };
      if (allowMultiple) {
        const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
        const newCurrent = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        if (newCurrent.length === 0) delete next[questionId];
        else next[questionId] = newCurrent;
      } else {
        if (prev[questionId] === optionId) delete next[questionId];
        else next[questionId] = optionId;
      }
      return next;
    });
  }

  const translateClass = prefersReducedMotion.current ? '' : (visible ? 'translate-y-0' : 'translate-y-3');
  const pageClass = `transition-all duration-220 ease-out ${visible ? 'opacity-100' : 'opacity-0'} ${translateClass}`;

  const promptDisplay = prompt
    ? prompt.length > 90 ? prompt.slice(0, 90) + '…' : prompt
    : '';

  const isLoading = !questions && !fetchError && !skipMessage;

  return (
    <section className={`max-w-2xl ${pageClass}`}>
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
          Refine your goal
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {skipMessage ? 'Almost there…' : 'A few quick questions'}
        </h1>
        <p className="mt-1.5 text-sm text-charcoal-400">
          For: <span className="font-medium text-charcoal">{promptDisplay}</span>
        </p>
        <Link
          to="/guides/new"
          className="mt-2 inline-flex items-center gap-1 text-xs text-charcoal-400 hover:text-charcoal"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Edit prompt
        </Link>
      </div>

      {/* Skip message (auto-skip path) */}
      {skipMessage && (
        <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          {skipMessage}
        </div>
      )}

      {/* Error state */}
      {fetchError && (
        <div className="mt-6 rounded-lg border border-charcoal/10 bg-white p-4">
          <p className="text-sm font-medium text-charcoal">Couldn't load questions</p>
          <p className="mt-0.5 text-xs text-charcoal-400">
            You can still generate your guide without them.
          </p>
          <button
            type="button"
            onClick={() => submitGuide([])}
            disabled={isSubmitting}
            className="mt-3 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Generating…' : 'Generate without questions'}
          </button>
        </div>
      )}

      {/* Question skeletons while loading */}
      {isLoading && (
        <div className="mt-6 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <QuestionSkeleton key={i} index={i} visible={visible} />
          ))}
        </div>
      )}

      {/* Real questions */}
      {questions && questions.length > 0 && (
        <>
          <div className="mt-6 flex flex-col gap-3">
            {questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i}
                visible={visible}
                answers={answers}
                onToggle={toggleAnswer}
              />
            ))}
          </div>

          {/* Free-text */}
          <div
            style={{ transitionDelay: `${(questions.length + 1) * 60}ms` }}
            className={`mt-3 rounded-lg border border-charcoal/10 bg-white p-4 transition-all duration-220 ease-out ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <label className="block text-sm font-semibold text-charcoal" htmlFor="free-text">
              Anything else we should know?{' '}
              <span className="font-normal text-charcoal-400">(optional)</span>
            </label>
            <textarea
              id="free-text"
              className="mt-2 min-h-16 w-full resize-y rounded-md border border-charcoal/15 px-3 py-2 text-sm outline-none focus:border-teal-700"
              placeholder="e.g. I'm preparing for a job interview next week"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              maxLength={400}
              rows={2}
            />
          </div>

          {/* CTAs */}
          <div
            style={{ transitionDelay: `${(questions.length + 2) * 60}ms` }}
            className={`mt-4 flex gap-3 transition-all duration-220 ease-out ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <button
              type="button"
              onClick={() => submitGuide([])}
              disabled={isSubmitting}
              className="rounded-lg border border-teal-200 px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            >
              Skip & generate
            </button>
            <button
              type="button"
              onClick={() => submitGuide(buildClarifications())}
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Generating…' : 'Generate guide outline →'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

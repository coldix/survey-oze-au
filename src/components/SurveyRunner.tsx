import { useEffect, useMemo, useState } from 'react';
import { assignToZone, removeFromZone, type DragMap } from '../lib/assign-zone';
import type { CommunityStats } from '../lib/community';
import { answerBits, correctAnswerText, resultTag, scoreSurvey } from '../lib/score';
import { shuffle } from '../lib/shuffle';
import type { AnswerValue, Answers, Question, SurveyDefinition } from '../lib/types';

type Props = { survey: SurveyDefinition };

function storageKey(slug: string, kind: 'done' | 'response') {
  return `oze-survey-${slug}-v2-${kind}`;
}

function clientId(slug: string): string {
  const key = `oze-survey-${slug}-client`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

function questionReady(question: Question, answer: AnswerValue | undefined): boolean {
  if (question.type === 'demographics') {
    const value = (answer ?? {}) as Record<string, string>;
    return question.fields.every((field) => Boolean(value[field.id]));
  }
  if (question.type === 'checkbox') return Array.isArray(answer) && answer.length > 0;
  if (question.type === 'rating') return typeof answer === 'number';
  if (question.type === 'text') return Boolean(question.optional) || Boolean(answer && String(answer).trim());
  if (question.type === 'drag-colours') {
    const placed = (answer ?? {}) as DragMap;
    return question.zones.every((zone) => Object.values(placed).includes(zone));
  }
  if (question.type === 'drag-people') {
    const placed = (answer ?? {}) as DragMap;
    return question.items.every((item) => Boolean(placed[item.id]));
  }
  return typeof answer === 'string' && answer.length > 0;
}

export default function SurveyRunner({ survey }: Props) {
  const saved = useMemo(() => {
    try {
      if (!localStorage.getItem(storageKey(survey.slug, 'done'))) return null;
      return JSON.parse(localStorage.getItem(storageKey(survey.slug, 'response')) || 'null') as {
        answers: Answers;
        score: number;
        max: number;
        stats?: CommunityStats;
      } | null;
    } catch {
      return null;
    }
  }, [survey.slug]);

  const [step, setStep] = useState(saved ? survey.questions.length : -1);
  const [answers, setAnswers] = useState<Answers>(saved?.answers ?? {});
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState(saved);

  const question = step >= 0 && step < survey.questions.length ? survey.questions[step] : undefined;
  const progress = step < 0 ? 0 : Math.min(100, Math.round((step / survey.questions.length) * 100));

  useEffect(() => {
    setPicked(null);
  }, [step]);

  useEffect(() => {
    if (step < survey.questions.length) return;
    let cancelled = false;
    void fetch(`/api/stats/${survey.slug}`)
      .then((response) => response.json() as Promise<CommunityStats>)
      .then((stats) => {
        if (cancelled || !stats.questions) return;
        setResult((current) => (current ? { ...current, stats } : current));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [step, survey.slug, survey.questions.length]);

  function setAnswer(value: AnswerValue) {
    if (!question) return;
    setAnswers((current) => ({ ...current, [question.id]: value }));
  }

  async function finish() {
    setBusy(true);
    setError(null);
    const scored = scoreSurvey(survey, answers);
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: survey.slug, answers, clientId: clientId(survey.slug) }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        score?: number;
        max?: number;
        error?: string;
      };
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not save your answers.');
      const statsRes = await fetch(`/api/stats/${survey.slug}`);
      const stats = (await statsRes.json()) as CommunityStats & { ok?: boolean };
      const next = {
        answers,
        score: payload.score ?? scored.score,
        max: payload.max ?? scored.max,
        stats,
      };
      localStorage.setItem(storageKey(survey.slug, 'done'), '1');
      localStorage.setItem(storageKey(survey.slug, 'response'), JSON.stringify(next));
      setResult(next);
      setStep(survey.questions.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your answers.');
    } finally {
      setBusy(false);
    }
  }

  if (step === -1) {
    return (
      <section className="glass">
        <h1>{survey.title}</h1>
        <p className="welcome-sub lede">{survey.subtitle}</p>
        <div className="badge-row">
          <span className="badge">Anonymous</span>
          <span className="badge">~{survey.minutes} minutes</span>
          <span className="badge">One attempt</span>
        </div>
        <p className="lede">How well do you know the people, colours and stories on Australia's banknotes?</p>
        <div className="nav-row">
          <button className="btn btn-primary" type="button" onClick={() => setStep(0)}>
            Begin survey
          </button>
        </div>
      </section>
    );
  }

  if (result && step >= survey.questions.length) {
    return (
      <section className="glass">
        <p className="phase-tag">Results</p>
        <h1>Your score</h1>
        <p className="score-hero">
          {result.score}/{result.max}
        </p>
        <div className="survey-list">
          {survey.questions.map((item) => {
            const answer = result.answers[item.id];
            const tag = resultTag(item, answer);
            const correct = correctAnswerText(item);
            const bits = answerBits(item, answer);
            return (
              <article key={item.id} className="survey-card">
                {tag && <p className="phase-tag">{tag}</p>}
                <h2 className="question-text" dangerouslySetInnerHTML={{ __html: item.question }} />
                <p className="lede">
                  Your answer:{' '}
                  {bits.map((bit, index) => (
                    <span key={`${item.id}-${index}`}>
                      {index > 0 ? '; ' : null}
                      {bit.wrong ? <strong className="answer-wrong">{bit.text}</strong> : bit.text}
                    </span>
                  ))}
                </p>
                {tag === 'Wrong' && correct && <p className="explain">Correct answer: {correct}</p>}
                {'explanation' in item && item.explanation ? <p className="explain">{item.explanation}</p> : null}
              </article>
            );
          })}
        </div>
        {result.stats && (
          <div className="glass" style={{ marginTop: '1.5rem' }}>
            <p className="phase-tag">Results so far</p>
            <h2>Everyone who has taken this survey</h2>
            <p className="lede">
              {result.stats.responses} {result.stats.responses === 1 ? 'response' : 'responses'}
              {result.stats.averageScore != null
                ? ` · average score ${result.stats.averageScore}/${result.stats.maxScore}`
                : ''}
              {result.stats.averagePercent != null ? ` (${result.stats.averagePercent}%)` : ''}.
            </p>
            <div className="survey-list">
              {result.stats.questions.map((row) => (
                <article key={row.id} className="survey-card">
                  <h3>{row.title}</h3>
                  {row.kind === 'score' && (
                    <p className="lede">{row.correctPercent}% answered correctly</p>
                  )}
                  {row.kind === 'tally' && row.tallies?.map((tally) => (
                    <div key={tally.option} className="tally-row">
                      <span>{tally.option}</span>
                      <span>{tally.percent}% ({tally.count})</span>
                      <div className="tally-bar"><span style={{ width: `${tally.percent}%` }} /></div>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  if (!question) return null;
  const answer = answers[question.id];
  const ready = questionReady(question, answer);

  return (
    <section className="glass">
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="phase-tag">{question.phase}</p>
      <h2 className="question-text" dangerouslySetInnerHTML={{ __html: question.question }} />
      {question.type === 'demographics' && (
        <div className="demo-fields">
          {question.fields.map((field) => (
            <fieldset key={field.id} className="options">
              <legend>{field.label}</legend>
              {field.options.map((option) => (
                <label className="option" key={option}>
                  <input
                    type="radio"
                    name={field.id}
                    value={option}
                    checked={((answer ?? {}) as Record<string, string>)[field.id] === option}
                    onChange={() => setAnswer({ ...((answer ?? {}) as Record<string, string>), [field.id]: option })}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      )}
      {(question.type === 'single' || question.type === 'checkbox') && (
        <div className={`options${question.type === 'single' && question.grid ? ` options-grid${question.gridCols === 3 ? ' cols-3' : ''}` : ''}`}>
          {question.options.map((option) => {
            const selected = question.type === 'checkbox'
              ? Array.isArray(answer) && answer.includes(option)
              : answer === option;
            return (
              <label className="option" key={option}>
                <input
                  type={question.type === 'checkbox' ? 'checkbox' : 'radio'}
                  name={question.id}
                  value={option}
                  checked={selected}
                  onChange={() => {
                    if (question.type === 'checkbox') {
                      const current = Array.isArray(answer) ? answer : [];
                      setAnswer(selected ? current.filter((item) => item !== option) : [...current, option]);
                    } else {
                      setAnswer(option);
                    }
                  }}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      )}
      {question.type === 'rating' && (
        <>
          <div className="rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={answer === value}
                onClick={() => setAnswer(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="rating-labels">
            <span>{question.labels[0]}</span>
            <span>{question.labels[4]}</span>
          </div>
        </>
      )}
      {question.type === 'text' && (
        <textarea
          className="text-input"
          rows={3}
          placeholder={question.placeholder}
          value={typeof answer === 'string' ? answer : ''}
          onChange={(event) => setAnswer(event.target.value)}
        />
      )}
      {(question.type === 'drag-colours' || question.type === 'drag-people') && (
        <DragBoard
          question={question}
          value={((answer ?? {}) as DragMap)}
          picked={picked}
          onPick={setPicked}
          onChange={setAnswer}
        />
      )}
      {error && <p className="muted">{error}</p>}
      <div className="nav-row">
        {step > 0 ? (
          <button className="btn btn-ghost" type="button" onClick={() => setStep(step - 1)}>
            Back
          </button>
        ) : <span />}
        <button
          className="btn btn-primary"
          type="button"
          disabled={!ready || busy}
          onClick={() => {
            if (step === survey.questions.length - 1) void finish();
            else setStep(step + 1);
          }}
        >
          {step === survey.questions.length - 1 ? (busy ? 'Saving…' : 'See results') : 'Next'}
        </button>
      </div>
    </section>
  );
}

function Chip({
  item,
  selected,
  compact,
  onPick,
  onDragId,
}: {
  item: Extract<Question, { type: 'drag-colours' | 'drag-people' }>['items'][number];
  selected: boolean;
  compact?: boolean;
  onPick: () => void;
  onDragId: (id: string) => void;
}) {
  const people = Boolean(item.label);
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      className={`dnd-item ${people ? 'person-chip' : ''} ${item.className ?? ''} ${selected ? 'selected' : ''} ${compact ? 'dnd-item-in-zone' : ''}`}
      aria-label={item.ariaLabel ?? item.label}
      onClick={(event) => {
        event.stopPropagation();
        onPick();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPick();
        }
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', item.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragId(item.id);
      }}
    >
      {item.label ?? item.ariaLabel}
      {item.sub && !compact && <span className="chip-sub">{item.sub}</span>}
    </div>
  );
}

function DragBoard({
  question,
  value,
  picked,
  onPick,
  onChange,
}: {
  question: Extract<Question, { type: 'drag-colours' | 'drag-people' }>;
  value: DragMap;
  picked: string | null;
  onPick: (id: string | null) => void;
  onChange: (value: DragMap) => void;
}) {
  const unique = question.type === 'drag-colours';
  const order = useMemo(() => shuffle(question.items), [question]);
  const unused = order.filter((item) => !value[item.id]);

  function place(zone: string, itemId?: string) {
    const id = itemId ?? picked;
    if (!id) return;
    onChange(assignToZone(value, id, zone, unique));
    onPick(null);
  }

  function returnItem(itemId: string) {
    onChange(removeFromZone(value, itemId));
    onPick(null);
  }

  return (
    <div className="dnd-board">
      <p className="muted">
        {question.type === 'drag-people'
          ? 'Each note has two people (the $5 has one). Drag a name onto a note, or tap a name then tap a note. Tap a placed name to return it.'
          : 'Seven colours, five notes. Leave the two that do not belong in the tray. Drag or tap-then-tap. Tap a placed colour to return it.'}
      </p>
      <div className="dnd-items" aria-label="Unplaced items">
        {unused.map((item) => (
          <Chip
            key={item.id}
            item={item}
            selected={picked === item.id}
            onPick={() => onPick(picked === item.id ? null : item.id)}
            onDragId={onPick}
          />
        ))}
        {unused.length === 0 && question.type === 'drag-people' && (
          <span className="muted">All placed — tap a chip on a note to move it.</span>
        )}
      </div>
      <div className={`zones ${question.type === 'drag-people' ? 'zones-people' : 'zones-colours'}`}>
        {question.zones.map((zone) => {
          const occupants = question.items.filter((item) => value[item.id] === zone);
          return (
            <div
              key={zone}
              className={`zone ${picked ? 'zone-ready' : ''}`}
              onClick={() => place(zone)}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => {
                event.preventDefault();
                place(zone, event.dataTransfer.getData('text/plain'));
              }}
            >
              <strong>${zone}</strong>
              <div className="zone-slots">
                {occupants.map((item) => (
                  <Chip
                    key={item.id}
                    item={item}
                    selected={picked === item.id}
                    compact
                    onPick={() => returnItem(item.id)}
                    onDragId={onPick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

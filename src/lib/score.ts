import type { Answers, Question, SurveyDefinition } from './types';

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

export function isCorrect(question: Question, answer: unknown): boolean {
  if (!question.scored) return false;
  if (question.type === 'single') return answer === question.correct;
  if (question.type === 'checkbox') {
    return Array.isArray(answer) && Array.isArray(question.correct) && sameSet(answer, question.correct);
  }
  if (question.type === 'drag-colours' || question.type === 'drag-people') {
    if (!answer || typeof answer !== 'object') return false;
    const placed = answer as Record<string, string>;
    const keyed = question.items.filter((item) => item.correct);
    return keyed.length > 0 && keyed.every((item) => placed[item.id] === item.correct);
  }
  return false;
}

export function scoreSurvey(survey: SurveyDefinition, answers: Answers): { score: number; max: number } {
  const scored = survey.questions.filter((question) => question.scored);
  const score = scored.filter((question) => isCorrect(question, answers[question.id])).length;
  return { score, max: scored.length };
}

export function correctAnswerText(question: Question): string | null {
  if (!question.scored) return null;
  if (question.type === 'single' && question.correct) return question.correct;
  if (question.type === 'checkbox' && question.correct) return question.correct.join(', ');
  if (question.type === 'drag-colours') {
    const matched = question.items
      .filter((item) => item.correct)
      .map((item) => `$${item.correct} ${item.ariaLabel ?? item.id}`);
    const extras = question.items.filter((item) => !item.correct).map((item) => item.ariaLabel ?? item.id);
    return extras.length
      ? `${matched.join('; ')}. Unused: ${extras.join(', ')}.`
      : matched.join('; ');
  }
  if (question.type === 'drag-people') {
    return question.items.map((item) => `${item.label ?? item.id} → $${item.correct}`).join('; ');
  }
  return null;
}

export type AnswerBit = { text: string; wrong: boolean };

export function answerBits(question: Question, answer: unknown): AnswerBit[] {
  if (answer == null || answer === '') return [{ text: 'No answer', wrong: false }];
  if (question.type === 'drag-colours' || question.type === 'drag-people') {
    const placed = answer as Record<string, string>;
    const bits = question.items
      .filter((item) => placed[item.id])
      .map((item) => {
        const zone = placed[item.id] ?? '';
        const wrong = item.correct ? zone !== item.correct : true;
        return { text: `${item.label ?? item.ariaLabel ?? item.id} → $${zone}`, wrong };
      });
    return bits.length ? bits : [{ text: 'No answer', wrong: false }];
  }
  if (question.type === 'checkbox' && Array.isArray(answer)) {
    if (answer.length === 0) return [{ text: 'No answer', wrong: false }];
    const correct = new Set(question.correct ?? []);
    const scored = Boolean(question.scored && question.correct);
    return answer.map((item) => ({ text: item, wrong: scored && !correct.has(item) }));
  }
  if (question.type === 'single') {
    const text = String(answer);
    return [{ text, wrong: Boolean(question.scored && question.correct && text !== question.correct) }];
  }
  return [{ text: formatAnswer(question, answer), wrong: false }];
}

export function resultTag(question: Question, answer: unknown): string | null {
  if (question.scored) return isCorrect(question, answer) ? 'Correct' : 'Wrong';
  if (question.type === 'rating' || question.type === 'text') return 'Opinion';
  if (question.type === 'demographics') return 'About you';
  return null;
}

export function formatAnswer(question: Question, answer: unknown): string {
  if (answer == null || answer === '') return 'No answer';
  if (question.type === 'demographics' && answer && typeof answer === 'object') {
    return Object.entries(answer as Record<string, string>)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' · ');
  }
  if (Array.isArray(answer)) return answer.join(', ') || 'No answer';
  if (typeof answer === 'number') return String(answer);
  if (question.type === 'drag-colours' || question.type === 'drag-people') {
    const placed = answer as Record<string, string>;
    const bits = question.items
      .filter((item) => placed[item.id])
      .map((item) => `${item.label ?? item.ariaLabel ?? item.id} → $${placed[item.id]}`);
    return bits.join('; ') || 'No answer';
  }
  return String(answer);
}

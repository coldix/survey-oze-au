import { isCorrect } from './score';
import type { Answers, SurveyDefinition } from './types';

export type Tally = { option: string; count: number; percent: number };

export type CommunityQuestion = {
  id: string;
  title: string;
  kind: 'score' | 'tally';
  correctPercent?: number;
  tallies?: Tally[];
};

export type CommunityStats = {
  responses: number;
  averagePercent: number | null;
  averageScore: number | null;
  maxScore: number;
  questions: CommunityQuestion[];
};

function plainTitle(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export function buildCommunityStats(
  survey: SurveyDefinition,
  rows: { answers_json: string; score: number | null; max_score: number | null }[],
): CommunityStats {
  const responses = rows.length;
  const maxScore = survey.questions.filter((question) => question.scored).length;
  const scoreSum = rows.reduce((sum, row) => sum + Number(row.score ?? 0), 0);
  const parsed = rows.map((row) => {
    try {
      return JSON.parse(row.answers_json) as Answers;
    } catch {
      return {} as Answers;
    }
  });

  const questions: CommunityQuestion[] = [];
  for (const question of survey.questions) {
    if (question.scored) {
      const hits = parsed.filter((answers) => isCorrect(question, answers[question.id])).length;
      questions.push({
        id: question.id,
        title: plainTitle(question.question),
        kind: 'score',
        correctPercent: responses === 0 ? 0 : Math.round((hits / responses) * 100),
      });
      continue;
    }
    if (question.type === 'checkbox' && question.options.length) {
      const counts = new Map(question.options.map((option) => [option, 0]));
      for (const answers of parsed) {
        const selected = answers[question.id];
        if (!Array.isArray(selected)) continue;
        for (const option of selected) {
          if (counts.has(option)) counts.set(option, (counts.get(option) ?? 0) + 1);
        }
      }
      questions.push({
        id: question.id,
        title: plainTitle(question.question),
        kind: 'tally',
        tallies: question.options.map((option) => {
          const count = counts.get(option) ?? 0;
          return { option, count, percent: responses === 0 ? 0 : Math.round((count / responses) * 100) };
        }),
      });
    }
  }

  return {
    responses,
    averagePercent: responses === 0 || maxScore === 0 ? null : Math.round((scoreSum / (responses * maxScore)) * 100),
    averageScore: responses === 0 ? null : Math.round((scoreSum / responses) * 10) / 10,
    maxScore,
    questions,
  };
}

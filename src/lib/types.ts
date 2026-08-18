export type NoteZone = '5' | '10' | '20' | '50' | '100';

export type DemoField = {
  id: string;
  label: string;
  options: string[];
};

export type DragItem = {
  id: string;
  label?: string;
  sub?: string;
  ariaLabel?: string;
  className?: string;
  correct?: NoteZone;
};

export type Question =
  | {
      id: string;
      phase: string;
      type: 'demographics';
      scored: false;
      question: string;
      fields: DemoField[];
    }
  | {
      id: string;
      phase: string;
      type: 'single';
      scored: boolean;
      statKey?: string;
      question: string;
      options: string[];
      correct?: string;
      explanation?: string;
      grid?: boolean | 2;
      gridCols?: 2 | 3;
    }
  | {
      id: string;
      phase: string;
      type: 'checkbox';
      scored: boolean;
      statKey?: string;
      question: string;
      options: string[];
      correct?: string[];
      explanation?: string;
    }
  | {
      id: string;
      phase: string;
      type: 'rating';
      scored: false;
      question: string;
      labels: string[];
    }
  | {
      id: string;
      phase: string;
      type: 'text';
      scored: false;
      optional?: boolean;
      question: string;
      placeholder?: string;
    }
  | {
      id: string;
      phase: string;
      type: 'drag-colours' | 'drag-people';
      scored: boolean;
      statKey?: string;
      question: string;
      hint?: string;
      items: DragItem[];
      zones: NoteZone[];
      explanation?: string;
    };

export type SurveyDefinition = {
  slug: string;
  title: string;
  subtitle: string;
  minutes: number;
  version: string;
  questions: Question[];
};

export type AnswerValue =
  | string
  | string[]
  | number
  | Record<string, string>
  | Record<string, string | undefined>;

export type Answers = Record<string, AnswerValue>;

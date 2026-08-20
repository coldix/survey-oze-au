export const SITE = {
  name: 'survey.oze.au',
  tagline: 'Educational surveys from the oze.au family',
  description:
    'Anonymous Australian surveys from oze.au — a monthly Victorian and federal voting poll, a Victoria 2026 issues survey, plus Money in Your Wallet. Results are stored for real.',
  url: 'https://survey.oze.net.au',
  email: 'col@dixon.au',
  hub: 'https://oze.au',
  tracker: 'https://electiontracker.au/',
  ogImage: '/images/og.jpg',
  author: 'Colin Dixon',
};

export const POLL_URL = `${SITE.url}/s/monthly-poll`;
export const MONEY_URL = `${SITE.url}/s/money`;
export const ISSUES_URL = `${SITE.url}/s/vic-issues`;

export const HOME = {
  title: 'survey.oze.au — Australian voting poll and banknote quiz',
  description:
    'Anonymous educational surveys from oze.au. Vote in the monthly Victorian (28 Nov 2026) and federal poll, rank Victoria 2026 issues, or take Money in Your Wallet.',
};

export const MONEY = {
  title: 'Money in Your Wallet — Australian banknote quiz',
  description:
    'How well do you know Australia’s polymer banknotes? Colours, portraits, security features, and the new $5. About five minutes, anonymous, one attempt.',
};

export type FaqItem = { q: string; a: string };

export function faqJsonLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    alternateName: ['survey.oze.net.au', 'oze surveys'],
    url: SITE.url,
    inLanguage: 'en-AU',
    description: SITE.description,
    publisher: {
      '@type': 'Person',
      name: SITE.author,
      email: SITE.email,
      url: SITE.hub,
    },
    isPartOf: { '@type': 'WebSite', name: 'oze.au', url: SITE.hub },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export const POLL_SOCIAL_COPY = `How would you vote — Victoria 28 Nov 2026, and the next federal election?

Take the monthly oze poll (about a minute, one vote per month):
${POLL_URL}

Latest sourced polling and candidates: ${SITE.tracker}`;

export const HOME_FAQ: FaqItem[] = [
  {
    q: 'What is survey.oze.au?',
    a: 'A small reusable survey site in the oze.au family. Each survey is a data file; the runner is shared. Answers are stored in a real database, not simulated. Live host: https://survey.oze.net.au',
  },
  {
    q: 'What surveys are open now?',
    a: 'The monthly voting poll (Victorian election 28 November 2026 and the next federal election), the Victoria 2026 issues survey, and Money in Your Wallet, a quiz on Australian banknotes.',
  },
  {
    q: 'Is the voting poll a scientific poll?',
    a: 'No. It is an open survey. Anyone with the link can answer. For sourced media and pollster averages see https://electiontracker.au/',
  },
  {
    q: 'Are answers anonymous?',
    a: 'We do not ask for your name or email. The poll keeps a postcode and a few demographics plus technical signals used to stop bots. Quiz answers are stored so we can show community tallies.',
  },
];

export const MONEY_FAQ: FaqItem[] = [
  {
    q: 'What is Money in Your Wallet?',
    a: 'A short educational quiz on Australian banknotes: which denominations exist, polymer notes, colours, portraits, birds and plants in the security features, and the Reserve Bank’s plan for the new $5.',
  },
  {
    q: 'Is this official Reserve Bank material?',
    a: 'No. It is an oze educational survey. Facts follow the current RBA polymer series and public RBA announcements. It is not an RBA product.',
  },
  {
    q: 'How long does it take?',
    a: 'About five minutes. One attempt per browser. You get a score at the end and can compare with other respondents.',
  },
  {
    q: 'What data do you keep?',
    a: 'Answers, a score, and optional age group and gender so we can show community tallies. We do not ask for your name or email.',
  },
];

export const ISSUES_FAQ: FaqItem[] = [
  {
    q: 'Is this a scientific poll or a scorecard?',
    a: 'No. It is an open oze survey. Anyone with the link can answer, including people outside Victoria and overseas. The pie counts your own taps. Election Tracker does not rank which party has the best policy, and this is not a voting recommendation.',
  },
  {
    q: 'What is being asked?',
    a: 'How much each of 14 Victorian election issues matters to your vote (1–5), then which of four sourced statements comes closest to your view on 10 of those issues — with party names hidden until the end.',
  },
  {
    q: 'Why only 10 comparisons?',
    a: 'We compare the 10 issues where the Greens, Labor, Coalition and One Nation have said clearly different things, and where Victoria is a real decision-maker. Immigration is federal, so it is not in this survey. Firearms, corruption, debt and native forestry are still on the rating list, not the comparison round.',
  },
  {
    q: 'What does the blind method measure?',
    a: 'What people find persuasive when a policy is stripped of its party label. It measures the appeal of a stated claim — not whether the claim is achievable, costed, or likely to be delivered. For sourced detail see https://electiontracker.au/elections/vic/2026/parties/matrix',
  },
  {
    q: 'Who can answer, and how are results split?',
    a: 'Anyone. Everywhere includes every response (Victoria, the rest of Australia, and overseas). Victoria is respondents with a Victorian postcode (3000–3999 and 8000–8999).',
  },
  {
    q: 'How often can I answer?',
    a: 'Once per browser per calendar month, from August 2026 through election day 28 November 2026. Friends on the same wifi can each take it.',
  },
];

export const POLL_FAQ: FaqItem[] = [
  {
    q: 'Is this a scientific poll?',
    a: 'No. It is an open oze survey. Anyone with the link can answer. Results are not weighted to the electoral roll and are not a forecast of election day. August 2026 charts start with a single count of 1,000 votes set to the Election Tracker average; live votes are added on top.',
  },
  {
    q: 'What is being asked?',
    a: 'One survey each month: how you would vote at the Victorian state election on 28 November 2026, and how you would vote at the next federal election. We treat that federal answer as your vote for both houses.',
  },
  {
    q: 'Where can I see proper published polling?',
    a: 'Election Tracker collects sourced media and pollster surveys with a transparent average: https://electiontracker.au/',
  },
  {
    q: 'How often can I answer?',
    a: 'Once per person per calendar month, from August 2026 through election day 28 November 2026.',
  },
  {
    q: 'Why do you ask for a postcode?',
    a: 'Victorian pies only include Victorian postcodes (3xxx). Federal pies are national and also broken down by state.',
  },
  {
    q: 'What data do you keep?',
    a: 'Answers, postcode, age group, gender, enrolment, and technical signals used to stop bots (including IP address). We do not ask for your name or email.',
  },
];

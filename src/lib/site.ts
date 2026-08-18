export const SITE = {
  name: 'survey.oze.au',
  tagline: 'Educational surveys from the oze.au family',
  description: 'Anonymous, reusable surveys — far better than a Google Form.',
  url: 'https://survey.oze.net.au',
  email: 'col@dixon.au',
  hub: 'https://oze.au',
  tracker: 'https://electiontracker.au/',
};

export const POLL_URL = `${SITE.url}/s/monthly-poll`;

export const POLL_SOCIAL_COPY = `How would you vote — Victoria 28 Nov 2026, and the next federal election?

Take the monthly oze poll (about a minute, one vote per month):
${POLL_URL}

Latest sourced polling and candidates: ${SITE.tracker}`;

export const POLL_FAQ = [
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

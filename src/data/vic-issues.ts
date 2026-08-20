/** Public snapshot — no party claims. Refresh with `node scripts/sync-issues.mjs --write`. */
export type Jurisdiction = 'state_primary' | 'shared_fed_state' | 'federal_primary' | 'local_primary' | 'shared_state_local';

export type VicIssue = {
  slug: string;
  name: string;
  summary: string;
  jurisdiction: Jurisdiction;
  chip: string;
  rated: boolean;
  compared: boolean;
  comparisonUrl: string;
};

export const VIC_ISSUES: VicIssue[] = [
  {
    "slug": "cost-of-living",
    "name": "Cost of Living",
    "summary": "Household expenses such as energy bills, rents, transport fares, food prices and state taxes and charges.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "rated": true,
    "compared": true,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/cost-of-living"
  },
  {
    "slug": "energy",
    "name": "Energy",
    "summary": "Electricity and gas supply, prices, generation mix, networks and consumer protections in Victoria.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "rated": true,
    "compared": true,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/energy"
  },
  {
    "slug": "education",
    "name": "Education",
    "summary": "Public schools, curriculum within state systems, TAFE and early childhood services run or regulated by Victoria.",
    "jurisdiction": "state_primary",
    "chip": "State",
    "rated": true,
    "compared": true,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/education"
  },
  {
    "slug": "immigration",
    "name": "Immigration",
    "summary": "Who may enter and stay in Australia, permanent migration settings and citizenship — largely Commonwealth powers.",
    "jurisdiction": "federal_primary",
    "chip": "Federal",
    "rated": false,
    "compared": false,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/immigration"
  },
  {
    "slug": "crime-justice",
    "name": "Crime & Justice",
    "summary": "Policing, courts, corrections, youth justice and criminal law in Victoria.",
    "jurisdiction": "state_primary",
    "chip": "State",
    "rated": true,
    "compared": true,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/crime-justice"
  },
  {
    "slug": "firearms-policy",
    "name": "Firearms Policy",
    "summary": "Firearm licensing, ownership rules, categories, storage, enforcement, trafficking and lawful sporting, hunting and farming use in Victoria.",
    "jurisdiction": "state_primary",
    "chip": "State",
    "rated": true,
    "compared": false,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/firearms-policy"
  },
  {
    "slug": "corruption",
    "name": "Corruption",
    "summary": "Integrity bodies, political donation rules, lobbying transparency and public-sector integrity in Victoria.",
    "jurisdiction": "state_primary",
    "chip": "State",
    "rated": true,
    "compared": false,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/corruption"
  },
  {
    "slug": "debt-budget",
    "name": "Debt & Budget",
    "summary": "Victorian state budget balance, net debt, taxes and major expenditure priorities of the State of Victoria.",
    "jurisdiction": "state_primary",
    "chip": "State",
    "rated": true,
    "compared": false,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/debt-budget"
  },
  {
    "slug": "environment-forestry",
    "name": "Environment & Forestry",
    "summary": "Land use, forests, native vegetation, pollution regulation and environmental approvals in Victoria.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "rated": true,
    "compared": false,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/environment-forestry"
  },
  {
    "slug": "gender-social",
    "name": "Gender Equality & Social Policy",
    "summary": "Anti-discrimination law, family-violence responses, LGBTQIA+ policy and related social legislation in Victoria.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "rated": true,
    "compared": true,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/gender-social"
  },
  {
    "slug": "climate-biodiversity",
    "name": "Climate & Biodiversity",
    "summary": "Emissions-reduction targets, climate adaptation, threatened species and biodiversity programs affecting Victoria.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "rated": true,
    "compared": true,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/climate-biodiversity"
  },
  {
    "slug": "aboriginal-affairs",
    "name": "Aboriginal Affairs & Reconciliation",
    "summary": "Treaty, truth-telling, self-determination policy and Aboriginal services in the Victorian jurisdiction.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "rated": true,
    "compared": true,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/aboriginal-affairs"
  },
  {
    "slug": "housing-planning",
    "name": "Housing & Planning",
    "summary": "Housing supply, social housing, renting rules and land-use planning across Victoria.",
    "jurisdiction": "shared_state_local",
    "chip": "State / local",
    "rated": true,
    "compared": true,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/housing-planning"
  },
  {
    "slug": "health-hospitals",
    "name": "Health & Hospitals",
    "summary": "Public hospitals, ambulance services and state-run health systems in Victoria.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "rated": true,
    "compared": true,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/health-hospitals"
  },
  {
    "slug": "infrastructure-transport",
    "name": "Infrastructure & Transport",
    "summary": "Roads, public transport, major projects and freight networks within Victoria.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "rated": true,
    "compared": true,
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/infrastructure-transport"
  }
];

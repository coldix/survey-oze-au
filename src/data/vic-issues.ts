/** Committed snapshot of Vic 2026 matrix issues. Refresh with `node scripts/sync-issues.mjs --write`. */
export type Jurisdiction = 'state_primary' | 'shared_fed_state' | 'federal_primary' | 'local_primary' | 'shared_state_local';

export type DisplayPartyId = 'greens' | 'labor' | 'coalition' | 'one-nation';

export type VicIssue = {
  slug: string;
  name: string;
  summary: string;
  jurisdiction: Jurisdiction;
  chip: string;
  comparisonUrl: string;
  headlines: Record<DisplayPartyId, string | null>;
};

export const VIC_ISSUES: VicIssue[] = [
  {
    "slug": "cost-of-living",
    "name": "Cost of Living",
    "summary": "Household expenses such as energy bills, rents, transport fares, food prices and state taxes and charges.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/cost-of-living",
    "headlines": {
      "greens": "Permanent free public transport, rent caps and action on price gouging",
      "labor": "Transport rebates, fuel price controls and targeted household concessions",
      "coalition": "Scrap the emergency levy, abolish first-home stamp duty and repeal selected state taxes",
      "one-nation": "Remove insurance duty, end renewable subsidies and redirect wasteful spending"
    }
  },
  {
    "slug": "energy",
    "name": "Energy",
    "summary": "Electricity and gas supply, prices, generation mix, networks and consumer protections in Victoria.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/energy",
    "headlines": {
      "greens": "100% renewable energy by 2030, public infrastructure and no new coal or gas",
      "labor": "Free midday power, legislated renewable targets and storage-backed reliability",
      "coalition": "Reverse the gas ban; urban solar parks; review major transmission projects",
      "one-nation": "Coal, gas, nuclear and hydro with no new renewable subsidies"
    }
  },
  {
    "slug": "education",
    "name": "Education",
    "summary": "Public schools, curriculum within state systems, TAFE and early childhood services run or regulated by Victoria.",
    "jurisdiction": "state_primary",
    "chip": "State",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/education",
    "headlines": {
      "greens": "Restore school funding, make public education genuinely free and strengthen TAFE",
      "labor": "Free Kinder and TAFE, new schools and disability inclusion",
      "coalition": "Literacy and Numeracy Guarantee, early specialist support and repeal of the schools tax",
      "one-nation": "Back-to-basics curriculum, parental control and stronger discipline"
    }
  },
  {
    "slug": "immigration",
    "name": "Immigration",
    "summary": "Who may enter and stay in Australia, permanent migration settings and citizenship — largely Commonwealth powers.",
    "jurisdiction": "federal_primary",
    "chip": "Federal",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/immigration",
    "headlines": {
      "greens": "Federal policy — expand humanitarian intake; prioritise family reunion",
      "labor": "Federal policy — 185,000 permanent places with an onshore and skilled focus",
      "coalition": "Federal policy — cap migration by housing supply and tighten visa standards",
      "one-nation": "Federal policy — cut visas; deport unlawful non-residents"
    }
  },
  {
    "slug": "crime-justice",
    "name": "Crime & Justice",
    "summary": "Policing, courts, corrections, youth justice and criminal law in Victoria.",
    "jurisdiction": "state_primary",
    "chip": "State",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/crime-justice",
    "headlines": {
      "greens": "Justice reinvestment, bail support and stronger rights in police custody",
      "labor": "Tougher bail and youth sentencing alongside permanent violence prevention",
      "coalition": "Liberal: Safer Communities Plan — police, bail, Adult Crime Adult Time · Nationals: Coalition Safer Communities Plan (shared with Liberals)",
      "one-nation": "Tougher bail and sentencing for repeat youth offenders"
    }
  },
  {
    "slug": "firearms-policy",
    "name": "Firearms Policy",
    "summary": "Firearm licensing, ownership rules, categories, storage, enforcement, trafficking and lawful sporting, hunting and farming use in Victoria.",
    "jurisdiction": "state_primary",
    "chip": "State",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/firearms-policy",
    "headlines": {
      "greens": "Ownership limits, tighter licence checks and restrictions on high-risk firearms",
      "labor": "Stronger licensing checks, permanent prohibition orders and tougher trafficking penalties",
      "coalition": "Nationals: Target criminal access while protecting licensed farmers, hunters and sporting shooters",
      "one-nation": "Streamline lawful ownership, review the NFA and strengthen penalties for criminal use"
    }
  },
  {
    "slug": "corruption",
    "name": "Corruption",
    "summary": "Integrity bodies, political donation rules, lobbying transparency and public-sector integrity in Victoria.",
    "jurisdiction": "state_primary",
    "chip": "State",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/corruption",
    "headlines": {
      "greens": "Broader IBAC powers, independent integrity funding and political-transparency reforms",
      "labor": "Retrospective follow-the-money powers and broader IBAC reform",
      "coalition": "Royal commission, stronger IBAC powers and a construction-sector watchdog",
      "one-nation": "Royal commission into CFMEU Big Build contracts and stronger transparency"
    }
  },
  {
    "slug": "debt-budget",
    "name": "Debt & Budget",
    "summary": "Victorian state budget balance, net debt, taxes and major expenditure priorities of the State of Victoria.",
    "jurisdiction": "state_primary",
    "chip": "State",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/debt-budget",
    "headlines": {
      "greens": "Progressive property and bank taxes, public financing and a wellbeing budget",
      "labor": "Operating surpluses while net debt rises in dollars but falls relative to the economy",
      "coalition": "Back-office hiring freeze, cash surplus by 2032 and tighter expenditure controls",
      "one-nation": "Spending review, lower debt and a phase-out of payroll tax"
    }
  },
  {
    "slug": "environment-forestry",
    "name": "Environment & Forestry",
    "summary": "Land use, forests, native vegetation, pollution regulation and environmental approvals in Victoria.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/environment-forestry",
    "headlines": {
      "greens": "Close logging loopholes and restore native forests",
      "labor": "End native timber harvesting, restore habitat and expand forest recreation",
      "coalition": "Liberal: Agricultural impact tests, landholder protections and a bushfire inquiry · Nationals: Agricultural impact tests, landholder protections and restoration of native forestry",
      "one-nation": "Practical conservation, fire mitigation and support for forestry"
    }
  },
  {
    "slug": "gender-social",
    "name": "Gender Equality & Social Policy",
    "summary": "Anti-discrimination law, family-violence responses, LGBTQIA+ policy and related social legislation in Victoria.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/gender-social",
    "headlines": {
      "greens": "Reproductive leave, family-violence services and LGBTIQA+ protections",
      "labor": "Family violence reform, gender-responsive budgeting and LGBTIQA+ equality",
      "coalition": "Criminalise coercive control and establish a domestic-violence disclosure scheme",
      "one-nation": "Roll back school gender programs and prioritise sex-based protections"
    }
  },
  {
    "slug": "climate-biodiversity",
    "name": "Climate & Biodiversity",
    "summary": "Emissions-reduction targets, climate adaptation, threatened species and biodiversity programs affecting Victoria.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/climate-biodiversity",
    "headlines": {
      "greens": "Climate-resilience funding, no new coal or gas and stronger nature laws",
      "labor": "Net zero by 2045 with legislated interim targets and a 2026–30 climate strategy",
      "coalition": "Federal policy — remove Net Zero target from legislation",
      "one-nation": "Oppose Net Zero while funding practical conservation and restoration"
    }
  },
  {
    "slug": "aboriginal-affairs",
    "name": "Aboriginal Affairs & Reconciliation",
    "summary": "Treaty, truth-telling, self-determination policy and Aboriginal services in the Victorian jurisdiction.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/aboriginal-affairs",
    "headlines": {
      "greens": "Support Treaty, self-determination and stronger land and cultural-heritage rights",
      "labor": "Implement Victoria's Statewide Treaty and Gellung Warl institutions",
      "coalition": "Repeal the Statewide Treaty framework within 100 days",
      "one-nation": "Oppose and repeal Victoria's Statewide Treaty framework"
    }
  },
  {
    "slug": "housing-planning",
    "name": "Housing & Planning",
    "summary": "Housing supply, social housing, renting rules and land-use planning across Victoria.",
    "jurisdiction": "shared_state_local",
    "chip": "State / local",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/housing-planning",
    "headlines": {
      "greens": "Rent controls, 88,000 public homes, stamp-duty reform and affordable-housing rules",
      "labor": "Social housing investment, activity-centre density and faster approvals",
      "coalition": "Fast-track growth areas, expand inner-city housing and restore local planning input",
      "one-nation": "Reduce demand, release land and cut taxes and planning delays"
    }
  },
  {
    "slug": "health-hospitals",
    "name": "Health & Hospitals",
    "summary": "Public hospitals, ambulance services and state-run health systems in Victoria.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/health-hospitals",
    "headlines": {
      "greens": "Universal public healthcare, more mental-health clinicians and expanded treatment capacity",
      "labor": "Record health funding, hospital capacity and free care outside emergency departments",
      "coalition": "$850m West Gippsland hospital, free MenB vaccination and repeal of the GP tax",
      "one-nation": "Expand the health workforce and rebuild Rosebud Hospital through a PPP"
    }
  },
  {
    "slug": "infrastructure-transport",
    "name": "Infrastructure & Transport",
    "summary": "Roads, public transport, major projects and freight networks within Victoria.",
    "jurisdiction": "shared_fed_state",
    "chip": "Shared",
    "comparisonUrl": "https://electiontracker.au/elections/vic/2026/policies/infrastructure-transport",
    "headlines": {
      "greens": "Permanent free public transport, more frequent services and safer active transport",
      "labor": "Roads blitz, locally built trains and regional freight maintenance",
      "coalition": "$5bn roads program, regional Fair Share Guarantee and a pause on the SRL",
      "one-nation": "Regional roads and services, restrained major-project spending and PPP delivery"
    }
  }
];

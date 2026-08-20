/** Worker-only claims. Do not import from React islands. */
export type ClaimParty = 'grn' | 'alp' | 'lnp' | 'onp';

export const MATRIX_HASH = "58f822141f09b089d2ce3fb3eee510a929314f390c87e4b8c0d8cecf04b523f9";

export const ISSUE_SET = ["cost-of-living","energy","education","crime-justice","gender-social","climate-biodiversity","aboriginal-affairs","housing-planning","health-hospitals","infrastructure-transport"] as const;

export const BLIND_CLAIMS: Record<string, Record<ClaimParty, string>> = {
  "cost-of-living": {
    "grn": "Free public transport and rent caps",
    "alp": "Transport rebates and fuel controls",
    "lnp": "Scrap emergency levy and stamp duty",
    "onp": "Cut insurance duty and energy subsidies"
  },
  "energy": {
    "grn": "100% renewables by 2030",
    "alp": "Free midday power",
    "lnp": "Reverse the gas ban",
    "onp": "Coal, gas, nuclear — no new subsidies"
  },
  "education": {
    "grn": "Make public education free",
    "alp": "Free Kinder and TAFE",
    "lnp": "Literacy first, repeal the schools tax",
    "onp": "Back-to-basics and parental control"
  },
  "crime-justice": {
    "grn": "Justice reinvestment, not more jail",
    "alp": "Tougher bail and youth sentences",
    "lnp": "Tougher bail, adult time for youth crime",
    "onp": "Tougher bail for repeat youth offenders"
  },
  "gender-social": {
    "grn": "Reproductive leave and LGBTIQA+ protections",
    "alp": "Family-violence reform and equality laws",
    "lnp": "Criminalise coercive control",
    "onp": "End school gender programs"
  },
  "climate-biodiversity": {
    "grn": "No new coal or gas",
    "alp": "Net zero by 2045",
    "lnp": "Remove the Net Zero target",
    "onp": "Oppose Net Zero"
  },
  "aboriginal-affairs": {
    "grn": "Support Treaty and self-determination",
    "alp": "Implement Statewide Treaty",
    "lnp": "Repeal Treaty within 100 days",
    "onp": "Repeal Statewide Treaty"
  },
  "housing-planning": {
    "grn": "Rent controls and 88,000 public homes",
    "alp": "Social housing and denser activity centres",
    "lnp": "Fast-track growth, restore local planning",
    "onp": "Cut demand, release land, faster approvals"
  },
  "health-hospitals": {
    "grn": "Universal public healthcare",
    "alp": "More hospital beds, free non-ED care",
    "lnp": "New regional hospital, repeal GP tax",
    "onp": "More clinicians, PPP hospital rebuild"
  },
  "infrastructure-transport": {
    "grn": "Permanent free public transport",
    "alp": "Roads blitz and locally built trains",
    "lnp": "$5bn roads, pause the SRL",
    "onp": "Regional roads, restrain mega-projects"
  }
};

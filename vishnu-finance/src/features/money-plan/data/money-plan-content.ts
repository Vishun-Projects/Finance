import { DATA, fmt } from './money-plan';
import { DEFAULT_SCALED_PLAN, type ScaledMoneyPlanView } from '@/lib/plan-income';

export type InstrumentPriority = 'high' | 'medium' | 'low';

export interface SavingsInstrument {
  name: string;
  where: string;
  rate: string;
  liquidity: string;
  taxed: string;
  use: string;
  priority: InstrumentPriority;
  pros: string[];
  cons: string[];
}

export interface InvestmentInstrument {
  name: string;
  type: string;
  recommended: string;
  platform: string;
  returns: string;
  expense: string;
  risk: string;
  lock: string;
  tax: string;
  amount: string;
  verdict: string;
  priority: InstrumentPriority;
  pros: string[];
  cons: string[];
}

export type InsurancePriority = 'URGENT' | 'HIGH' | 'MEDIUM';
export type InsuranceTagColor = 'red' | 'yellow' | 'blue';

export interface ClaimProcessSection {
  steps: string[];
  tip: string;
}

export interface ClaimProcess {
  cashless: ClaimProcessSection;
  reimbursement: ClaimProcessSection;
  helplines: Record<string, string>;
  timeline: string;
  taxBenefit: string;
}

export interface InsurancePlanOption {
  name: string;
  highlight: boolean;
  note: string;
  csr: string;
  premium: string;
}

export interface InsurancePlan {
  id: string;
  type: string;
  subtitle: string;
  priority: InsurancePriority;
  tagColor: InsuranceTagColor;
  amount: string;
  amountMummy?: string;
  amountPapa?: string;
  cover: string;
  coverageDetails: Record<string, string>;
  notCovered: string[];
  claimProcess: ClaimProcess;
  options: InsurancePlanOption[];
  caNote: string;
  familyFloaterNote?: string;
}

export interface RoadmapTask {
  id: string;
  text: string;
  urgent: boolean;
}

export interface RoadmapMonth {
  label: string;
  tasks: RoadmapTask[];
}

export interface ResearchSource {
  label: string;
  url: string;
}

export interface ResearchDecision {
  id: string;
  topic: string;
  tag: string;
  tagColor: string;
  decision: string;
  reasoning: string[];
  alternatives: string;
  sources: ResearchSource[];
}

export interface ResearchNewsItem {
  name: string;
  url: string;
  desc: string;
}

export interface ResearchNewsCategory {
  category: string;
  items: ResearchNewsItem[];
}

export interface InsurancePremiumAgeRow {
  age: string;
  mummy: string;
  papa: string;
  note: string;
  col: string;
}

export interface ReresearchScheduleItem {
  when: string;
  what: string;
}

export function getSavingsInstruments(plan: ScaledMoneyPlanView = DEFAULT_SCALED_PLAN): SavingsInstrument[] {
  return [
    {
      name: 'High-Yield Savings Account',
      where: 'IDFC First / Kotak 811',
      rate: '6–7%',
      liquidity: 'Instant',
      taxed: 'Yes (income slab)',
      use: `Emergency fund parking — target ${fmt(150000)}–${fmt(200000)} liquid within 24 hrs. Salary account se alag rakh.`,
      priority: 'high',
      pros: ['Instant withdrawal', '7% (vs SBI 3.5%)', 'No lock-in'],
      cons: ['Interest taxable', 'Rate can change', 'Not investment-grade'],
    },
    {
      name: 'Liquid Mutual Fund',
      where: 'Parag Parikh / HDFC Liquid via Kuvera',
      rate: '6.5–7.5%',
      liquidity: 'T+1 day',
      taxed: 'Yes (slab rate <3yr)',
      use: 'Better emergency fund option for amount above ₹1L. T+1 redemption, slightly higher yield than savings.',
      priority: 'high',
      pros: ['Higher than savings', 'T+1 redemption', 'No exit load >7 days'],
      cons: ['Not instant', 'Taxed at slab', 'Minor market risk'],
    },
    {
      name: 'Fixed Deposit (FD)',
      where: 'SBI / HDFC / ICICI',
      rate: '7–7.5%',
      liquidity: '7-day penalty break',
      taxed: 'Yes (TDS >₹40k/yr)',
      use: `Short-term goals only — laptop, travel, 6–12 months. Current goal FD: ${fmt(plan.shortTermFd)}/mo.`,
      priority: 'medium',
      pros: ['Guaranteed', '7.5% on select tenures', 'Bank-safe'],
      cons: ['Penalty on break', 'Fully taxable', 'Barely beats inflation'],
    },
    {
      name: 'Recurring Deposit (RD)',
      where: 'Any bank',
      rate: '6.5–7%',
      liquidity: 'Lock-in till maturity',
      taxed: 'Yes',
      use: 'Only if forced saving chahiye. Otherwise Liquid Fund better.',
      priority: 'low',
      pros: ['Forced saving', 'Predictable', 'Bank-safe'],
      cons: ['Lower than FD', 'Lock-in', 'No flexibility'],
    },
  ];
}

export function getInvestmentInstruments(plan: ScaledMoneyPlanView = DEFAULT_SCALED_PLAN): InvestmentInstrument[] {
  return [
    {
      name: 'Nifty 50 Index Fund',
      type: 'Mutual Fund — Passive',
      recommended: 'UTI Nifty 50 / Nippon India Nifty 50 (Direct Plan)',
      platform: 'Kuvera (free) or Zerodha Coin',
      returns: '12–14% CAGR (historical)',
      expense: '0.10–0.20%',
      risk: 'Medium',
      lock: 'None',
      tax: 'LTCG 12.5% after ₹1.25L gains/yr',
      amount: `${fmt(plan.sip)}/mo SIP`,
      verdict: `CORE — backbone hai teri. Age ${plan.age} pe ${fmt(plan.sip)}/mo SIP → ~${plan.sipProjection40} at 40 (12% assumed). Passive AUM crossed ₹14 lakh cr March 2026.`,
      priority: 'high',
      pros: ['0.10–0.20% cost', 'Market returns', 'No manager bias', '13%+ 10yr avg'],
      cons: ['Can dip 30–40% crash', 'No outperformance', 'Needs 7–10yr patience', 'Not short-term'],
    },
    {
      name: 'PPF — Public Provident Fund',
      type: 'Government Savings Scheme',
      recommended: 'SBI YONO / HDFC / ICICI Bank',
      platform: 'Bank netbanking — 10 min',
      returns: `${DATA.ppfRate} tax-free (FY 2026-27)`,
      expense: 'Zero',
      risk: 'Zero',
      lock: '15yr (partial after 5yr)',
      tax: 'EEE — invest, earn, withdraw sab tax-free',
      amount: `${fmt(plan.ppf)}/mo = ${fmt(plan.ppf * 12)}/yr`,
      verdict: `MUST HAVE — ${DATA.ppfRate} tax-free = 10%+ effective for 20% bracket. Max limit ${DATA.ppfMax} in 2026.`,
      priority: 'high',
      pros: ['Zero risk', `${DATA.ppfRate} tax-free`, '80C benefit', 'Sovereign backed'],
      cons: ['15yr lock-in', `Max ${DATA.ppfMax}`, 'No full early exit'],
    },
    {
      name: 'Direct Equity — Blue Chip Stocks',
      type: 'Direct Stocks',
      recommended: 'TCS, Infosys, HDFC Bank, Reliance, ITC',
      platform: 'Zerodha Kite',
      returns: '0% to 30%+ (unpredictable)',
      expense: 'Brokerage + STT',
      risk: 'High',
      lock: 'None',
      tax: 'LTCG 12.5% (>1yr), STCG 20% (<1yr)',
      amount: `${fmt(plan.stocks)}/mo max`,
      verdict: `LEARNING phase. Blue chips se shuru. ${fmt(plan.stocks)} se zyada mat lagao — ye paisa kho sakte ho. (Was ₹2,500 — trimmed to fund real insurance costs.)`,
      priority: 'medium',
      pros: ['High return potential', 'No exit load', 'Dividends'],
      cons: ['Can lose 50%+ crash', 'Emotions hurt', 'Research needed'],
    },
    {
      name: 'Short-Term FD / Goal Fund',
      type: 'Fixed Deposit',
      recommended: 'SBI / HDFC Bank',
      platform: 'Bank app',
      returns: '7–7.5% p.a.',
      expense: 'Zero',
      risk: 'Zero',
      lock: '6–12 months',
      tax: 'Taxed as income',
      amount: `${fmt(plan.shortTermFd)}/mo`,
      verdict: 'Short-term goals — laptop, course, trip. 6 months mein ~₹14k ready.',
      priority: 'medium',
      pros: ['Guaranteed', 'Goal-linked', 'Safe'],
      cons: ['Taxable', 'Barely beats inflation', 'Penalty on break'],
    },
    {
      name: 'NPS — National Pension System',
      type: 'Pension Scheme',
      recommended: 'Tier 1 — HDFC / SBI Pension Fund',
      platform: 'eNPS portal',
      returns: '10–12% (market-linked)',
      expense: '0.01%',
      risk: 'Medium',
      lock: 'Till age 60',
      tax: 'Extra ₹50k deduction 80CCD(1B)',
      amount: 'Start at 26–28',
      verdict: 'LATER — jab salary 10 LPA+ ho. Lock-in bahut lamba hai abhi.',
      priority: 'low',
      pros: ['₹50k extra 80CCD', '0.01% cheapest', 'Good returns'],
      cons: ['Locked till 60', '40% annuity on exit', 'Low liquidity'],
    },
  ];
}

export function getInsurancePlans(plan: ScaledMoneyPlanView = DEFAULT_SCALED_PLAN): InsurancePlan[] {
  const premiums = {
    parentsMummy: plan.parentsMummy,
    parentsPapa: plan.parentsPapa,
    term: plan.termPremium,
    ownHealth: plan.ownHealth,
    pa: plan.pacover,
  };

  return [
    {
      id: 'parents',
      type: 'Parents Health Insurance',
      subtitle: `Mummy (${plan.parents.mummy}) · Papa (${plan.parents.papa})`,
      priority: 'URGENT',
      tagColor: 'red',
      amountMummy: `${fmt(premiums.parentsMummy)}/mo (${fmt(premiums.parentsMummy * 12)}/yr)`,
      amountPapa: `${fmt(premiums.parentsPapa)}/mo (${fmt(premiums.parentsPapa * 12)}/yr)`,
      amount: `${fmt(premiums.parentsMummy + premiums.parentsPapa)}/mo combined`,
      cover: '₹10 Lakh each — individual policies (NOT family floater)',
      coverageDetails: {
        sumInsured: '₹10,00,000 per person',
        roomRent: 'Single private AC room (no sub-limit — Care Freedom)',
        icu: 'Covered in full — no separate ICU cap',
        preHosp: '30 days before admission',
        postHosp: '60 days after discharge',
        daycare: 'All 541+ daycare procedures (dialysis, chemo, cataract etc.)',
        restoration: '100% restoration once per year (Care Freedom)',
        ambulance: 'Up to ₹3,000 per hospitalisation',
        domiciliary: 'Home treatment covered if hospitalisation not possible',
        ayush: 'Covered (AYUSH inpatient)',
        annualCheckup: 'Free health check-up every year',
        coPay: 'ZERO co-pay on BP/diabetes (Care Freedom). Star Red Carpet: 30% co-pay Year 1.',
        pedWait: 'Care Freedom: 2yr wait for pre-existing. Star Red Carpet: 12 months (industry lowest).',
        mentalHealth: 'Covered (IRDAI 2025 mandate)',
      },
      notCovered: [
        'Self-inflicted injuries',
        'Cosmetic / aesthetic surgery',
        'War, nuclear perils',
        'Experimental treatments',
        'Alcohol/drug-related treatment',
        'Non-allopathic OPD',
        'Dental OPD (routine)',
        'Spectacles / hearing aids (OPD)',
        'Congenital diseases in first 2 years',
      ],
      claimProcess: {
        cashless: {
          steps: [
            'Admit at network hospital (Care: 9,400+, Star: 14,000+, Niva Bupa: 10,000+)',
            'Show policy card / Aadhaar at insurance desk',
            'Fill pre-authorisation form at TPA counter',
            'Insurer approves within 2–4 hours (emergency: 1 hr)',
            'Treatment done — hospital bills insurer directly',
            'You pay only non-covered items (OPD meds, food)',
            'Discharge summary collect karo — keep for records',
          ],
          tip: 'Emergency mein pehle treat karao. Notification 24 hrs mein de sakte ho.',
        },
        reimbursement: {
          steps: [
            'Get treated at any hospital (network ya non-network)',
            'Collect ALL original bills, receipts, reports, prescriptions',
            'Fill claim form (available on insurer app/website)',
            'Submit within 15 days of discharge',
            'Insurer processes in 7–30 days',
            'NEFT to registered bank account',
          ],
          tip: 'Non-network hospital mein reimbursement hoga — cashless nahi. 15-day deadline miss mat karna.',
        },
        helplines: {
          Care: '1800-102-4499',
          'Star Health': '1800-425-2255',
          'Niva Bupa': '1860-500-8888',
        },
        timeline: 'Cashless: approved in 2–4 hrs. Reimbursement: 7–30 days.',
        taxBenefit: `80D: ₹25,000/yr for parents under 60. Jumps to ₹50,000/yr once parents turn 60. (Mummy turns 60 in ${60 - plan.parents.mummy} years, Papa in ${60 - plan.parents.papa} years.)`,
      },
      options: [
        {
          name: 'Care Health Freedom / Supreme Senior',
          highlight: true,
          note: `Best value. No co-pay on BP/diabetes. CSR: ${DATA.careCSR}.`,
          csr: DATA.careCSR,
          premium: '₹20–28k/yr each',
        },
        {
          name: 'Star Health Senior Citizen Red Carpet',
          highlight: false,
          note: `Best if pre-existing condition hai. 12-month PED wait. CSR: ${DATA.starCSR}. 30% co-pay Year 1.`,
          csr: DATA.starCSR,
          premium: '₹18–25k/yr each',
        },
        {
          name: 'Niva Bupa Senior First (Platinum)',
          highlight: false,
          note: `2-yr PED wait. Good for healthy parents. Unlimited recharge. CSR: ${DATA.nivaBupaCSR}.`,
          csr: DATA.nivaBupaCSR,
          premium: '₹22–30k/yr each',
        },
      ],
      caNote: `IMMEDIATELY lo. ${plan.parents.mummy} aur ${plan.parents.papa} — window 3–4 saal mein band ho jaayegi jab premium ₹50k+/yr per person ho jaayega.`,
      familyFloaterNote:
        'Family floater avoid — agar dono hospitalize hue ek saal mein toh ₹10L split hoga. Individual = ₹10L each.',
    },
    {
      id: 'term',
      type: 'Term Life Insurance',
      subtitle: `Vishnu (${plan.age}) — ₹1 Crore cover`,
      priority: 'HIGH',
      tagColor: 'yellow',
      amount: `${fmt(premiums.term)}/mo (~${fmt(premiums.term * 12)}/yr)`,
      cover: '₹1,00,00,000 (₹1 Crore) death benefit',
      coverageDetails: {
        sumInsured: '₹1,00,00,000 (₹1 Crore) to nominee on death',
        deathBenefit: 'Lump sum payout on any death (natural or accidental) during policy term',
        accidentalDeath: 'Optional rider — additional ₹50L on accidental death',
        terminalIllness: 'Accelerated payout on terminal illness diagnosis (Max Life, Tata AIA)',
        criticalIllness: 'Optional CI rider — cancer, heart attack, stroke, kidney failure etc.',
        waiver: 'Premium waiver rider on permanent disability — add this!',
        policyTerm: '35 years recommended (age 23 → 58)',
        maturity: 'NO maturity benefit — pure term = no money back on survival (that\'s correct)',
      },
      notCovered: [
        'Suicide within 12 months (only 80% premium returned to nominee)',
        'Death under influence of alcohol/drugs',
        'Death in illegal activities',
        'Non-disclosure of pre-existing illness at buying — claim WILL be rejected',
        'War / nuclear perils',
      ],
      claimProcess: {
        cashless: {
          steps: [
            'This is life insurance — no cashless. Claim = lump sum to nominee on death.',
            'Nominee informs insurer within 30 days of death',
            'Call helpline or visit nearest branch',
            'Documents: death certificate, original policy bond, claimant ID proof, bank passbook',
            'For accidental death: add FIR copy + post-mortem report',
            'Fill claim form (insurer website/app)',
            `Insurer investigates (7–15 days), then pays within 30 days of all docs`,
          ],
          tip: `Nominee (parent / future spouse) must know: policy number, insurer name, helpline. Keep policy doc in locker. CSR ${DATA.maxLifeCSR} = 99 out of 100 claims settled.`,
        },
        reimbursement: {
          steps: [
            'Early claim (<3 years of policy): insurer investigates medical history thoroughly',
            'Late claim (>3 years): much easier, usually settled without investigation',
            'Keep policy documents accessible — locker + digital scan with family',
          ],
          tip: 'Non-disclosure (hiding smoking, illness) = claim rejected. Always disclose honestly at buying.',
        },
        helplines: {
          'Max Life': '1860-120-5577',
          'HDFC Life': '1860-267-9999',
          'Tata AIA': '1860-266-9966',
        },
        timeline: `Death claim: 30 days from document submission. Max Life CSR ${DATA.maxLifeCSR} = best in India 2026.`,
        taxBenefit: '80C: premium deductible up to ₹1.5L. Death benefit: 100% tax-free under Section 10(10D).',
      },
      options: [
        {
          name: 'Axis Max Life Smart Term Plan Plus',
          highlight: true,
          note: `Best 2026. CSR: ${DATA.maxLifeCSR} — highest in India.`,
          csr: DATA.maxLifeCSR,
          premium: '~₹6,500–7,500/yr',
        },
        {
          name: 'HDFC Life Click2Protect Supreme',
          highlight: false,
          note: `CSR: ${DATA.hdfcLifeCSR}. Premium break feature.`,
          csr: DATA.hdfcLifeCSR,
          premium: '~₹6,800–8,000/yr',
        },
        {
          name: 'Tata AIA Sampoorna Raksha',
          highlight: false,
          note: `CSR: ${DATA.tataAIACSR}. Cheapest option. Whole life option available.`,
          csr: DATA.tataAIACSR,
          premium: '~₹6,000–7,500/yr',
        },
      ],
      caNote: 'Non-smoker? Premium lowest. TROP (return of premium) mat lena. Pure term = pure protection. 35-year term lo.',
    },
    {
      id: 'ownhealth',
      type: 'Own Health Insurance',
      subtitle: `Vishnu (${DATA.age}) — personal cover`,
      priority: 'HIGH',
      tagColor: 'yellow',
      amount: `${fmt(premiums.ownHealth)}/mo (~${fmt(premiums.ownHealth * 12)}/yr)`,
      cover: '₹5 Lakh base → grows to ₹25L+ with bonus',
      coverageDetails: {
        sumInsured: '₹5,00,000 base — grows via cumulative bonus',
        roomRent: 'Single private AC room — no sub-limit (Care Supreme)',
        icu: 'Fully covered, no cap',
        preHosp: '60 days',
        postHosp: '90 days',
        daycare: 'All 541 daycare procedures — chemo, dialysis, eye surgery etc.',
        restoration: 'Unlimited restoration (Care Supreme) — sum insured refills unlimited times in same policy year',
        cumulativeBonus: '50% per claim-free year → 500% total = ₹25L effective cover in 5 years',
        wellnessDiscount: '30% premium reduction via step count / health tracking app (Care Supreme)',
        ambulance: '₹3,000 per hospitalisation',
        ayush: 'Covered (inpatient AYUSH)',
        mentalHealth: 'Covered (IRDAI 2025 mandate)',
        domiciliary: 'Covered',
        coPayment: 'ZERO co-payment on Care Supreme',
        pedWait: '4 years for PED (at age 23, likely no PED — irrelevant for now)',
        lockTheClock: 'Niva Bupa ReAssure — entry-age premium locked till first claim',
      },
      notCovered: [
        'OPD (doctor consult / medicines without hospitalisation)',
        'Spectacles / contact lenses',
        'Dental OPD (routine)',
        'Cosmetic procedures',
        'Self-inflicted injuries',
        'Infertility / IVF',
        'Experimental treatments',
        'HIV/AIDS (some plans — check policy wording)',
      ],
      claimProcess: {
        cashless: {
          steps: [
            'Admit at network hospital (Care: 9,400+, Niva Bupa: 10,000+, HDFC ERGO: 13,000+)',
            'Show insurance card / policy number at hospital TPA desk',
            'Hospital sends pre-auth request to insurer',
            'Insurer approves in 2–4 hours (emergency: 1 hour)',
            'Treated — hospital directly bills insurer',
            'You pay only non-covered items or room upgrade difference',
            'At discharge: sign the claim form, collect discharge summary',
          ],
          tip: 'Always check if your specific hospital is on network BEFORE non-emergency admission. App se check karo.',
        },
        reimbursement: {
          steps: [
            'Get treated anywhere',
            'Collect: original bills, pharmacy receipts, discharge summary, lab reports, prescriptions',
            'Download claim form from insurer website/app',
            'Submit within 30 days of discharge',
            'Upload on app or post to nearest branch',
            'Insurer processes in 7–21 days',
            'Approved amount credited to bank account',
          ],
          tip: 'Small claims: out of pocket pay karo at non-network hospital and file reimbursement.',
        },
        helplines: {
          'Care Health': '1800-102-4499',
          'Niva Bupa': '1860-500-8888',
          'HDFC ERGO': '1800-2666',
        },
        timeline: `Cashless: 2–4 hours approval. Reimbursement: 7–21 days. HDFC ERGO: fastest (CSR ${DATA.hdrcErgoCSR}).`,
        taxBenefit: `80D: ${fmt(25000)}/yr for self. Total 80D (self + parents under 60): ₹25k + ₹25k = ₹50,000/yr deduction.`,
      },
      options: [
        {
          name: 'Care Supreme',
          highlight: true,
          note: `Best value 2026. Unlimited restoration. 500% cumulative bonus. CSR: ${DATA.careCSR}.`,
          csr: DATA.careCSR,
          premium: '₹7,000–9,000/yr',
        },
        {
          name: 'Niva Bupa ReAssure 2.0',
          highlight: false,
          note: `Lock the Clock — entry-age premium locked till first claim. CSR: ${DATA.nivaBupaCSR}.`,
          csr: DATA.nivaBupaCSR,
          premium: '₹8,000–11,000/yr',
        },
        {
          name: 'HDFC ERGO Optima Secure',
          highlight: false,
          note: `Zero deductions on claims. Best peace of mind. CSR: ${DATA.hdrcErgoCSR}.`,
          csr: DATA.hdrcErgoCSR,
          premium: '₹10,000–14,000/yr',
        },
      ],
      caNote: 'Direct plan lo — insurer site se. Co-payment clause avoid karo.',
    },
    {
      id: 'pa',
      type: 'Personal Accident Insurance',
      subtitle: 'Vishnu — daily train commute',
      priority: 'MEDIUM',
      tagColor: 'blue',
      amount: `${fmt(premiums.pa)}/mo (~${fmt(premiums.pa * 12)}/yr)`,
      cover: '₹25–50 Lakh accidental cover',
      coverageDetails: {
        sumInsured: '₹25–50 Lakh on accident',
        accidentalDeath: '100% of sum insured to nominee on accidental death',
        permanentTotalDisability: '100% sum insured — both hands/legs/eyes lost',
        permanentPartialDisability: 'Proportional — e.g. loss of one eye = 50% sum insured',
        temporaryTotalDisability: 'Weekly compensation (1% of SI/week, max 104 weeks)',
        hospitalisationExpense: 'Hospitalisation from accident covered in select plans',
        ambulance: 'Covered',
        transportOfRemains: 'Repatriation of mortal remains',
      },
      notCovered: [
        'Death/injury from illness (use health insurance)',
        'Suicide or self-inflicted',
        'Adventure sports (unless rider added)',
        'War / nuclear perils',
        'Alcohol or drugs',
        'Aviation (non-scheduled airlines)',
      ],
      claimProcess: {
        cashless: {
          steps: [
            'PA insurance = reimbursement / lump sum — no cashless. Use health insurance for hospital bills.',
            'Immediately file FIR at police station (mandatory for accident claim)',
            'Use your health insurance for hospital treatment bills',
            'For PA lump sum: collect FIR, accident report, medical certificate',
            'For disability claim: add disability certificate from civil surgeon',
            'Fill PA claim form — submit within 30 days',
            'Insurer disburses lump sum based on disability type',
          ],
          tip: 'PA claim and health insurance claim are fully independent — file BOTH for the same accident.',
        },
        reimbursement: {
          steps: [
            'Accidental death: death certificate + FIR + post-mortem report + nominee proof',
            'PTD (both eyes/limbs lost): medical + disability certificate from civil surgeon',
            'Submit all docs within 30 days',
            'Lump sum payment to insured or nominee',
          ],
          tip: 'Train accident? File: Railway compensation + PA insurance claim + health insurance claim — all three independently.',
        },
        helplines: {
          'Bajaj Allianz': '1800-209-0144',
          'HDFC ERGO': '1800-2666',
        },
        timeline: 'Lump sum claims: 15–30 days. Disability certification may take longer.',
        taxBenefit: 'No specific deduction. Claim payout is 100% tax-free.',
      },
      options: [
        {
          name: 'Bajaj Allianz Personal Guard',
          highlight: true,
          note: 'Most popular standalone PA plan. Easy claim process. CSR: ~98%.',
          csr: '~98%',
          premium: '₹2,500–3,500/yr',
        },
        {
          name: 'HDFC ERGO Accident Suraksha',
          highlight: false,
          note: 'Can add as rider to health plan. CSR: ~90%.',
          csr: '~90%',
          premium: '₹2,000–3,000/yr',
        },
      ],
      caNote: 'Stand-alone plan lo. Diva→Andheri/Ghansoli daily train commute = highest accident risk in Indian cities.',
    },
  ];
}

const parentsBudget = DATA.parentsMummy + DATA.parentsPapa;

export const ROADMAP_MONTHS: RoadmapMonth[] = [
  {
    label: 'Month 1 — Foundation',
    tasks: [
      {
        id: 'm1t1',
        text: 'IDFC First / Kotak mein alag savings account kholo (7% interest)',
        urgent: true,
      },
      {
        id: 'm1t2',
        text: `Emergency fund ${fmt(DATA.emergency)}/mo auto transfer set karo`,
        urgent: true,
      },
      {
        id: 'm1t3',
        text: 'Parents ki health history — pre-existing conditions list karo (BP? diabetes? cardiac?)',
        urgent: true,
      },
      {
        id: 'm1t4',
        text: `Policybazaar pe Care Freedom + Star Red Carpet quotes lo (Mummy ${DATA.parents.mummy}, Papa ${DATA.parents.papa})`,
        urgent: true,
      },
      {
        id: 'm1t5',
        text: `Parents ke liye individual health insurance buy karo — budget ${fmt(parentsBudget)}/mo combined`,
        urgent: true,
      },
    ],
  },
  {
    label: 'Month 2 — Protection Layer',
    tasks: [
      {
        id: 'm2t1',
        text: `Axis Max Life Smart Term Plan Plus — ₹1 Crore, 35yr, non-smoker (~${fmt(DATA.termPremium)}/mo)`,
        urgent: true,
      },
      {
        id: 'm2t2',
        text: `Care Supreme own health insurance — ₹5L cover (~${fmt(DATA.ownHealth)}/mo)`,
        urgent: true,
      },
      {
        id: 'm2t3',
        text: `Bajaj Allianz Personal Accident cover — ₹50L, train commute (~${fmt(DATA.pacover)}/mo)`,
        urgent: false,
      },
    ],
  },
  {
    label: 'Month 3 — Wealth Engine ON',
    tasks: [
      {
        id: 'm3t1',
        text: `Kuvera.in — UTI Nifty 50 Direct Plan ${fmt(DATA.sip)} SIP set karo`,
        urgent: true,
      },
      {
        id: 'm3t2',
        text: 'Zerodha account open karo (stocks ke liye)',
        urgent: false,
      },
      {
        id: 'm3t3',
        text: `${fmt(DATA.stocks)} pehle blue chip — TCS ya HDFC Bank (observe + learn)`,
        urgent: false,
      },
    ],
  },
  {
    label: 'Month 4 — Tax Optimization',
    tasks: [
      {
        id: 'm4t1',
        text: `SBI YONO mein PPF account — ${fmt(DATA.ppf)}/mo (${DATA.ppfRate} tax-free, before 5th every month)`,
        urgent: false,
      },
      {
        id: 'm4t2',
        text: `80C planning — PPF ${fmt(DATA.ppf * 12)}/yr + EPF (office contribution check karo)`,
        urgent: false,
      },
      {
        id: 'm4t3',
        text: `Short-term FD for laptop/goal (${fmt(DATA.shortTermFd)}/mo)`,
        urgent: false,
      },
    ],
  },
  {
    label: 'Month 5–6 — Review',
    tasks: [
      {
        id: 'm5t1',
        text: `Emergency fund check — ${fmt(DATA.emergency * 6)} accumulated? On track?`,
        urgent: false,
      },
      {
        id: 'm5t2',
        text: 'Stock portfolio review — learn from + or -',
        urgent: false,
      },
      {
        id: 'm5t3',
        text: 'Insurance premiums auto-renew set hain? Parents + own + term + PA',
        urgent: false,
      },
      {
        id: 'm5t4',
        text: 'Parents insurance — claim process unhe samjha diya? Policy document diya?',
        urgent: false,
      },
    ],
  },
  {
    label: 'EMI Khatam Hone Pe',
    tasks: [
      {
        id: 'mf1',
        text: `${fmt(DATA.budget.emi.amount)} EMI freed → SIP mein daal. Total SIP = ${fmt(DATA.postEmiSip)}/mo`,
        urgent: true,
      },
      {
        id: 'mf2',
        text: 'Appraisal? Increment ka 80% SIP mein',
        urgent: false,
      },
      {
        id: 'mf3',
        text: 'NPS evaluate karo jab salary 10 LPA+',
        urgent: false,
      },
    ],
  },
];

export const RESEARCH_DECISIONS: ResearchDecision[] = [
  {
    id: 'd0',
    topic: "Sister's Claim — 'Too late, ₹50k/month premium' — Is She Right?",
    tag: 'Fact Check',
    tagColor: 'orange',
    decision: `PARTIALLY right — but only if you wait till 60+. At ${DATA.parents.mummy} & ${DATA.parents.papa} RIGHT NOW, ₹20–28k/year each is very doable. Act this month.`,
    reasoning: [
      `Sister's ₹50k/month figure = ₹6 lakh/year. This is what you'd pay if parents were 65–70+ with multiple pre-existing conditions. At that age, yes — realistic.`,
      `AT ${DATA.parents.mummy} & ${DATA.parents.papa}, parents can still get standard adult health plans. Entry age for most plans is up to 65. This is the key window your sister may not be aware of.`,
      `Actual premium NOW for ₹10L individual cover: Mummy (${DATA.parents.mummy}) — ₹20,000–28,000/yr = ~${fmt(DATA.parentsMummy)}/mo. Papa (${DATA.parents.papa}) — ₹24,000–28,000/yr = ~${fmt(DATA.parentsPapa)}/mo. Both = ${fmt((DATA.parentsMummy + DATA.parentsPapa) * 12)}/yr = ${fmt(DATA.parentsMummy + DATA.parentsPapa)}/month — NOT ₹50k/month.`,
      `This is exactly what's budgeted in the Overview tab: Mummy ${fmt(DATA.parentsMummy)}/mo + Papa ${fmt(DATA.parentsPapa)}/mo = ${fmt(DATA.parentsMummy + DATA.parentsPapa)}/mo combined.`,
      `Sister is correct that premium IS high vs age 40. At 40, same cover = ₹8,000–12,000/yr each. At 52–55 it's 2–3x. But not ₹50k/month.`,
      `₹50k/month becomes real IF: parents are 60+ (senior citizen slab), have pre-existing conditions, buying ₹25L cover, or picking a bad plan like LIC Health.`,
      `IRDAI 2025 reform: no insurer can reject purely on age. But they CAN load premium heavily for pre-existing conditions.`,
      `Medical inflation India: 14%/yr (2026). Metro ICU week = ₹3–5L. Even ₹28k/yr premium is cheap vs one hospitalisation.`,
    ],
    alternatives:
      'If budget tight in first 2 months: start ₹5L cover each (~₹14,000–18,000/yr combined), upgrade to ₹10L in Year 2.',
    sources: [
      {
        label: 'Ditto — Health Insurance Premium Calculator',
        url: 'https://joinditto.in/articles/health-insurance/health-insurance-premium-calculator/',
      },
      {
        label: 'Onsurity — Best Plans for Senior Citizens 2026',
        url: 'https://www.onsurity.com/blog/best-health-insurance-for-senior-citizens/',
      },
    ],
  },
  {
    id: 'd1',
    topic: 'Budget Framework — Why Modified 50/30/20?',
    tag: 'Budget',
    tagColor: 'blue',
    decision:
      'Modified framework — rent removed (bhai pays), insurance realistically funded, investments maximised.',
    reasoning: [
      'Standard 50/30/20 assumes rent. Bhai rent bharta hai = ₹8,000–10,000 freed up immediately.',
      `Pure 50/30/20 would put only ₹9,200 in savings/invest. Too low at age ${DATA.age} with zero rent liability.`,
      `Revised: Needs ${DATA.budget.needs.pct}% · Wants ${DATA.budget.wants.pct}% · EMI ${DATA.budget.emi.pct}% · Invest ${DATA.budget.investments.pct}% · Insurance ${DATA.budget.insurance.pct}%.`,
      `EMI ${fmt(DATA.budget.emi.amount)}/mo carved out separately — not a 'need' since it ends. When it ends, entire amount moves to SIP → ${fmt(DATA.postEmiSip)}/mo SIP.`,
      `Insurance ${DATA.budget.insurance.pct}% (${fmt(DATA.budget.insurance.amount)}/mo) covers all four policies at realistic premiums, not underestimated figures.`,
    ],
    alternatives:
      'Pure 50/30/20 considered but rejected — underutilises the rent-free advantage and underfunds insurance.',
    sources: [],
  },
  {
    id: 'd2',
    topic: 'Nifty 50 vs Active Mutual Fund vs Nifty Next 50',
    tag: 'Investment',
    tagColor: 'green',
    decision: `Nifty 50 Index Fund (UTI / Nippon) as core ${fmt(DATA.sip)}/mo SIP`,
    reasoning: [
      'Most actively managed large-cap funds fail to beat Nifty 50 over 10+ years after fees.',
      `Expense ratio: Active 1–1.5% vs Index 0.10–0.20%. On ${fmt(DATA.sip)}/mo over 17 years, that difference = lakhs.`,
      'Nifty Next 50: higher returns but much higher volatility. Not for first investment.',
      'Passive mutual fund AUM crossed ₹14 lakh cr March 2026 — institutional validation.',
      'Rule: master Nifty 50 first, add Next 50 later when corpus is ₹5L+.',
    ],
    alternatives: 'Flexi Cap Fund (Parag Parikh) — better for Year 2 addition as second SIP.',
    sources: [
      {
        label: 'Smallcase — Top Nifty 50 Index Funds 2026',
        url: 'https://www.smallcase.com/collections/best-nifty-50-index-mutual-funds/',
      },
    ],
  },
  {
    id: 'd3',
    topic: 'PPF vs NPS vs ELSS for Tax Saving',
    tag: 'Tax',
    tagColor: 'purple',
    decision: `PPF ${fmt(DATA.ppf)}/mo now (${DATA.ppfRate} tax-free). NPS later when salary 10 LPA+.`,
    reasoning: [
      `PPF: ${DATA.ppfRate} tax-free FY2026-27 (confirmed, unchanged from last quarter). EEE status — invest, earn, withdraw sab tax-free.`,
      `Max limit revised to ${DATA.ppfMax} in 2026. Current contribution ${fmt(DATA.ppf * 12)}/yr = well within limit.`,
      `At ₹6.5 LPA, bracket is 10–20%. NPS 80CCD(1B) saving = ₹10–15k. Not worth 35-year lock-in.`,
      'ELSS: 3yr lock + market risk + same 80C bucket as PPF = PPF wins at this income level.',
      'NPS at 30%+ bracket saves ₹15,000+/yr — then worth the lock-in. Start at 26–28.',
    ],
    alternatives: 'ELSS shortlisted as PPF alternative — revisit when salary hits 10 LPA.',
    sources: [{ label: 'ClearTax — PPF 2026 Guide', url: 'https://cleartax.in/s/ppf' }],
  },
  {
    id: 'd4',
    topic: 'Parents Insurance — Family Floater vs Individual',
    tag: 'Insurance',
    tagColor: 'red',
    decision: `Individual policies for each parent — NOT family floater. Budgeted: Mummy ${fmt(DATA.parentsMummy)}/mo + Papa ${fmt(DATA.parentsPapa)}/mo.`,
    reasoning: [
      `Mummy ${DATA.parents.mummy}, Papa ${DATA.parents.papa}. Family floater premium based on oldest member (${DATA.parents.papa}).`,
      'If both hospitalized same year, ₹10L SPLITS between them. Individual = ₹10L each separately.',
      'For ages 50+, individual consistently recommended by every insurance advisor over floaters.',
      'Family floater makes sense when parents are in their 40s — not at 52/55.',
      'IRDAI 2025: no age-based rejection allowed. PED wait reduced to 3yr max.',
    ],
    alternatives:
      'Family floater initially considered — removed after age and hospitalisation risk analysis.',
    sources: [{ label: 'Beshak.org — Senior Citizen Insurance Guide', url: 'https://www.beshak.org' }],
  },
  {
    id: 'd5',
    topic: `Parents Plan — Star Red Carpet vs Care Freedom vs Niva Bupa at ages ${DATA.parents.mummy} & ${DATA.parents.papa}`,
    tag: 'Insurance',
    tagColor: 'red',
    decision: `Care Freedom as top pick (CSR ${DATA.careCSR}). Star Red Carpet if pre-existing conditions exist.`,
    reasoning: [
      `Care Health: ${DATA.careCSR} CSR — highest among senior plans 2026. No co-pay on BP/diabetes.`,
      'Star Red Carpet: Best if any pre-existing condition (diabetes, cardiac, BP) exists. 12-month PED wait = industry lowest.',
      `Niva Bupa Senior First: Good but 2-yr PED wait + co-payment at some age brackets. CSR ${DATA.nivaBupaCSR}.`,
      `At ${DATA.parents.mummy} & ${DATA.parents.papa} (not yet 60), most standard plans accept without mandatory co-pay.`,
    ],
    alternatives:
      'Star Red Carpet becomes #1 pick if either parent has diabetes, cardiac history, or any pre-existing disease.',
    sources: [
      {
        label: 'Ditto — Niva Bupa vs Care Health 2026',
        url: 'https://joinditto.in/articles/health-insurance/niva-bupa-vs-care-health-insurance/',
      },
    ],
  },
  {
    id: 'd6',
    topic: 'Term Insurance — Max Life vs HDFC vs Tata AIA',
    tag: 'Insurance',
    tagColor: 'red',
    decision: `Axis Max Life Smart Term Plan Plus — CSR ${DATA.maxLifeCSR}, highest in India 2026.`,
    reasoning: [
      `CSR 2026: Max Life ${DATA.maxLifeCSR} > HDFC Life ${DATA.hdfcLifeCSR} > Tata AIA ${DATA.tataAIACSR} > ICICI Pru 98.03%.`,
      'HDFC Click2Protect: Premium break feature. Slightly costlier.',
      `Tata AIA: Cheapest. Whole life option. Good for budget option.`,
      `Budget: ${fmt(DATA.termPremium)}/mo = ~${fmt(DATA.termPremium * 12)}/yr. ₹1Cr cover. 35-year term.`,
    ],
    alternatives: 'Tata AIA = best budget pick. HDFC = best if feature-set matters more.',
    sources: [
      {
        label: 'Ditto — Best Term Plans 2026',
        url: 'https://joinditto.in/term-insurance/best-term-plans-in-india/',
      },
    ],
  },
  {
    id: 'd7',
    topic: 'Own Health Insurance — Care Supreme vs Niva Bupa vs HDFC ERGO',
    tag: 'Insurance',
    tagColor: 'red',
    decision: `Care Supreme as primary recommendation — unlimited restoration, 500% cumulative bonus. Budget: ${fmt(DATA.ownHealth)}/mo.`,
    reasoning: [
      'Unlimited restoration — sum insured refills unlimited times in same policy year. Unique feature.',
      '500% cumulative bonus over 5 claim-free years = ₹25L effective cover from ₹5L base.',
      '30% wellness discount via step tracking app — effective premium lower.',
      "Niva Bupa ReAssure: 'Lock the Clock' — entry-age premium locked till first claim. Better long-term if premium predictability matters more.",
      `HDFC ERGO Optima Secure: Zero deductions, ${DATA.hdrcErgoCSR} CSR. Premium-priced but best peace of mind.`,
    ],
    alternatives: 'Niva Bupa ReAssure better long-term if you want premium locked at age-23 rates.',
    sources: [
      {
        label: 'Ditto — Best Health Insurance India 2026',
        url: 'https://joinditto.in/health-insurance/best-health-plans-in-india/',
      },
    ],
  },
  {
    id: 'd8',
    topic: 'Emergency Fund — How Much, Where to Park?',
    tag: 'Savings',
    tagColor: 'blue',
    decision: `${fmt(DATA.emergency)}/mo → target ₹1.5–2L. First ₹1L in IDFC First (7% savings), rest in Liquid Fund.`,
    reasoning: [
      `Budgeting ${fmt(DATA.emergency)}/mo. At this rate, ₹1.5L reached in ~5 months, ₹2L in ~7 months.`,
      'First ₹1L = pure instant accessibility. No T+1 risk during real emergency.',
      'Beyond ₹1L: Liquid Fund. 6.5–7.5% vs 7% savings — marginal but better habit.',
      'Do NOT park emergency fund in FD — premature break = penalty + mental friction.',
      'IDFC First 7% savings rate is among the best in India as of 2026.',
    ],
    alternatives: 'Full Liquid Fund considered — rejected due to T+1 wait during real emergencies.',
    sources: [],
  },
];

export const RESEARCH_NEWS: ResearchNewsCategory[] = [
  {
    category: 'Market & Finance',
    items: [
      {
        name: 'Moneycontrol Markets',
        url: 'https://www.moneycontrol.com/markets/',
        desc: 'Daily market news, mutual fund updates',
      },
      {
        name: 'Economic Times — Personal Finance',
        url: 'https://economictimes.indiatimes.com/personal-finance',
        desc: 'Budget updates, tax changes',
      },
      {
        name: 'Freefincal',
        url: 'https://freefincal.com',
        desc: 'No-nonsense mutual fund research. Must follow.',
      },
    ],
  },
  {
    category: 'Insurance (Unbiased)',
    items: [
      {
        name: 'Ditto Insurance Blog',
        url: 'https://joinditto.in/articles/',
        desc: 'Best unbiased insurance comparison. No agent commissions.',
      },
      {
        name: 'Beshak.org',
        url: 'https://www.beshak.org',
        desc: 'Independent insurance research — deep plan reviews',
      },
      {
        name: 'IRDAI Official',
        url: 'https://www.irdai.gov.in',
        desc: 'Official regulator — policy changes, circulars',
      },
    ],
  },
  {
    category: 'Mutual Fund Tracking',
    items: [
      {
        name: 'Kuvera',
        url: 'https://kuvera.in',
        desc: 'Free direct plan investments + portfolio tracking',
      },
      {
        name: 'ValueResearchOnline',
        url: 'https://www.valueresearchonline.com',
        desc: 'Fund ratings, SIP calculator',
      },
      {
        name: 'AMFI India',
        url: 'https://www.amfiindia.com',
        desc: 'Official NAV, AUM data',
      },
    ],
  },
  {
    category: 'Tax & Compliance',
    items: [
      {
        name: 'ClearTax',
        url: 'https://cleartax.in',
        desc: 'ITR filing, 80C tracker, PPF calculator',
      },
      {
        name: 'Income Tax India',
        url: 'https://www.incometax.gov.in',
        desc: 'Official ITR, TDS, PAN/Aadhaar',
      },
    ],
  },
];

export const INSURANCE_PREMIUM_AGE_TABLE: InsurancePremiumAgeRow[] = [
  {
    age: '40',
    mummy: '₹8–11k/yr',
    papa: '₹10–14k/yr',
    note: 'Best time to buy',
    col: '#16a34a',
  },
  {
    age: `${DATA.parents.mummy} (NOW — Mummy)`,
    mummy: '₹20–28k/yr',
    papa: '—',
    note: 'Act now ✓',
    col: '#2563eb',
  },
  {
    age: `${DATA.parents.papa} (NOW — Papa)`,
    mummy: '—',
    papa: '₹24–28k/yr',
    note: 'Act now ✓',
    col: '#2563eb',
  },
  {
    age: '60+',
    mummy: '₹35–50k/yr',
    papa: '₹40–60k/yr',
    note: 'Senior slab. 2x jump.',
    col: '#b45309',
  },
  {
    age: '65+',
    mummy: '₹55–90k/yr',
    papa: '₹60–1L/yr',
    note: "Sister's ₹50k warning.",
    col: '#dc2626',
  },
];

export const RERESEARCH_SCHEDULE: ReresearchScheduleItem[] = [
  {
    when: 'Every 3 months',
    what: `PPF rate check. Currently ${DATA.ppfRate}.`,
  },
  {
    when: 'Every year',
    what: 'Insurance renewal — get fresh quotes, compare.',
  },
  {
    when: 'Appraisal time',
    what: 'Revisit SIP amount (target 80% of increment to SIP).',
  },
  {
    when: 'Parents turn 60',
    what: `Mummy in ${60 - DATA.parents.mummy} yrs, Papa in ${60 - DATA.parents.papa} yrs — port to senior plan, add super top-up.`,
  },
  {
    when: 'Age 28–30',
    what: 'Upgrade own health insurance sum insured to ₹10L+.',
  },
];

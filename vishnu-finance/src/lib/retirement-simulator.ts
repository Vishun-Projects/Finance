/**
 * Simple retirement corpus projection (linear, not Monte Carlo).
 * Free — uses @formulajs/formulajs only if extended later.
 */

export interface RetirementInput {
  currentAge: number;
  retirementAge: number;
  currentCorpus: number;
  monthlySip: number;
  expectedAnnualReturn: number;
}

export interface RetirementProjection {
  yearsToRetirement: number;
  projectedCorpus: number;
  totalContributions: number;
  totalGrowth: number;
}

export function projectRetirementCorpus(input: RetirementInput): RetirementProjection {
  const years = Math.max(0, input.retirementAge - input.currentAge);
  const months = years * 12;
  const monthlyRate = input.expectedAnnualReturn / 100 / 12;

  let corpus = input.currentCorpus;
  let contributions = input.currentCorpus;

  for (let m = 0; m < months; m++) {
    corpus = corpus * (1 + monthlyRate) + input.monthlySip;
    contributions += input.monthlySip;
  }

  return {
    yearsToRetirement: years,
    projectedCorpus: Math.round(corpus),
    totalContributions: Math.round(contributions),
    totalGrowth: Math.round(corpus - contributions),
  };
}

import { describe, expect, it } from 'vitest';
import { classifyAdvisorIntent, validateAdvisorResponse } from '@/lib/advisor-guardrails';
import { projectRetirementCorpus } from '@/lib/retirement-simulator';

describe('advisor-guardrails', () => {
  it('classifies affordability intent', () => {
    expect(classifyAdvisorIntent('Can I afford a new car?')).toBe('affordability');
  });

  it('blocks investment advice responses', () => {
    const result = validateAdvisorResponse('You should buy HDFC Top 100 fund now.');
    expect(result.blocked).toBe(true);
    expect(result.response).toContain('cannot recommend');
  });
});

describe('retirement-simulator', () => {
  it('projects corpus with monthly SIP', () => {
    const result = projectRetirementCorpus({
      currentAge: 30,
      retirementAge: 35,
      currentCorpus: 100000,
      monthlySip: 10000,
      expectedAnnualReturn: 12,
    });
    expect(result.yearsToRetirement).toBe(5);
    expect(result.projectedCorpus).toBeGreaterThan(result.totalContributions);
  });
});

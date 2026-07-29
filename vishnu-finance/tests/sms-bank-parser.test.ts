import assert from 'node:assert/strict';
import { isIndianBankSmsSender, looksLikeUpcomingOrMandateSms } from '../src/lib/sms-bank/allowlist.ts';
import { parseBankSms } from '../src/lib/sms-bank/parse-sms.ts';

const samples = [
  {
    address: 'BT-INDBNK-S',
    body: 'Sent Rs.15.00 from A/c *8179 on 27-07-26 to KADER BADSHAH KASIM SHAIKH.RRN 657457329811.Avl Bal Rs.8198.73.Not you?SMS BLOCK to 9289592895-Indian Bank',
    expect: { direction: 'debit', amount: 15, ref: '657457329811', person: 'KADER BADSHAH KASIM SHAIKH' },
  },
  {
    address: 'BZ-INDBNK-S',
    body: 'Your A/c *8179 is credited with Rs.250.00 on 29-07-26 by MAMTA MUNSHEELAL VISHWAKARMA. RRN 127024188011. Available balance is Rs. 6806.35 - Indian Bank',
    expect: { direction: 'credit', amount: 250, ref: '127024188011', person: 'MAMTA MUNSHEELAL VISHWAKARMA' },
  },
  {
    address: 'BV-INDBNK-S',
    body: 'Sent Rs.149.00 from A/c *8179 on 29-07-24 to UBER INDIA SYSTEMS PRIVATE LIM.RRN 657692118601.Avl Bal Rs.6943.35.Not you?SMS BLOCK to 9289592895-Indian Bank',
    expect: { direction: 'debit', amount: 149, ref: '657692118601', person: 'UBER INDIA SYSTEMS PRIVATE LIM' },
  },
  {
    address: 'XX-INDBNK-Z',
    body: 'Sent Rs.340.89 from A/c *8179 on 24-07-26 to Deepak Nachre.RRN 657177779468.Avl Bal Rs.10220.28.Not you?SMS BLOCK to 9289592895-Indian Bank',
    expect: { direction: 'debit', amount: 340.89, ref: '657177779468', person: 'Deepak Nachre' },
  },
];

assert.equal(isIndianBankSmsSender('BT-INDBNK-S'), true);
assert.equal(isIndianBankSmsSender('ZZ-INDBNK-S'), true);
assert.equal(isIndianBankSmsSender('RANDOM-OTP'), false);

const autopay =
  'Your account will be debited with Rs 119.00 towards Spotify India LLP for the Autopay on 29-Jul-26.Pause mandate to stop execution - Indian Bank';
assert.equal(looksLikeUpcomingOrMandateSms(autopay), true);
assert.equal(
  parseBankSms({ id: '1', address: 'BT-INDBNK-S', body: autopay, date: Date.now() }),
  null,
);

for (const sample of samples) {
  assert.equal(isIndianBankSmsSender(sample.address), true);
  const parsed = parseBankSms({
    id: 't',
    address: sample.address,
    body: sample.body,
    date: Date.now(),
  });
  assert.ok(parsed, `failed to parse: ${sample.body.slice(0, 40)}`);
  const amount = parsed.creditAmount || parsed.debitAmount;
  assert.equal(amount, sample.expect.amount);
  assert.equal(parsed.transactionId, sample.expect.ref);
  assert.equal(parsed.personName, sample.expect.person);
  if (sample.expect.direction === 'debit') {
    assert.ok(parsed.debitAmount > 0 && parsed.creditAmount === 0);
  } else {
    assert.ok(parsed.creditAmount > 0 && parsed.debitAmount === 0);
  }
}

console.log('sms-bank parser: all samples passed');

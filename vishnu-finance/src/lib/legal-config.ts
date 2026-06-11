/**
 * Legal and business details for Razorpay website verification.
 * Must match Razorpay KYC (Business details / PAN / bank).
 *
 * Address: set NEXT_PUBLIC_LEGAL_ADDRESS on Vercel (see .env.example).
 * Use the communication address from your bank statement PDF header (first page),
 * not the HDFC "Registered Office" footer text in transaction exports.
 */

export type RegisteredAddress = {
  lines: string[];
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type GrievanceOfficer = {
  name: string;
  designation: string;
  email: string;
  phone: string;
};

function parseAddressFromEnv(): RegisteredAddress {
  const raw = process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim();
  if (raw) {
    const parts = raw.split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 4) {
      const pincode = parts[parts.length - 1] ?? '';
      const state = parts[parts.length - 2] ?? '';
      const city = parts[parts.length - 3] ?? '';
      const lines = parts.slice(0, -3);
      return { lines, city, state, pincode, country: 'India' };
    }
    return {
      lines: parts,
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    };
  }

  // Default matches KYC; override anytime via NEXT_PUBLIC_LEGAL_ADDRESS on Vercel
  return {
    lines: ['B1 301, Nirmal Nagari', 'Khardigao', 'Diva'],
    city: 'Thane',
    state: 'Maharashtra',
    pincode: '400612',
    country: 'India',
  };
}

export function isRegisteredAddressConfigured(
  address: RegisteredAddress = legalConfig.registeredAddress
): boolean {
  return (
    address.lines.some((line) => line.trim().length > 0) &&
    Boolean(address.city.trim()) &&
    Boolean(address.state.trim()) &&
    Boolean(address.pincode.trim())
  );
}

export const legalConfig = {
  legalName: 'VISHNU MUNSHEELAL VISHWAKARMA',
  brandName: 'Vishnu Finance',
  proprietorName: 'Vishnu Vishwakarma',
  registeredAddress: parseAddressFromEnv(),
  supportEmail: 'vishun.orv@gmail.com',
  supportPhone: '+91 8108940178',
  supportHours: 'Monday–Friday, 10:00 AM–6:00 PM IST',
  websiteUrl: 'https://vithun-finance.vercel.app',
  gstin: null as string | null,
  refundBusinessDays: 7,
  grievanceOfficer: {
    name: 'Vishnu Vishwakarma',
    designation: 'Proprietor / Grievance Officer',
    email: 'vishun.orv@gmail.com',
    phone: '+91 8108940178',
  } satisfies GrievanceOfficer,
  jurisdiction: 'India',
  effectiveDate: '2025-11-16',
} as const;

export function formatRegisteredAddress(address: RegisteredAddress = legalConfig.registeredAddress): string {
  if (!isRegisteredAddressConfigured(address)) {
    return 'Address: set NEXT_PUBLIC_LEGAL_ADDRESS in environment (see docs/RAZORPAY_COMPLIANCE.md).';
  }
  const parts = [
    ...address.lines,
    [address.city, address.state, address.pincode].filter(Boolean).join(', '),
    address.country,
  ].filter(Boolean);
  return parts.join('\n');
}

export const policyLinks = [
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/shipping', label: 'Shipping / Delivery' },
  { href: '/refunds', label: 'Cancellation & Refunds' },
  { href: '/contact', label: 'Contact Us' },
] as const;

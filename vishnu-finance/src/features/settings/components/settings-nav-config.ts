import {
  User,
  Palette,
  Bell,
  Shield,
  Tag,
  FileText,
  Mail,
  Phone,
  Wallet,
  Smartphone,
} from 'lucide-react';
import { legalConfig, policyLinks } from '@/lib/legal-config';

export const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Profile', description: 'Personal info & payments', icon: User },
  { id: 'appearance', label: 'Appearance', description: 'Theme and display', icon: Palette },
  { id: 'notifications', label: 'Alerts', description: 'Push and email alerts', icon: Bell },
  { id: 'security', label: 'Security', description: 'Password and privacy', icon: Shield },
  { id: 'bank-sms', label: 'Bank SMS', description: 'Android bank alerts & review', icon: Smartphone },
  { id: 'categories', label: 'Categories', description: 'Transaction categories', icon: Tag },
  { id: 'networth', label: 'Net worth', description: 'Assets & liabilities', icon: Wallet },
  { id: 'documentation', label: 'Portal', description: 'Documents & exports', icon: FileText },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id'];

export const LEGAL_DOC_ITEMS = [
  ...policyLinks.map((link) => ({
    id: link.href,
    label: link.label,
    href: link.href,
  })),
  { id: '/about', label: 'About', href: '/about' },
] as const;

export type LegalDocHref = (typeof LEGAL_DOC_ITEMS)[number]['href'];
export type LegalDocId = LegalDocHref;

export const LEGAL_SUPPORT_ITEMS = [
  {
    id: 'support-email',
    label: 'Email support',
    description: legalConfig.supportEmail,
    href: `mailto:${legalConfig.supportEmail}`,
    icon: Mail,
  },
  {
    id: 'support-phone',
    label: 'Call support',
    description: legalConfig.supportPhone,
    href: `tel:${legalConfig.supportPhone.replace(/\s/g, '')}`,
    icon: Phone,
  },
] as const;

/** @deprecated Use LEGAL_DOC_ITEMS + LEGAL_SUPPORT_ITEMS */
export const LEGAL_NAV_ITEMS = [...LEGAL_DOC_ITEMS, ...LEGAL_SUPPORT_ITEMS] as const;

export function getSettingsSectionLabel(id: string): string {
  if (isLegalDocId(id)) {
    return LEGAL_DOC_ITEMS.find((item) => item.id === id)?.label ?? 'Legal';
  }
  return SETTINGS_SECTIONS.find((s) => s.id === id)?.label ?? 'Settings';
}

export function isLegalDocId(id: string): id is LegalDocHref {
  return LEGAL_DOC_ITEMS.some((item) => item.id === id);
}

export function getLegalDocLabel(href: string): string {
  return LEGAL_DOC_ITEMS.find((item) => item.href === href)?.label ?? 'Legal';
}

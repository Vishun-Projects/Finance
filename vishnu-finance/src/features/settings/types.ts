
export interface UserPreferencesPayload {
  id?: string;
  userId?: string;
  navigationLayout?: string;
  theme?: string;
  colorScheme?: string;
  currency?: string;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  telegramUserId?: string | null;
  telegramEnabled?: boolean;
  emailEnabled?: boolean;
  dailyQuoteEnabled?: boolean;
  notificationEmail?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

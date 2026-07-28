import type { InvestmentsOverview } from '@/lib/investments-overview-service';

export type InitialCasUpload = {
  fileName: string;
  message: string;
  isLikelyCas: boolean;
  folioCount?: number;
  holderName?: string;
  pan?: string;
  statementDate?: string;
  registrar?: string;
  holdings: Array<{
    schemeName: string;
    folio?: string;
    units?: number;
    nav?: number;
    value?: number;
    isin?: string;
  }>;
  totalValue?: number;
  parseWarning?: string;
  createdAt?: string;
};

export interface InvestmentsPageProps {
  initialOverview?: InvestmentsOverview | null;
  initialCasUpload?: InitialCasUpload | null;
}

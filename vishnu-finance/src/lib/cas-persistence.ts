import { prisma } from '@/lib/db';
import type { CasParseResult } from '@/lib/cas-parser';

export async function saveCasUpload(
  userId: string,
  fileName: string,
  sizeBytes: number,
  parsed: CasParseResult,
  totalValue?: number,
) {
  const totalValueDecimal =
    totalValue != null && totalValue > 0 ? totalValue : undefined;

  return prisma.casUpload.create({
    data: {
      userId,
      fileName,
      sizeBytes,
      isLikelyCas: parsed.isLikelyCas,
      folioCount: parsed.folioCount,
      holderName: parsed.holderName,
      pan: parsed.pan,
      statementDate: parsed.statementDate,
      registrar: parsed.registrar,
      parseWarning: parsed.parseWarning,
      totalValue: totalValueDecimal,
      holdings: {
        create: parsed.holdings.map((h) => ({
          userId,
          schemeName: h.schemeName,
          folio: h.folio,
          units: h.units,
          nav: h.nav,
          value: h.value,
          isin: h.isin,
        })),
      },
    },
    include: { holdings: true },
  });
}

export async function getLatestCasUpload(userId: string) {
  return prisma.casUpload.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { holdings: true },
  });
}

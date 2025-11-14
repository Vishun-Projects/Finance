import { extractTextFromPDF } from './gemini';
import { join } from 'path';
import { prisma } from './db';

/**
 * Process a super document: extract text and store in database
 */
export async function processSuperDocument(documentId: string): Promise<void> {
  try {
    const document = await prisma.superDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check if already processed
    if (document.processedText) {
      return;
    }

    // Extract text from PDF
    const filePath = join(process.cwd(), document.storageKey);
    const text = await extractTextFromPDF(filePath);

    // Update document with processed text
    await prisma.superDocument.update({
      where: { id: documentId },
      data: {
        processedText: text,
      },
    });
  } catch (error) {
    console.error('Error processing super document:', error);
    throw error;
  }
}

/**
 * Get processed text for a document (process if needed)
 */
export async function getDocumentText(documentId: string): Promise<string | null> {
  try {
    const document = await prisma.superDocument.findUnique({
      where: { id: documentId },
      select: { processedText: true, storageKey: true },
    });

    if (!document) {
      return null;
    }

    // If already processed, return text
    if (document.processedText) {
      return document.processedText;
    }

    // Process document
    const filePath = join(process.cwd(), document.storageKey);
    const text = await extractTextFromPDF(filePath);

    // If text extraction failed (empty string), don't update the database
    // This allows retry later when dependencies are installed
    if (!text || text.trim().length === 0) {
      console.warn(`Could not extract text from document ${documentId}. PDF parsing may require @napi-rs/canvas.`);
      return null;
    }

    // Update and return
    await prisma.superDocument.update({
      where: { id: documentId },
      data: { processedText: text },
    });

    return text;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error getting document text:', errorMessage);
    
    // If it's a PDF parsing error, return null instead of throwing
    if (errorMessage.includes('Failed to extract text from PDF')) {
      return null;
    }
    
    return null;
  }
}


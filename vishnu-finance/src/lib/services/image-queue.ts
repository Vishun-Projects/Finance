
import { prisma as db } from "@/lib/db";
import { generateAndSaveImagenImage } from "@/lib/imagen";
import { ImageJobStatus, ImageJobType } from "@prisma/client";

/**
 * Add a new image generation job to the queue
 */
export async function addImageGenerationJob(
    entityId: string,
    entityType: ImageJobType,
    prompt: string
) {
    return db.imageGenerationJob.create({
        data: {
            entityId,
            entityType,
            prompt,
            status: ImageJobStatus.PENDING,
        },
    });
}

/**
 * Trigger queue processing in the background without waiting for it to finish.
 * Useful for "instant" feedback in local development or interactive sessions.
 */
export function triggerImmediateProcessing() {
    processImageGenerationQueue(5).catch(err => {
        console.error('[Image Queue] Background processing error:', err);
    });
}

/**
 * Process pending image generation jobs
 * This should be called by a cron job or background worker
 */
export async function processImageGenerationQueue(batchSize = 2) {
    // 1. Fetch pending jobs
    const jobs = await db.imageGenerationJob.findMany({
        where: {
            status: {
                in: [ImageJobStatus.PENDING, ImageJobStatus.FAILED],
            },
            attempts: {
                lt: 3, // Max 3 attempts
            },
        },
        orderBy: {
            createdAt: "asc",
        },
        take: batchSize,
    });

    if (jobs.length === 0) {
        return { processed: 0, errors: 0 };
    }

    console.log(`[Image Queue] Processing ${jobs.length} jobs...`);
    let processedCount = 0;
    let errorCount = 0;

    // 2. Process each job
    for (const job of jobs) {
        try {
            // Update status to PROCESSING
            await db.imageGenerationJob.update({
                where: { id: job.id },
                data: {
                    status: ImageJobStatus.PROCESSING,
                    attempts: { increment: 1 },
                },
            });

            // Generate Image
            // Determine folder based on entity type
            let folder = "uploads/misc";
            if (job.entityType === ImageJobType.EDUCATION_POST) folder = "uploads/education";
            if (job.entityType === ImageJobType.DAILY_BRIEFING) folder = "uploads/daily-briefing";
            if (job.entityType === ImageJobType.GOAL) folder = "uploads/goals";
            if (job.entityType === ImageJobType.WISHLIST_ITEM) folder = "uploads/wishlist";

            console.log(`[Image Queue] Generating image for job ${job.id} (Prompt: ${job.prompt.substring(0, 30)}...)`);

            const imageUrl = await generateAndSaveImagenImage(job.prompt, folder);

            if (!imageUrl) {
                throw new Error("Failed to generate image (returned null)");
            }

            // Update Job Status to COMPLETED
            await db.imageGenerationJob.update({
                where: { id: job.id },
                data: {
                    status: ImageJobStatus.COMPLETED,
                    resultUrl: imageUrl,
                    processedAt: new Date(),
                },
            });

            // Update the Entity with the new image URL
            await updateEntityWithImage(job.entityId, job.entityType, imageUrl);

            processedCount++;
            console.log(`[Image Queue] Job ${job.id} completed. Image: ${imageUrl}`);

        } catch (error) {
            console.error(`[Image Queue] Job ${job.id} failed:`, error);
            errorCount++;

            const errorMessage = error instanceof Error ? error.message : String(error);

            await db.imageGenerationJob.update({
                where: { id: job.id },
                data: {
                    status: ImageJobStatus.FAILED,
                    error: errorMessage,
                },
            });
        }
    }

    return { processed: processedCount, errors: errorCount };
}

/**
 * Helper to update the actual entity record with the generated image URL
 */
async function updateEntityWithImage(entityId: string, type: ImageJobType, imageUrl: string) {
    try {
        if (type === ImageJobType.EDUCATION_POST) {
            await db.educationPost.update({
                where: { id: entityId },
                data: { coverImage: imageUrl },
            });
        } else if (type === ImageJobType.DAILY_BRIEFING) {
            // DailyBriefing uses 'date' as unique ID usually, but here we stored ID in the job.
            // Let's check if entityId is a UUID (id) or ISO string (date).
            // Schema says DailyBriefing has an ID.
            await db.dailyBriefing.update({
                where: { id: entityId },
                data: { heroImage: imageUrl },
            });
        } else if (type === ImageJobType.GOAL) {
            await db.goal.update({
                where: { id: entityId },
                data: { imageUrl: imageUrl },
            });
        } else if (type === ImageJobType.WISHLIST_ITEM) {
            await (db as any).wishlistItem.update({
                where: { id: entityId },
                data: { imageUrl: imageUrl },
            });
        }
    } catch (error) {
        console.error(`[Image Queue] Failed to update entity ${entityId} (${type}) with image:`, error);
        // We don't fail the job here because the image was generated successfully.
        // Maybe we should log a specific error or retry this part? 
        // For now, logging is enough.
    }
}

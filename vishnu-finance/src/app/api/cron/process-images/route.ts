
import { processImageGenerationQueue } from "@/lib/services/image-queue";
import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/api-auth";

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

export async function GET(request: Request) {
    const cronAuthError = verifyCronSecret(request);
    if (cronAuthError) return cronAuthError;

    try {
        const { processed, errors } = await processImageGenerationQueue();

        return NextResponse.json({
            success: true,
            processed,
            errors,
            message: `Processed ${processed} jobs with ${errors} errors.`,
        });
    } catch (error) {
        console.error("[Cron] Image processing failed:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}


import { processImageGenerationQueue } from "@/lib/services/image-queue";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

export async function GET(request: Request) {
    try {
        // secure this endpoint with a secret if needed, for now open for cron
        // const authHeader = request.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //   return new Response('Unauthorized', { status: 401 });
        // }

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

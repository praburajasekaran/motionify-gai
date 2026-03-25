import type { Config, Context } from "@netlify/functions";
import { getPool, createLogger, generateCorrelationId } from './_shared';

// Scheduled function to check for expired file deliverables (365+ days old)
// Runs daily at 2:00 AM UTC
export default async function handler(req: Request, context: Context) {
    const correlationId = generateCorrelationId();
    const logger = createLogger('scheduled-file-expiry', correlationId);

    // Validate invocation source (defense-in-depth)
    const body = await req.json().catch(() => ({}));
    if (!body.next_run) {
        logger.warn('Scheduled function invoked without next_run — possible unauthorized call');
        return new Response('Unauthorized', { status: 403 });
    }

    logger.info('Running scheduled file expiry check');

    const pool = getPool();

    try {
        // Find deliverables that are final_delivered and older than 365 days
        const result = await pool.query(`
      UPDATE deliverables
      SET files_expired = true, updated_at = NOW()
      WHERE status = 'final_delivered'
        AND final_delivered_at IS NOT NULL
        AND final_delivered_at < NOW() - INTERVAL '365 days'
        AND files_expired = false
      RETURNING id, name, project_id
    `);

        const expiredCount = result.rowCount || 0;

        if (expiredCount > 0) {
            logger.info(`Marked ${expiredCount} deliverable(s) as expired`, {
                deliverables: result.rows.map(r => ({ id: r.id, name: r.name })),
            });
        } else {
            logger.info('No deliverables expired today');
        }

        return new Response(
            JSON.stringify({
                success: true,
                expiredCount,
                timestamp: new Date().toISOString()
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" }
            }
        );
    } catch (error) {
        logger.error('Error in file expiry check', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
}

// Netlify Scheduled Function configuration
// Runs daily at 2:00 AM UTC
export const config: Config = {
    schedule: "@daily"
};

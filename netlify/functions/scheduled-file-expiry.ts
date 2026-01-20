import type { Config, Context } from "@netlify/functions";
import pg from "pg";

const { Pool } = pg;

// Scheduled function to check for expired file deliverables (365+ days old)
// Runs daily at 2:00 AM UTC
export default async function handler(req: Request, context: Context) {
    console.log("🕐 Running scheduled file expiry check...");

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });

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
            console.log(`✅ Marked ${expiredCount} deliverable(s) as expired:`);
            result.rows.forEach((row) => {
                console.log(`  - ${row.name} (ID: ${row.id})`);
            });
        } else {
            console.log("✅ No deliverables expired today");
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
        console.error("❌ Error in file expiry check:", error);
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
    } finally {
        await pool.end();
    }
}

// Netlify Scheduled Function configuration
// Runs daily at 2:00 AM UTC
export const config: Config = {
    schedule: "@daily"
};

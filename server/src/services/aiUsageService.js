// server/src/services/aiUsageService.js
import { pool } from "../db/pool.js";

// Get the number of requests made by a visitor today
export async function getVisitorDailyUsage(
  visitorId,
  db = pool
) {
  const result = await db.query(
    `
    SELECT COUNT(*)::INTEGER AS request_count
    FROM ai_usage
    WHERE visitor_id = $1
      AND created_at >= (
        date_trunc('day', NOW() AT TIME ZONE 'UTC')
        AT TIME ZONE 'UTC'
      )
    `,
    [visitorId]
  );

  return result.rows[0].request_count;
}

// Get the total number of requests made today
export async function getGlobalDailyUsage(db = pool) {
  const result = await db.query(`
    SELECT COUNT(*)::INTEGER AS request_count
    FROM ai_usage
    WHERE created_at >= (
      date_trunc('day', NOW() AT TIME ZONE 'UTC')
      AT TIME ZONE 'UTC'
    )
  `);

  return result.rows[0].request_count;
}

// Get monthly spending, including outstanding reservations
export async function getMonthlySpending(db = pool) {
  const result = await db.query(`
    SELECT COALESCE(
      SUM(
        CASE
          WHEN status = 'completed'
            AND actual_cost_usd IS NOT NULL
          THEN actual_cost_usd
          ELSE reserved_cost_usd
        END
      ),
      0
    ) AS total_cost
    FROM ai_usage
    WHERE created_at >= (
      date_trunc('month', NOW() AT TIME ZONE 'UTC')
      AT TIME ZONE 'UTC'
    )
    OR status IN ('pending', 'uncertain')
  `);

  return result.rows[0].total_cost;
}
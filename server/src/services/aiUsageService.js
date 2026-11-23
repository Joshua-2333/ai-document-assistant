// server/src/services/aiUsageService.js
import { pool } from "../db/pool.js";
import { aiConfig } from "../config/aiConfig.js";
import { calculateCostUsd } from "./aiPricingService.js";

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

// Create an error for requests that exceed usage limits
function createLimitError(message) {
  const error = new Error(message);
  error.status = 429;
  return error;
}

// Reserve request costs before contacting Anthropic
export async function reserveAiUsage(
  visitorId,
  model,
  inputTokens
) {
  if (
    typeof visitorId !== "string" ||
    !visitorId.trim() ||
    visitorId.length > 128
  ) {
    throw new Error("Invalid visitor ID.");
  }

  if (
    !Number.isSafeInteger(inputTokens) ||
    inputTokens <= 0 ||
    inputTokens > aiConfig.maxInputTokens
  ) {
    const error = new Error("Input token limit exceeded.");
    error.status = 413;
    throw error;
  }

  // Reserve the full configured input allowance,
  // plus a buffer for token-count estimation differences.
  const reservedInputTokens =
    Math.ceil(aiConfig.maxInputTokens * 1.25);

  const reservedCost = calculateCostUsd(
    model,
    reservedInputTokens,
    aiConfig.maxOutputTokens
  );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Serialize budget reservations across server instances
    await client.query(
      "SELECT pg_advisory_xact_lock($1)",
      [482901]
    );

    // Check the visitor's daily request limit
    const visitorUsage = await getVisitorDailyUsage(
      visitorId,
      client
    );

    if (visitorUsage >= aiConfig.maxRequestsPerVisitor) {
      throw createLimitError(
        "You have reached your daily AI request limit."
      );
    }

    // Check the application's global daily request limit
    const globalUsage = await getGlobalDailyUsage(client);

    if (globalUsage >= aiConfig.maxRequestsPerDay) {
      throw createLimitError(
        "The application has reached its daily AI request limit."
      );
    }

    // Retrieve monthly spending and outstanding reservations
    const monthlySpending = await getMonthlySpending(client);

    // Use PostgreSQL decimal arithmetic to check the budget
    const budgetCheck = await client.query(
      `
      SELECT (
        $1::NUMERIC + $2::NUMERIC <= $3::NUMERIC
      ) AS allowed
      `,
      [
        monthlySpending,
        reservedCost,
        aiConfig.monthlyBudgetUsd.toString(),
      ]
    );

    if (!budgetCheck.rows[0].allowed) {
      throw createLimitError(
        "The application has reached its monthly AI budget."
      );
    }

    // Record the reservation before making a paid request
    const result = await client.query(
      `
      INSERT INTO ai_usage (
        visitor_id,
        provider,
        model,
        input_tokens,
        reserved_cost_usd,
        status
      )
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id, reserved_cost_usd
      `,
      [
        visitorId,
        "anthropic",
        model,
        inputTokens,
        reservedCost,
      ]
    );

    await client.query("COMMIT");

    return {
      id: result.rows[0].id,
      reservedCostUsd: result.rows[0].reserved_cost_usd,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Reconcile a reservation with actual API token usage
export async function completeAiUsage(
  reservationId,
  inputTokens,
  outputTokens
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Use the same lock as the reservation function
    await client.query(
      "SELECT pg_advisory_xact_lock($1)",
      [482901]
    );

    // Retrieve the active reservation
    const reservation = await client.query(
      `
      SELECT model, reserved_cost_usd
      FROM ai_usage
      WHERE id = $1
        AND status IN ('pending', 'uncertain')
      FOR UPDATE
      `,
      [reservationId]
    );

    if (reservation.rowCount !== 1) {
      throw new Error("Active AI reservation not found.");
    }

    const model = reservation.rows[0].model;

    // Calculate the actual cost using reported token usage
    const actualCost = calculateCostUsd(
      model,
      inputTokens,
      outputTokens
    );

    // Replace the estimated reservation with the actual cost
    const result = await client.query(
      `
      UPDATE ai_usage
      SET input_tokens = $2,
          output_tokens = $3,
          actual_cost_usd = $4,
          status = 'completed',
          completed_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        reserved_cost_usd,
        actual_cost_usd,
        status,
        actual_cost_usd > reserved_cost_usd
          AS exceeded_reservation
      `,
      [
        reservationId,
        inputTokens,
        outputTokens,
        actualCost,
      ]
    );

    await client.query("COMMIT");

    // Warn if the actual cost exceeded our reservation
    if (result.rows[0].exceeded_reservation) {
      console.warn("Actual AI cost exceeded reservation.");
    }

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Preserve the reservation when actual cost is unknown
export async function markAiUsageUncertain(
  reservationId
) {
  const result = await pool.query(
    `
    UPDATE ai_usage
    SET status = 'uncertain'
    WHERE id = $1
      AND status = 'pending'
    RETURNING id, status, reserved_cost_usd
    `,
    [reservationId]
  );

  if (result.rowCount !== 1) {
    throw new Error("Pending AI reservation not found.");
  }

  return result.rows[0];
}
/**
 * AI Analysis Route
 *
 * POST /api/analysis/ai
 *   - Deducts credits (blood=5, vitamin=4)
 *   - Calls OpenAI to interpret the analysis
 *   - Returns interpretation + recommendations
 */

"use strict";

const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/auth");
const { supabase } = require("../config/supabase");

const CREDIT_COSTS = { blood: 5, vitamin: 4 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUserCredits(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("[getUserCredits] error:", error.message);
    return 0;
  }

  // If credits column doesn't exist yet or is null, return 0
  return typeof data?.credits === "number" ? data.credits : 0;
}

async function ensureUserExists(userId, email) {
  // Upsert user row in case trigger didn't fire (e.g. existing auth users)
  await supabase.from("users").upsert(
    { id: userId, email: email || null, credits: 50 },
    {
      onConflict: "id",
      ignoreDuplicates: true,
    },
  );
}

async function deductCredits(userId, amount) {
  const current = await getUserCredits(userId);
  if (current < amount) return false;
  await supabase
    .from("users")
    .update({ credits: current - amount })
    .eq("id", userId);
  return true;
}

async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const models = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
  ];

  let lastError = null;

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.4,
            max_tokens: 600,
          }),
          signal: controller.signal,
        },
      );

      const json = await res.json();

      if (json.error?.code === "rate_limit_exceeded" || res.status === 429) {
        console.warn(`[AI] Groq ${model} rate limited, trying next...`);
        lastError = new Error(`Groq ${model}: rate limited`);
        continue;
      }

      if (!res.ok) {
        lastError = new Error(json.error?.message || `Groq ${model} failed`);
        continue;
      }

      const text = json.choices?.[0]?.message?.content || "";
      if (!text) {
        lastError = new Error(`Groq ${model} returned empty response`);
        continue;
      }

      console.log(`[AI] used Groq model: ${model}`);
      return text;
    } catch (e) {
      if (e.name === "AbortError") {
        lastError = new Error(`Groq ${model} timeout`);
      } else {
        lastError = e;
      }
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error("All Groq models failed");
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];

  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
        }),
        signal: controller.signal,
      });

      const json = await res.json();

      if (
        json.error?.code === 429 ||
        json.error?.code === 404 ||
        json.error?.status === "RESOURCE_EXHAUSTED" ||
        json.error?.status === "NOT_FOUND"
      ) {
        console.warn(
          `[AI] Gemini ${model} failed (${json.error?.code}), trying next...`,
        );
        lastError = new Error(
          `${model}: ${json.error?.message || json.error?.code}`,
        );
        continue;
      }

      if (!res.ok) {
        lastError = new Error(json.error?.message || `${model} failed`);
        continue;
      }

      const parts = json.candidates?.[0]?.content?.parts || [];
      const text =
        parts.find((p) => p.text && !p.thought)?.text ||
        parts.find((p) => p.text)?.text ||
        "";

      if (!text) {
        lastError = new Error(`${model} returned empty response`);
        continue;
      }

      console.log(`[AI] used Gemini model: ${model}`);
      return text;
    } catch (e) {
      if (e.name === "AbortError") {
        lastError = new Error(`${model} timeout`);
      } else {
        lastError = e;
      }
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error("All Gemini models quota exceeded");
}

// Primary: Groq (fast, free, no daily limit)
// Fallback: Gemini (if Groq fails)
async function callAI(prompt) {
  try {
    return await callGroq(prompt);
  } catch (groqErr) {
    console.warn("[AI] Groq failed, falling back to Gemini:", groqErr.message);
    return await callGemini(prompt);
  }
}

function buildPrompt(type, data, childInfo) {
  const age = childInfo?.ageMonths
    ? `${Math.floor(childInfo.ageMonths / 12)} years ${childInfo.ageMonths % 12} months`
    : "unknown age";
  const gender = childInfo?.gender || "unknown";

  if (type === "blood") {
    return `You are a pediatric health assistant. Analyze these blood test results for a child (${age}, ${gender}):
- Hemoglobin: ${data.hemoglobin} g/dL
- Ferritin: ${data.ferritin} ng/mL

Provide:
1. A brief interpretation (2-3 sentences) of whether these values are normal, low, or concerning for this child's age/gender.
2. 2-4 specific, actionable recommendations for the parent.

Respond in JSON format: {"interpretation": "...", "recommendations": ["...", "..."]}
Keep language simple and parent-friendly. Do not diagnose — recommend consulting a doctor if values are abnormal.`;
  }

  if (type === "vitamin") {
    return `You are a pediatric health assistant. Analyze these vitamin test results for a child (${age}, ${gender}):
- Vitamin D: ${data.vitaminD} ng/mL
- Vitamin B12: ${data.vitaminB12} pg/mL

Provide:
1. A brief interpretation (2-3 sentences) of whether these values are normal, low, or concerning.
2. 2-4 specific, actionable recommendations (diet, supplements, sun exposure, etc.).

Respond in JSON format: {"interpretation": "...", "recommendations": ["...", "..."]}
Keep language simple and parent-friendly. Do not diagnose — recommend consulting a doctor if values are abnormal.`;
  }

  return null;
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post("/analysis/ai", async (req, res) => {
  // Auth already applied globally in index.js for /api routes
  try {
    const { analysisId, type, data } = req.body;
    const userId = req.user.uid;
    const userEmail = req.user.email;

    if (!type || !data) {
      return res.status(400).json({
        success: false,
        error: {
          code: "missing_params",
          message: "type and data are required",
        },
      });
    }

    const creditCost = CREDIT_COSTS[type];
    if (!creditCost) {
      return res.status(400).json({
        success: false,
        error: { code: "invalid_type", message: "Unknown analysis type" },
      });
    }

    // Ensure user row exists with default credits
    await ensureUserExists(userId, userEmail);

    // Check credits
    const credits = await getUserCredits(userId);
    if (credits < creditCost) {
      return res.status(402).json({
        success: false,
        error: {
          code: "insufficient_credits",
          message: "Not enough credits",
          creditsNeeded: creditCost,
          creditsAvailable: credits,
        },
      });
    }

    // Get child info for context (optional)
    let childInfo = null;
    if (analysisId) {
      const { data: analysis } = await supabase
        .from("medical_analyses")
        .select("child_id")
        .eq("id", analysisId)
        .single();

      if (analysis?.child_id) {
        const { data: child } = await supabase
          .from("children")
          .select("birth_date, gender")
          .eq("id", analysis.child_id)
          .single();

        if (child?.birth_date) {
          const birth = new Date(child.birth_date);
          const now = new Date();
          const ageMonths =
            (now.getFullYear() - birth.getFullYear()) * 12 +
            (now.getMonth() - birth.getMonth());
          childInfo = { ageMonths, gender: child.gender };
        }
      }
    }

    // Build prompt and call OpenAI
    const prompt = buildPrompt(type, data, childInfo);
    if (!prompt) {
      return res
        .status(400)
        .json({ success: false, error: { code: "invalid_type" } });
    }

    const aiResponse = await callAI(prompt);
    console.log("[AI] raw response:", aiResponse?.substring(0, 200));

    // Parse JSON response — handle markdown code blocks too
    let parsed = {};
    try {
      // Strip markdown code fences if present: ```json ... ```
      const cleaned = aiResponse
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      parsed = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { interpretation: cleaned || aiResponse, recommendations: [] };
    } catch {
      parsed = { interpretation: aiResponse, recommendations: [] };
    }

    // Ensure recommendations is always an array
    if (!Array.isArray(parsed.recommendations)) {
      parsed.recommendations = [];
    }

    // Deduct credits after successful AI call
    await deductCredits(userId, creditCost);

    // Log credit transaction
    await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        type: "ai_analysis",
        amount: -creditCost,
        balance_after: credits - creditCost,
        description: `${type} tahlili uchun ${creditCost} kredit`,
      })
      .catch(() => {});

    // Save AI result to analysis record
    if (analysisId) {
      await supabase
        .from("medical_analyses")
        .update({ ai_result: parsed, ai_analyzed_at: new Date().toISOString() })
        .eq("id", analysisId);
    }

    res.json({
      success: true,
      data: {
        ...parsed,
        creditsUsed: creditCost,
        creditsRemaining: credits - creditCost,
      },
    });
  } catch (err) {
    console.error("AI analysis error:", err.message);
    res.status(500).json({
      success: false,
      error: { code: "ai_failed", message: err.message },
    });
  }
});

module.exports = router;

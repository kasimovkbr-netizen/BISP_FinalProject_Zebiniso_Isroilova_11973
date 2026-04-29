"use strict";

const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");

// GET /api/knowledge?category=immunity
// Returns articles for a given category (public, no auth needed)
router.get("/knowledge", async (req, res) => {
  const { category } = req.query;

  try {
    let query = supabase
      .from("knowledge_base")
      .select(
        "id, title, title_uz, summary, summary_uz, content, content_uz, warning, category",
      )
      .order("created_at", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[knowledge] error:", err.message);
    res.status(500).json({
      success: false,
      error: { code: "knowledge_fetch_failed", message: err.message },
    });
  }
});

module.exports = router;

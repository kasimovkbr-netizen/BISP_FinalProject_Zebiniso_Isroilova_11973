/**
 * Knowledge Base Seed Script — Supabase version
 * Usage: node backend/scripts/seedKnowledgeBase.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { supabase } = require("../config/supabase");

const articles = [
  // ── HARMFUL ──────────────────────────────────────────────────────────────
  {
    title: "Aspirin and Children: A Dangerous Combination",
    category: "harmful",
    summary: "Why aspirin should never be given to children under 16.",
    content:
      "Aspirin (acetylsalicylic acid) can cause Reye's syndrome in children — a rare but life-threatening condition affecting the brain and liver. Always use paracetamol or ibuprofen instead when your child has a fever or pain. Consult your doctor before giving any medication.",
  },
  {
    title: "Antibiotic Overuse in Children",
    category: "harmful",
    summary: "How unnecessary antibiotics harm your child's health.",
    content:
      "Antibiotics only work against bacterial infections, not viruses. Overusing them destroys beneficial gut bacteria, weakens the immune system, and contributes to antibiotic resistance. Never give leftover antibiotics or use them without a doctor's prescription.",
  },
  {
    title: "Cough Syrups: What Parents Must Know",
    category: "harmful",
    summary:
      "Many over-the-counter cough medicines are unsafe for young children.",
    content:
      "The FDA warns against using cough and cold medicines in children under 4 years old. These products can cause serious side effects including rapid heart rate, convulsions, and even death. Use saline drops, honey (for children over 1), and steam inhalation instead.",
  },

  // ── IMMUNITY ─────────────────────────────────────────────────────────────
  {
    title: "5 Foods That Boost Your Child's Immunity",
    category: "immunity",
    summary: "Simple dietary changes to strengthen your child's immune system.",
    content:
      "1. Citrus fruits (vitamin C)\n2. Yogurt with live cultures (probiotics)\n3. Garlic (natural antimicrobial)\n4. Spinach and leafy greens (antioxidants)\n5. Almonds (vitamin E)\n\nIncorporate these into daily meals for long-term immune support.",
  },
  {
    title: "Sleep and Immunity: The Connection",
    category: "immunity",
    summary: "How proper sleep strengthens your child's defenses.",
    content:
      "During sleep, the body produces cytokines — proteins that fight infection and inflammation. Children aged 3–5 need 10–13 hours, ages 6–12 need 9–12 hours. Consistent bedtime routines, limiting screens before bed, and a dark quiet room all improve sleep quality.",
  },
  {
    title: "Outdoor Play and Immune Development",
    category: "immunity",
    summary: "Why letting children play outside builds stronger immunity.",
    content:
      "Exposure to diverse microbes in nature trains the immune system. Studies show children who spend more time outdoors have lower rates of allergies and autoimmune conditions. Aim for at least 1 hour of outdoor play daily, regardless of season.",
  },

  // ── VACCINES ─────────────────────────────────────────────────────────────
  {
    title: "Uzbekistan National Vaccination Schedule",
    category: "vaccines",
    summary: "Complete guide to mandatory vaccines for children in Uzbekistan.",
    content:
      "The national schedule includes:\n• BCG (at birth)\n• Hepatitis B (birth, 2, 4 months)\n• DTP + Polio (2, 3, 4 months)\n• Hib (2, 3, 4 months)\n• MMR (12 months)\n• Varicella (12 months)\n\nAll vaccines are free at state clinics. Keep your child's vaccination card safe.",
  },
  {
    title: "What to Expect After Vaccination",
    category: "vaccines",
    summary: "Normal reactions and when to call a doctor.",
    content:
      "Common normal reactions: mild fever (under 38.5°C), redness at injection site, fussiness for 1–2 days.\n\nCall your doctor if: fever exceeds 39°C, child cries inconsolably for more than 3 hours, severe swelling, or difficulty breathing.\n\nGive paracetamol for fever. Keep the injection site clean and dry.",
  },

  // ── HERBAL ───────────────────────────────────────────────────────────────
  {
    title: "Chamomile Tea for Children",
    category: "herbal",
    summary: "Safe and soothing herbal tea for digestive issues and sleep.",
    content:
      "Chamomile has mild anti-inflammatory and calming properties. It can help with colic, gas, and mild sleep difficulties in children over 6 months.\n\nPreparation: 1 teaspoon dried chamomile flowers in 200ml hot water, steep 5 minutes, strain, cool to room temperature. Give 50–100ml, 2–3 times daily.\n\nAvoid if child is allergic to ragweed or daisies.",
  },
  {
    title: "Ginger and Honey Drink for Colds",
    category: "herbal",
    summary: "A natural remedy to soothe sore throats and mild colds.",
    content:
      "For children over 1 year old:\n• 1 small slice fresh ginger\n• 1 teaspoon honey\n• Juice of half a lemon\n• 200ml warm water\n\nMix and give 2–3 times daily. Honey coats the throat and has antimicrobial properties. Never give honey to infants under 12 months (risk of botulism).",
  },

  // ── NUTRITION ────────────────────────────────────────────────────────────
  {
    title: "Iron-Rich Foods for Growing Children",
    category: "nutrition",
    summary: "Prevent iron deficiency anemia with the right diet.",
    content:
      "Iron deficiency is the most common nutritional deficiency in children. Good sources:\n• Red meat, chicken, fish\n• Lentils and beans\n• Fortified cereals\n• Spinach and dark leafy greens\n• Dried apricots and raisins\n\nPair iron-rich foods with vitamin C (orange juice, tomatoes) to improve absorption. Avoid giving milk within 1 hour of iron-rich meals.",
  },
  {
    title: "Healthy Snacks for School-Age Children",
    category: "nutrition",
    summary: "Nutritious snack ideas that children actually enjoy.",
    content:
      "Good snack options:\n• Apple slices with peanut butter\n• Yogurt with berries\n• Whole grain crackers with cheese\n• Carrot sticks with hummus\n• Hard-boiled eggs\n• Banana with a handful of nuts\n\nAvoid: chips, sugary drinks, candy, and processed snacks. Offer water or milk instead of juice.",
  },

  // ── SLEEP ────────────────────────────────────────────────────────────────
  {
    title: "Recommended Sleep Hours by Age",
    category: "sleep",
    summary: "How much sleep does your child really need?",
    content:
      "American Academy of Pediatrics recommendations:\n• Newborns (0–3 months): 14–17 hours\n• Infants (4–11 months): 12–15 hours\n• Toddlers (1–2 years): 11–14 hours\n• Preschool (3–5 years): 10–13 hours\n• School age (6–12 years): 9–12 hours\n• Teens (13–18 years): 8–10 hours\n\nConsistent sleep schedules, even on weekends, improve sleep quality.",
  },
  {
    title: "Creating a Bedtime Routine That Works",
    category: "sleep",
    summary: "Step-by-step guide to helping your child fall asleep faster.",
    content:
      "A consistent 20–30 minute bedtime routine signals the brain it's time to sleep:\n1. Bath or wash face/hands\n2. Put on pajamas\n3. Brush teeth\n4. Read 1–2 books together\n5. Dim lights, quiet time\n6. Goodnight kiss, lights out\n\nAvoid screens for at least 1 hour before bed. Keep the room cool (18–20°C) and dark.",
  },
];

async function seed() {
  console.log(`🌱 Seeding ${articles.length} articles to knowledge_base...`);

  let inserted = 0;
  let skipped = 0;

  for (const article of articles) {
    // Check if article with same title already exists
    const { data: existing } = await supabase
      .from("knowledge_base")
      .select("id")
      .eq("title", article.title)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("knowledge_base").insert({
      ...article,
      notified: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`  ❌ Failed to insert "${article.title}":`, error.message);
    } else {
      inserted++;
      console.log(`  ✅ ${article.title}`);
    }
  }

  console.log(`\n✅ Done: ${inserted} inserted, ${skipped} skipped.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

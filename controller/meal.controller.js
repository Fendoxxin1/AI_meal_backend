const Meal = require("../model/mealSchema");
const Groq = require("groq-sdk");
const dotenv = require("dotenv");

dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Kunlik me'yoriy maqsadlar
const DAILY_TARGETS = {
    calories: 3000, // kcal
    protein: 150, // gramm
    carbs: 350, // gramm
    fat: 80, // gramm
};

const addMeal = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res
                .status(400)
                .json({ error: "Oziq-ovqat matnini yuborish shart!" });
        }

        // YANGILANGAN KUCHLI PROMPT:
        const systemPrompt = `
You are a strict, mathematically precise Nutrition Calculator AI. 
Your task is to parse food items and calculate exact calories, protein, carbs, and fat based ONLY on standard 100g reference values.

NUTRITION REFERENCE DATABASE (per 100g of raw/standard portion):
- White bread (Oq non): 265 kcal | P: 9g | C: 49g | F: 3.2g
- Black / Rye bread (Qora non): 210 kcal | P: 8g | C: 43g | F: 1.2g
- Sugar (Shakar): 387 kcal | P: 0g | C: 100g | F: 0g (1 tsp ≈ 5g = 20 kcal)
- Rice / Cooked Rice (Guruch / Palov): 130 kcal | P: 2.7g | C: 28g | F: 0.3g
- Plov / Osh (Standard): 240 kcal | P: 8g | C: 25g | F: 12g
- Mastava / Soup: 110 kcal | P: 5g | C: 12g | F: 5g
- Beef / Meat (Mol go'shti): 250 kcal | P: 26g | C: 0g | F: 15g
- Chicken Breast (Tovuq filosi): 165 kcal | P: 31g | C: 0g | F: 3.6g
- Eggs (Tuxum): 155 kcal | P: 13g | C: 1.1g | F: 11g (1 medium egg ≈ 50g = 78 kcal)
- Milk (Sut 2.5%): 52 kcal | P: 2.8g | C: 4.7g | F: 2.5g
- Banana (Banan): 89 kcal | P: 1.1g | C: 23g | F: 0.3g
- Apple / Orange (Meva): 52 kcal | P: 0.3g | C: 14g | F: 0.2g
- Yogurt / Qatiq: 60 kcal | P: 3.5g | C: 4.7g | F: 3.2g
- Potato (Kartoshka): 77 kcal | P: 2g | C: 17g | F: 0.1g

CRITICAL MATHEMATICAL RULES:
1. Parse exact weight/grams from text. If user gives "2 ta tuxum", convert it to grams (2 * 50g = 100g).
2. Calculate each macro proportionally: (Weight_in_grams / 100) * Reference_Value.
3. MATHEMATICAL INTEGRITY: The root values (calories, protein, carbs, fat) MUST BE EXACTLY EQUAL to the sum of all item objects inside "items" array.
4. If an unknown food is entered, use standard culinary average values. Do NOT invent extreme numbers.

CRITICAL STEP-BY-STEP CALCULATION INSTRUCTION:
Before generating the final JSON, mentally perform the exact math step-by-step:
Step 1: Extract weight (e.g., 206g bread).
Step 2: Multiply weight by standard reference (206 * 2.65 / 100 = 5.459 * 100 = 545.9 kcal).
Step 3: Do the same for protein, carbs, and fat.
Step 4: Output the calculated numbers into the JSON.
Return ONLY a raw JSON object with this exact schema:
{
  "title": "Short summary title (e.g., Non va shakar)",
  "calories": Number,
  "protein": Number,
  "carbs": Number,
  "fat": Number,
  "items": [
    {
      "name": "Food Name (~weight)",
      "calories": Number,
      "protein": Number,
      "carbs": Number,
      "fat": Number
    }
  ]
}
`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text },
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            temperature: 0.1, // Aniq hisob-kitob uchun 0.2 ga tushirdik
        });

        const aiResult = JSON.parse(completion.choices[0].message.content);

        // Bazaga umumiy hisobni VA alohida items massivini ham saqlaymiz
        const savedMeal = await Meal.create({
            title: aiResult.title,
            calories: aiResult.calories,
            protein: aiResult.protein,
            carbs: aiResult.carbs,
            fat: aiResult.fat,
            items: aiResult.items || [], // <--- Alohida mahsulotlar ro'yxati
        });

        // ... (Qolgan hisob-kitoblar, startOfDay, endOfDay va foizlar o'zgarishsiz qoladi)

        // 3. BUGUNGI KUNNING Boshlanish va Tugash vaqtini aniqlaymiz
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todayMeals = await Meal.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        });

        const todayTotals = todayMeals.reduce(
            (acc, meal) => {
                acc.calories += meal.calories;
                acc.protein += meal.protein;
                acc.carbs += meal.carbs;
                acc.fat += meal.fat;
                return acc;
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );

        const percentages = {
            calories: Number(
                ((todayTotals.calories / DAILY_TARGETS.calories) * 100).toFixed(
                    1,
                ),
            ),
            protein: Number(
                ((todayTotals.protein / DAILY_TARGETS.protein) * 100).toFixed(
                    1,
                ),
            ),
            carbs: Number(
                ((todayTotals.carbs / DAILY_TARGETS.carbs) * 100).toFixed(1),
            ),
            fat: Number(
                ((todayTotals.fat / DAILY_TARGETS.fat) * 100).toFixed(1),
            ),
        };

        return res.status(201).json({
            success: true,
            addedMeal: savedMeal,
            today: {
                totals: todayTotals,
                targets: DAILY_TARGETS,
                percentages: percentages,
            },
        });
    } catch (error) {
        console.error("Meal Controller Xatosi:", error);
        return res.status(500).json({
            error: "Serverda xatolik yuz berdi",
            details: error.message,
        });
    }
};

const getMeal = async (req, res) => {
    try {
        const data = await Meal.find();
        if (!data) return res.status(404).json({ message: "Data topilmadi" });
        res.status(200).json({ success: true, innerData: data });
    } catch (err) {
        res.status(500).json({
            message: "Internel server error",
            error: err.message,
        });
    }
};

module.exports = {
    addMeal,
    getMeal,
};

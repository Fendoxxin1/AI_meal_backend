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
- White bread (Oq non): 265 kcal | Protein: 9g | Carbs: 49g | Fat: 3.2g
- Black / Rye bread (Qora non): 210 kcal | Protein: 8g | Carbs: 43g | Fat: 1.2g
- Sugar (Shakar): 387 kcal | Protein: 0g | Carbs: 100g | Fat: 0g 
- Rice / Cooked Rice (Guruch / Palov): 130 kcal | Protein: 2.7g | Carbs: 28g | Fat: 0.3g
- Plov / Osh (Standard): 240 kcal | Protein: 8g | Carbs: 25g | Fat: 12g
- Mastava / Soup: 110 kcal | Protein: 5g | Carbs: 12g | Fat: 5g
- Beef / Meat (Mol go'shti): 250 kcal | Protein: 26g | Carbs: 0g | Fat: 15g
- Chicken Breast (Tovuq filosi): 165 kcal | Protein: 31g | Carbs: 0g | Fat: 3.6g
- Eggs (Tuxum): 155 kcal | Protein: 13g | Carbs: 1.1g | Fat: 11g (1 medium egg ≈ 50g = 78 kcal)
- Milk (Sut 2.5%): 52 kcal | Protein: 2.8g | Carbs: 4.7g | Fat: 2.5g
- Banana (Banan): 89 kcal | Protein: 1.1g | Carbs: 23g | Fat: 0.3g
- Apple / Orange (Meva): 52 kcal | Protein: 0.3g | Carbs: 14g | Fat: 0.2g
- Yogurt / Qatiq: 60 kcal | Protein: 3.5g | Carbs: 4.7g | Fat: 3.2g
- Potato (Kartoshka): 77 kcal | Protein: 2g | Carbs: 17g | Fat: 0.1g


CRITICAL MATHEMATICAL RULES:
1. Parse exact weight/grams from text. If user gives "2 ta tuxum", convert it to grams (2 * 50g = 100g).
2. Calculate each macro proportionally: (Weight_in_grams / 100) * Reference_Value.
3. MATHEMATICAL INTEGRITY: The root values (calories, protein, carbs, fat) MUST BE EXACTLY EQUAL to the sum of all item objects inside "items" array.
4. If an unknown food is entered, use standard culinary average values. Do NOT invent extreme numbers.

JSON FORMAT RULES:
1. Return ONLY valid JSON format.
2. NEVER use mathematical expressions like addition (+) inside JSON values. Always evaluate the final sum mentally and write ONLY the final number (e.g., "calories": 584.6, NOT "calories": 545.9 + 38.7).
3. The gram weight of Carbohydrates, Protein, or Fat can NEVER be greater than the item's total weight in grams.

CRITICAL MATH AND JSON RULES:
1. Always ROUND all calculated numbers (calories, protein, carbs, fat) to 1 decimal place or whole integers (e.g., write 101 or 101.1 instead of 101.14; write 6.6 instead of 6.592).
2. Return ONLY valid JSON. NEVER use addition symbols (+) or mathematical expressions inside JSON values. Write ONLY the final calculated sum.

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
"CRITICAL RULE: The gram weight of Carbohydrates, Protein, or Fat for any item can NEVER be greater than the item's total weight in grams!"
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

        // 1. AI'dan kelgan javob (res)
        const aiResult = JSON.parse(completion.choices[0].message.content);

        // 2. Ildiz qiymatlarini AI'ga ishonmasdan, items ichidan aniq matematik hisoblab olamiz:
        const exactTotals = aiResult.items.reduce(
            (acc, item) => ({
                calories:
                    Math.round(
                        (acc.calories + (Number(item.calories) || 0)) * 10,
                    ) / 10,
                protein:
                    Math.round(
                        (acc.protein + (Number(item.protein) || 0)) * 10,
                    ) / 10,
                carbs:
                    Math.round((acc.carbs + (Number(item.carbs) || 0)) * 10) /
                    10,
                fat: Math.round((acc.fat + (Number(item.fat) || 0)) * 10) / 10,
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );

        // 3. Bazaga AI berganni emas, EXACT (aniq) hisoblangan qiymatni saqlaymiz:
        const savedMeal = new Meal({
            title: aiResult.title,
            calories: exactTotals.calories, // <-- Aniq hisoblangan summani yozamiz
            protein: exactTotals.protein,
            carbs: exactTotals.carbs,
            fat: exactTotals.fat,
            items: aiResult.items,
        });

        await savedMeal.save();

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

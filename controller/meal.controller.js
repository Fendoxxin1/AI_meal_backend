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
        const systemPrompt = `Siz professional dietolog-nutritsiologsiz. Foydalanuvchi o'z ovqatlarini yozadi.
Sizning vazifangiz:
1. Agar mahsulot soni (masalan, "2 ta banan" yoki "4 ta tuxum") berilgan bo'lsa, uning o'rtacha standart og'irligini grammda aniqlang (masalan, 1 ta o'rtacha banan = ~150g, 1 ta tuxum = ~50g).
2. Har bir mahsulotning nomi yoninga uning taxminiy grammini yozing: "2 ta banan (~300g)".
3. Har bir mahsulotning alohida kaloriya va makrolarini hisoblang.
4. Barcha mahsulotlarning umumiy yig'indisini ham ko'rsating.

FAQAT VA FAQAT quyidagi JSON formatda javob qaytaring, hech qanday qo'shimcha matn yozmang:
{
  "title": "Barcha yeyilgan ovqatlarning qisqa umumiy nomi (o'zbek tilida)",
  "calories": jami_kaloriya_soni,
  "protein": jami_oqsil_soni,
  "carbs": jami_uglevod_soni,
  "fat": jami_yog_soni,
  "items": [
    {
      "name": "Mahsulot nomi va taxminiy og'irligi, masalan: 2 ta banan (~300g)",
      "calories": shu_mahsulot_kaloriyasi,
      "protein": shu_mahsulot_oqsili,
      "carbs": shu_mahsulot_uglevodi,
      "fat": shu_mahsulot_yogi
    }
  ]
}`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text },
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            temperature: 0.2, // Aniq hisob-kitob uchun 0.2 ga tushirdik
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
        return res
            .status(500)
            .json({
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

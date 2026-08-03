const express = require("express");
const { addMeal, getMeal } = require("../controller/meal.controller");

const router = express.Router();

/**
 * @swagger
 * /api/meals:
 *   post:
 *     summary: Yangi ovqat qo'shish va AI orqali Kcal/Macrolarni hisoblash
 *     description: Foydalanuvchi matn shaklida yegan ovqatini yuboradi, AI uni tahlil qilib bazaga saqlaydi va bugungi jami kaloriyalar foizini hisoblab beradi.
 *     tags: [Meals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 example: "2 ta qovurilgan tuxum va 300 gram oq non"
 *                 description: Foydalanuvchi iste'mol qilgan oziq-ovqatlar ro'yxati
 *     responses:
 *       201:
 *         description: Ovqat muvaffaqiyatli saqlandi va AI tomonidan tahlil qilindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 addedMeal:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                       example: "2 ta qovurilgan tuxum va 300g oq non"
 *                     calories:
 *                       type: number
 *                       example: 970
 *                     protein:
 *                       type: number
 *                       example: 38
 *                     carbs:
 *                       type: number
 *                       example: 150
 *                     fat:
 *                       type: number
 *                       example: 24
 *                 today:
 *                   type: object
 *                   properties:
 *                     totals:
 *                       type: object
 *                       example: { calories: 970, protein: 38, carbs: 150, fat: 24 }
 *                     targets:
 *                       type: object
 *                       example: { calories: 3000, protein: 150, carbs: 350, fat: 80 }
 *                     percentages:
 *                       type: object
 *                       example: { calories: 32.3, protein: 25.3, carbs: 42.9, fat: 30.0 }
 *       400:
 *         description: Matn kiritilmagan bo'lsa xatolik qaytaradi
 *       500:
 *         description: Server yoki Groq API xatosi
 */
router.post("/meals", addMeal);

/**
 * @swagger
 * /api/meal:
 *   get:
 *     summary: Bugungi ovqatlanishlar ro'yxati va kunlik statistikani olish
 *     description: Bugungi kun davomida iste'mol qilingan barcha ovqatlarni, shuningdek, kunlik yig'indi (totals), me'yor (targets) va foizlarni (percentages) qaytaradi.
 *     tags: [Meals]
 *     responses:
 *       200:
 *         description: Bugungi ovqatlar va kunlik statistika muvaffaqiyatli olindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   description: Bugungi yeyilgan ovqatlar soni
 *                   example: 3
 *                 meals:
 *                   type: array
 *                   description: Bugungi ovqatlar ro'yxati
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "66a3f4e19d..."
 *                       title:
 *                         type: string
 *                         example: "2 ta qovurilgan tuxum va 300g oq non"
 *                       calories:
 *                         type: number
 *                         example: 970
 *                       protein:
 *                         type: number
 *                         example: 38
 *                       carbs:
 *                         type: number
 *                         example: 150
 *                       fat:
 *                         type: number
 *                         example: 24
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-08-01T16:08:00.000Z"
 *                 today:
 *                   type: object
 *                   properties:
 *                     totals:
 *                       type: object
 *                       example: { calories: 1450, protein: 75, carbs: 210, fat: 40 }
 *                     targets:
 *                       type: object
 *                       example: { calories: 3000, protein: 150, carbs: 350, fat: 80 }
 *                     percentages:
 *                       type: object
 *                       example: { calories: 48.3, protein: 50.0, carbs: 60.0, fat: 50.0 }
 *       500:
 *         description: Serverda xatolik yuz berdi
 */
router.get("/meal", getMeal);

module.exports = router;

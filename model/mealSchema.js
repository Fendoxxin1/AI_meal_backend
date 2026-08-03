const mongoose = require("mongoose");

const mealSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: false },
    title: { type: String, required: true }, // Masalan: "Banan, tuxum, yogurt va yong'oq"
    calories: { type: Number, required: true }, // Jami kaloriya
    protein: { type: Number, required: true },  // Jami oqsil
    carbs: { type: Number, required: true },    // Jami uglevod
    fat: { type: Number, required: true },      // Jami yog'
    
    // YANGI QUSHILGAN QISM: Har bir mahsulotning alohida hisobi
    items: [
      {
        name: { type: String },     // Masalan: "2 ta banan (~300g)"
        calories: { type: Number }, // Faqat bananning kaloriyasi
        protein: { type: Number },
        carbs: { type: Number },
        fat: { type: Number },
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Meal", mealSchema);
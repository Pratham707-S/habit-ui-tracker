import mongoose, { type InferSchemaType, type Model } from "mongoose"

const HabitSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // YYYY-MM (e.g. "2026-03")
    month: { type: String, required: true, index: true },
    days: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Keeping existing UI data without redesigning layout
    emoji: { type: String, default: "⏰" },
    goal: { type: Number, default: 30 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

HabitSchema.index({ userId: 1, month: 1 })

export type HabitDoc = InferSchemaType<typeof HabitSchema> & {
  _id: mongoose.Types.ObjectId
}

export const Habit: Model<HabitDoc> =
  (mongoose.models.Habit as Model<HabitDoc>) ||
  mongoose.model<HabitDoc>("Habit", HabitSchema)


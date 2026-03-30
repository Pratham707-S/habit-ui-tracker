import { NextResponse } from "next/server"
import { z } from "zod"

import { connectToDatabase } from "@/lib/mongoose"
import { Habit } from "@/models/Habit"

const SHARED_HABIT_OWNER_ID = "000000000000000000000001"

const PatchSchema = z.object({
  completedDays: z.record(z.boolean()).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  await connectToDatabase()
  const updated = await Habit.findOneAndUpdate(
    { _id: id, userId: SHARED_HABIT_OWNER_ID },
    { $set: { days: parsed.data.completedDays ?? {} } },
    { new: true }
  ).lean()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    habit: {
      id: updated._id.toString(),
      name: updated.title,
      emoji: updated.emoji ?? "⏰",
      goal: updated.goal ?? 30,
      completedDays: (updated.days ?? {}) as Record<string, boolean>,
    },
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectToDatabase()
  const deleted = await Habit.findOneAndDelete({ _id: id, userId: SHARED_HABIT_OWNER_ID }).lean()
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ ok: true })
}

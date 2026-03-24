import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { connectToDatabase } from "@/lib/mongoose"
import { Habit } from "@/models/Habit"

const PatchSchema = z.object({
  completedDays: z.record(z.boolean()).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const json = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  await connectToDatabase()
  const updated = await Habit.findOneAndUpdate(
    { _id: id, userId },
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
  const session = await auth()
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await connectToDatabase()
  const deleted = await Habit.findOneAndDelete({ _id: id, userId }).lean()
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ ok: true })
}


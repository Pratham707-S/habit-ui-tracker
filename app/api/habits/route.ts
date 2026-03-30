import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { connectToDatabase } from "@/lib/mongoose"
import { Habit } from "@/models/Habit"

function currentMonthKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

const MonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Invalid month. Use YYYY-MM.")

const CreateHabitSchema = z.object({
  name: z.string().min(1),
  emoji: z.string().min(1).optional(),
  goal: z.number().int().positive().optional(),
  month: MonthSchema.optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const monthParam = url.searchParams.get("month")
  const monthParsed = monthParam ? MonthSchema.safeParse(monthParam) : null
  const month = monthParsed?.success ? monthParsed.data : currentMonthKey()

  await connectToDatabase()
  const habits = await Habit.find({ userId, month }).sort({ createdAt: 1 }).lean()

  return NextResponse.json({
    month,
    habits: habits.map((h) => ({
      id: h._id.toString(),
      name: h.title,
      emoji: h.emoji ?? "⏰",
      goal: h.goal ?? 30,
      completedDays: (h.days ?? {}) as Record<string, boolean>,
    })),
  })
}

export async function POST(req: Request) {
  const session = await auth()
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = CreateHabitSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  await connectToDatabase()
  const month = parsed.data.month ?? currentMonthKey()
  const created = await Habit.create({
    title: parsed.data.name,
    userId,
    month,
    days: {},
    emoji: parsed.data.emoji ?? "⏰",
    goal: parsed.data.goal ?? 30,
  })

  return NextResponse.json(
    {
      habit: {
        id: created._id.toString(),
        name: created.title,
        emoji: created.emoji ?? "⏰",
        goal: created.goal ?? 30,
        completedDays: (created.days ?? {}) as Record<string, boolean>,
      },
    },
    { status: 201 }
  )
}

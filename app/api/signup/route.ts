import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"

import { connectToDatabase } from "@/lib/mongoose"
import { User } from "@/models/User"

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = SignupSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  await connectToDatabase()

  const email = parsed.data.email.toLowerCase()
  const existing = await User.findOne({ email }).lean()
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }

  const password = await bcrypt.hash(parsed.data.password, 12)
  const created = await User.create({ email, password })

  return NextResponse.json(
    { id: created._id.toString(), email: created.email },
    { status: 201 }
  )
}


import type { NextAuthOptions } from "next-auth"
import { getServerSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"

import { connectToDatabase } from "@/lib/mongoose"
import { User } from "@/models/User"

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = CredentialsSchema.safeParse(raw)
        if (!parsed.success) return null

        await connectToDatabase()
        const email = parsed.data.email.toLowerCase()
        const user = await User.findOne({ email }).lean()
        if (!user) return null

        const ok = await bcrypt.compare(parsed.data.password, user.password)
        if (!ok) return null

        return { id: user._id.toString(), email: user.email }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user && "id" in user && typeof user.id === "string") token.sub = user.id
      return token
    },
    session: async ({ session, token }) => {
      if (session.user && token.sub) {
        ;(session.user as { id?: string }).id = token.sub
      }
      return session
    },
  },
}

export function auth() {
  return getServerSession(authOptions)
}

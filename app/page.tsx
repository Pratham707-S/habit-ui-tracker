import { redirect } from "next/navigation"

import { auth } from "@/auth"

export default async function Home() {
  // Keep UI on /dashboard; send users where they belong
  const session = await auth()
  if (!session?.user) redirect("/login")
  redirect("/dashboard")
}

// Force rebuild - MongoDB env vars loaded

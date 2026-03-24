"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemeToggle } from "@/components/theme-toggle"

interface Habit {
  id: string
  name: string
  emoji: string
  goal: number
  completedDays: Record<string, boolean>
}

const habitEmojis = [
  { emoji: "⏰", label: "Alarm" },
  { emoji: "🚫", label: "No" },
  { emoji: "💧", label: "Water" },
  { emoji: "🏋️", label: "Workout" },
  { emoji: "🧘", label: "Yoga" },
  { emoji: "📚", label: "Book" },
  { emoji: "🧠", label: "Meditation" },
  { emoji: "📖", label: "Study" },
  { emoji: "✨", label: "Skincare" },
  { emoji: "📱", label: "Phone" },
  { emoji: "🍷", label: "Drink" },
  { emoji: "💰", label: "Money" },
  { emoji: "🏃", label: "Run" },
  { emoji: "😴", label: "Sleep" },
  { emoji: "🥗", label: "Healthy" },
  { emoji: "✍️", label: "Write" },
]

const defaultHabits: Habit[] = [
  { id: "1", name: "Wake up at 6AM", emoji: "⏰", goal: 30, completedDays: {} },
  { id: "2", name: "No Snoozing", emoji: "🚫", goal: 30, completedDays: {} },
  { id: "3", name: "Drink 3L Water", emoji: "💧", goal: 30, completedDays: {} },
  { id: "4", name: "Gym Workout", emoji: "🏋️", goal: 20, completedDays: {} },
  { id: "5", name: "Stretching", emoji: "🧘", goal: 30, completedDays: {} },
  { id: "6", name: "Read 10 Pages", emoji: "📚", goal: 30, completedDays: {} },
  { id: "7", name: "Meditation", emoji: "🧠", goal: 30, completedDays: {} },
  { id: "8", name: "Study 1 Hour", emoji: "📖", goal: 25, completedDays: {} },
  { id: "9", name: "Skincare Routine", emoji: "✨", goal: 30, completedDays: {} },
  { id: "10", name: "Limit Social Media", emoji: "📱", goal: 30, completedDays: {} },
  { id: "11", name: "No Alcohol", emoji: "🚫", goal: 30, completedDays: {} },
  { id: "12", name: "Track Expenses", emoji: "💰", goal: 30, completedDays: {} },
]

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function generateWeeks(numWeeks: number) {
  const weeks = []
  for (let w = 0; w < numWeeks; w++) {
    const days = []
    for (let d = 0; d < 7; d++) {
      days.push({
        dayName: dayNames[d],
        dayNumber: w * 7 + d + 1,
        key: `w${w}-d${d}`,
      })
    }
    weeks.push({ weekNumber: w + 1, days })
  }
  return weeks
}

function currentMonthKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

const MONTH_STORAGE_KEY = "habit-tracker-month"

export function HabitTracker() {
  const { data: session } = useSession()
  const [habits, setHabits] = useState<Habit[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [savingHabitIds, setSavingHabitIds] = useState<Record<string, boolean>>({})
  const [deletingHabitIds, setDeletingHabitIds] = useState<Record<string, boolean>>({})
  const [newHabitName, setNewHabitName] = useState("")
  const [newHabitEmoji, setNewHabitEmoji] = useState("⏰")
  const [newHabitGoal, setNewHabitGoal] = useState("30")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(0)
  const numWeeks = 4
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    if (typeof window === "undefined") return currentMonthKey()
    return localStorage.getItem(MONTH_STORAGE_KEY) ?? currentMonthKey()
  })

  useEffect(() => {
    try {
      localStorage.setItem(MONTH_STORAGE_KEY, currentMonth)
    } catch {}
  }, [currentMonth])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsFetching(true)
      try {
        const res = await fetch(`/api/habits?month=${encodeURIComponent(currentMonth)}`, {
          cache: "no-store",
        })
        if (!res.ok) throw new Error("Failed to load")
        const data = (await res.json()) as { habits: Habit[] }
        if (!cancelled) {
          if (data.habits?.length) {
            setHabits(data.habits)
          } else {
            // First-time user: seed defaults to preserve the existing UI experience.
            const created: Habit[] = []
            for (const h of defaultHabits) {
              const r = await fetch("/api/habits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: h.name,
                  emoji: h.emoji,
                  goal: h.goal,
                  month: currentMonth,
                }),
              })
              if (r.ok) {
                const body = (await r.json()) as { habit: Habit }
                created.push(body.habit)
              }
            }
            setHabits(created.length ? created : [])
          }
          setIsLoaded(true)
          setIsFetching(false)
        }
      } catch {
        if (!cancelled) {
          // If API fails (e.g. DB not configured yet), keep UI usable.
          setHabits(defaultHabits)
          setIsLoaded(true)
          setIsFetching(false)
          toast.error("Could not load habits from server")
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [currentMonth])

  const weeks = generateWeeks(numWeeks)

  const toggleDay = async (habitId: string, dayKey: string) => {
    if (savingHabitIds[habitId]) return
    setSavingHabitIds((prev) => ({ ...prev, [habitId]: true }))
    // Optimistic update
    const prevHabits = habits
    const next = habits.map((habit) => {
      if (habit.id !== habitId) return habit
      const completedDays = { ...habit.completedDays, [dayKey]: !habit.completedDays[dayKey] }
      return { ...habit, completedDays }
    })
    setHabits(next)

    const updated = next.find((h) => h.id === habitId)
    if (!updated) {
      setSavingHabitIds((prev) => ({ ...prev, [habitId]: false }))
      return
    }
    try {
      const res = await fetch(`/api/habits/${habitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedDays: updated.completedDays }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("Habit updated")
    } catch {
      setHabits(prevHabits)
      toast.error("Failed to update habit")
    } finally {
      setSavingHabitIds((prev) => ({ ...prev, [habitId]: false }))
    }
  }

  const addHabit = async () => {
    if (!newHabitName.trim()) return
    if (isCreating) return
    setIsCreating(true)
    const goal = parseInt(newHabitGoal) || 30
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newHabitName, emoji: newHabitEmoji, goal, month: currentMonth }),
    }).catch(() => null)

    if (res && res.ok) {
      const data = (await res.json()) as { habit: Habit }
      setHabits((prev) => [...prev, data.habit])
      toast.success("Habit created")
    } else {
      // Fallback: keep UX working even if DB isn't configured.
      const newHabit: Habit = {
        id: Date.now().toString(),
        name: newHabitName,
        emoji: newHabitEmoji,
        goal,
        completedDays: {},
      }
      setHabits((prev) => [...prev, newHabit])
      toast.error("Failed to create habit")
    }

    setNewHabitName("")
    setNewHabitEmoji("⏰")
    setNewHabitGoal("30")
    setDialogOpen(false)
    setIsCreating(false)
  }

  const deleteHabit = async (habitId: string) => {
    if (deletingHabitIds[habitId]) return
    setDeletingHabitIds((prev) => ({ ...prev, [habitId]: true }))
    setHabits((prev) => prev.filter((h) => h.id !== habitId))
    try {
      const res = await fetch(`/api/habits/${habitId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast.success("Habit deleted")
    } catch {
      toast.error("Failed to delete habit")
    } finally {
      setDeletingHabitIds((prev) => ({ ...prev, [habitId]: false }))
    }
  }

  const getCompletedCount = (habit: Habit) => {
    return Object.values(habit.completedDays).filter(Boolean).length
  }

  const getProgressPercent = (habit: Habit) => {
    const completed = getCompletedCount(habit)
    const goal = habit.goal || 0
    if (goal <= 0) return 0
    return Math.min(100, Math.round((completed / goal) * 100))
  }

  const getWeekCompletedCount = (habit: Habit, weekIndex: number) => {
    return weeks[weekIndex].days.filter((day) => habit.completedDays[day.key]).length
  }

  // Show loading state until data is loaded from localStorage
  if (!isLoaded || isFetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm">Loading your habits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background border-b border-border px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              Habit Tracker
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Turn your life into a game
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session?.user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Logout
              </Button>
            ) : null}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Habit</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Habit</DialogTitle>
                  <DialogDescription>
                    Create a new habit to track daily
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Habit Name</label>
                    <Input
                      placeholder="e.g., Wake up at 6AM"
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Icon</label>
                    <Select value={newHabitEmoji} onValueChange={setNewHabitEmoji}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {habitEmojis.map((item) => (
                          <SelectItem key={item.emoji} value={item.emoji}>
                            <span className="flex items-center gap-2">
                              <span>{item.emoji}</span>
                              <span>{item.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Monthly Goal</label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={newHabitGoal}
                      onChange={(e) => setNewHabitGoal(e.target.value)}
                    />
                  </div>
                  <Button onClick={addHabit} className="w-full" disabled={isCreating}>
                    {isCreating ? "Saving..." : "Add Habit"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Mobile View - Week Selector & Card View */}
      <div className="lg:hidden">
        {/* Week Navigation */}
        <div className="sticky top-[73px] z-20 bg-background border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
              disabled={currentWeek === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="font-semibold text-foreground">
              Week {currentWeek + 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeek(Math.min(numWeeks - 1, currentWeek + 1))}
              disabled={currentWeek === numWeeks - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mt-3">
            {weeks[currentWeek].days.map((day) => (
              <div key={day.key} className="text-center">
                <div className="text-[10px] text-muted-foreground">{day.dayName}</div>
                <div className="text-xs font-bold text-foreground">{day.dayNumber}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Habit Cards */}
        <div className="p-4 space-y-3">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="bg-card border border-border rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{habit.emoji}</span>
                  <div>
                    <div className="font-medium text-foreground text-sm">
                      {habit.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getCompletedCount(habit)}/{habit.goal} completed
                    </div>
                    <div className="mt-2">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${getProgressPercent(habit)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {getProgressPercent(habit)}%
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteHabit(habit.id)}
                  disabled={!!deletingHabitIds[habit.id]}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                  aria-label="Delete habit"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
              {/* Weekly checkboxes */}
              <div className="grid grid-cols-7 gap-1">
                {weeks[currentWeek].days.map((day) => (
                  <button
                    key={day.key}
                    onClick={() => toggleDay(habit.id, day.key)}
                    disabled={!!savingHabitIds[habit.id]}
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all ${
                      habit.completedDays[day.key]
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border hover:border-primary/50 bg-background"
                    }`}
                    aria-label={`Mark ${habit.name} for day ${day.dayNumber}`}
                  >
                    {habit.completedDays[day.key] && (
                      <Check className="w-4 h-4" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
              {/* Week progress bar */}
              <div className="mt-3">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${(getWeekCompletedCount(habit, currentWeek) / 7) * 100}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 text-right">
                  {getWeekCompletedCount(habit, currentWeek)}/7 this week
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop View - Spreadsheet */}
      <div className="hidden lg:block p-6">
        <div className="max-w-full mx-auto">
          <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  {/* Week headers row */}
                  <tr className="bg-muted">
                    <th className="sticky left-0 z-20 bg-muted border-b border-r border-border p-2 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground w-10">
                      #
                    </th>
                    <th className="sticky left-10 z-20 bg-muted border-b border-r border-border p-2 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[200px]">
                      Daily Habits
                    </th>
                    <th className="bg-muted border-b border-r border-border p-2 text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground w-16">
                      Goals
                    </th>
                    {weeks.map((week) => (
                      <th
                        key={week.weekNumber}
                        colSpan={7}
                        className="bg-muted border-b border-r border-border p-2 text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground"
                      >
                        Week {week.weekNumber}
                      </th>
                    ))}
                    <th className="bg-muted border-b border-border p-2 text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground w-16">
                      Done
                    </th>
                  </tr>
                  {/* Day names row */}
                  <tr className="bg-muted/50">
                    <th className="sticky left-0 z-20 bg-muted/50 border-b border-r border-border p-1"></th>
                    <th className="sticky left-10 z-20 bg-muted/50 border-b border-r border-border p-1"></th>
                    <th className="bg-muted/50 border-b border-r border-border p-1"></th>
                    {weeks.map((week) =>
                      week.days.map((day) => (
                        <th
                          key={day.key}
                          className="bg-muted/50 border-b border-r border-border p-1 text-center min-w-[36px]"
                        >
                          <div className="text-[10px] font-medium text-muted-foreground">
                            {day.dayName}
                          </div>
                          <div className="text-xs font-bold text-foreground">
                            {day.dayNumber}
                          </div>
                        </th>
                      ))
                    )}
                    <th className="bg-muted/50 border-b border-border p-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {habits.map((habit, index) => (
                    <tr
                      key={habit.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/30 border-b border-r border-border p-2 text-center text-sm text-muted-foreground font-medium">
                        {index + 1}
                      </td>
                      <td className="sticky left-10 z-10 bg-card group-hover:bg-muted/30 border-b border-r border-border p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{habit.emoji}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {habit.name}
                            </div>
                            <div className="mt-1">
                              <div className="h-1 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${getProgressPercent(habit)}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-1">
                                {getCompletedCount(habit)}/{habit.goal} • {getProgressPercent(habit)}%
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteHabit(habit.id)}
                            disabled={!!deletingHabitIds[habit.id]}
                            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                            aria-label="Delete habit"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </td>
                      <td className="border-b border-r border-border p-2 text-center text-sm font-semibold text-foreground">
                        {habit.goal}
                      </td>
                      {weeks.map((week) =>
                        week.days.map((day) => (
                          <td
                            key={day.key}
                            className="border-b border-r border-border p-1 text-center"
                          >
                            <button
                              onClick={() => toggleDay(habit.id, day.key)}
                              disabled={!!savingHabitIds[habit.id]}
                              className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-all duration-150 ${
                                habit.completedDays[day.key]
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-border hover:border-primary/60 bg-background"
                              }`}
                              aria-label={`Mark ${habit.name} as ${habit.completedDays[day.key] ? "incomplete" : "complete"} for day ${day.dayNumber}`}
                            >
                              {habit.completedDays[day.key] && (
                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                              )}
                            </button>
                          </td>
                        ))
                      )}
                      <td className="border-b border-border p-2 text-center">
                        <span
                          className={`text-sm font-bold ${
                            getCompletedCount(habit) >= habit.goal
                              ? "text-primary"
                              : "text-foreground"
                          }`}
                        >
                          {getCompletedCount(habit)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          /{habit.goal}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">
                {habits.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Habits</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">
                {habits.reduce((acc, h) => acc + getCompletedCount(h), 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Completions
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">
                {habits.reduce((acc, h) => acc + h.goal, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Goals</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">
                {habits.length > 0
                  ? Math.round(
                      (habits.reduce((acc, h) => acc + getCompletedCount(h), 0) /
                        habits.reduce((acc, h) => acc + h.goal, 0)) *
                        100
                    ) || 0
                  : 0}
                %
              </div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="lg:hidden p-4 pt-0">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="text-xl font-bold text-foreground">
              {habits.length}
            </div>
            <div className="text-xs text-muted-foreground">Habits</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="text-xl font-bold text-primary">
              {habits.reduce((acc, h) => acc + getCompletedCount(h), 0)}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>
      </div>
    </div>
  )
}

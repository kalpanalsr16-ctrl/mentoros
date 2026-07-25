/**
 * Icon sourcing decision: Lucide (docs/design-system/03-Component-Library.md
 * §8.1) — MIT-licensed, stroke-based, tree-shakeable. This file is the
 * single swap point named in that doc's own reasoning: every consumer
 * imports icons from here, never directly from `lucide-react`, so the
 * icon set can change in one place if it ever needs to.
 *
 * Only the icons Sprint 1's Application Shell actually needs are
 * re-exported — add more here as later sprints need them, rather than
 * re-exporting Lucide's entire set unused.
 */
export {
  Menu as MenuIcon,
  X as CloseIcon,
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  LogOut as LogOutIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  Monitor as SystemThemeIcon,
  LayoutDashboard as DashboardIcon,
  Users as ClassesIcon,
  BookOpen as CurriculumIcon,
  BarChart3 as ReportsIcon,
  Eye as ViewReasoningIcon,
  Workflow as TransparencyIcon,
  RotateCcw as RetryIcon,
  Square as CancelIcon,
  Flame as StreakIcon,
  Award as AchievementIcon,
  NotebookPen as LessonPlanIcon,
  ClipboardCheck as AssessmentBuilderIcon,
  Plus as AddIcon,
  UserMinus as RemoveStudentIcon,
  Printer as PrintIcon,
  Gauge as EvaluationIcon,
} from "lucide-react";

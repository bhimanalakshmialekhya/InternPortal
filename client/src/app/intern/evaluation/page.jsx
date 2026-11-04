"use client"
import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import InternSidebar from "../../../lib/internSidebar"
import { getInternUser, resolveInternName, getInternPhoto, DEFAULT_INTERN_AVATAR } from "../../../lib/api"
import { getAssignedRole } from "../../../lib/assessmentData"
import {
  getEvaluationsForIntern,
  getSubmissionsForIntern,
  gradeLabel,
  DEFAULT_RUBRICS,
  KEY_INTERN_EVALUATIONS,
  KEY_INTERN_SUBMISSIONS,
  downloadSubmissionFile,
} from "../../../lib/evaluationSync"
import {
  getSaved15DayTests,
  getSavedWeeklyFeedback,
  getMentorForRole,
  KEY_15_DAY_TESTS,
  KEY_WEEKLY_FEEDBACK,
} from "../../../lib/milestoneTestAndFeedback"
import MilestoneTestModal from "../../../components/MilestoneTestModal"
import {
  Star, Clock, CheckCircle2, FileText, User, Award, Calendar,
  Sparkles, TrendingUp, CheckCircle, ChevronRight, BookOpen,
  AlertCircle, RotateCcw, Download, ShieldCheck, MessageSquare,
  ThumbsUp, ExternalLink, X, HelpCircle, Layers, ArrowRight
} from "lucide-react"
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

export default function InternEvaluationPage() {
  const router = useRouter()
  const [user, setUser] = useState({})
  const [assignedRole, setAssignedRole] = useState("Backend Developer")
  const [activeTab, setActiveTab] = useState("overview") // "overview" | "15day" | "weekly" | "tasks"

  // 15-Day Milestone Tests State
  const [tests15Day, setTests15Day] = useState([])
  const [activeSprint, setActiveSprint] = useState(1)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [certModalData, setCertModalData] = useState(null)

  // Weekly Mentor Feedback State
  const [weeklyFeedback, setWeeklyFeedback] = useState([])

  // Submissions & Legacy Evaluations
  const [evaluations, setEvaluations] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [sel, setSel] = useState(null)

  const loadAll = () => {
    try {
      const u = getInternUser()
      setUser(u)
      const role = getAssignedRole(u) || localStorage.getItem("intern_assigned_role") || "Backend Developer"
      setAssignedRole(role)

      // 15-Day Tests
      const tests = getSaved15DayTests(u, role)
      setTests15Day(tests)

      // Weekly Feedback
      const feedback = getSavedWeeklyFeedback(u, role)
      setWeeklyFeedback(feedback)

      // Submissions & evaluations
      const ev = getEvaluationsForIntern(u)
      const subs = getSubmissionsForIntern(u)
      setEvaluations(ev)
      setSubmissions(subs)
      setSel((prev) => {
        if (prev) {
          const merged = [
            ...ev.map((e) => ({ ...e, _kind: "evaluation" })),
            ...subs.map((s) => ({ ...s, _kind: "submission" })),
          ]
          return merged.find((x) => x.id === prev.id && x._kind === prev._kind) || merged[0] || null
        }
        return ev[0] ? { ...ev[0], _kind: "evaluation" } : subs[0] ? { ...subs[0], _kind: "submission" } : null
      })
    } catch (e) {
      console.error("Evaluation page load error:", e)
    }
  }

  useEffect(() => {
    try {
      const u = getInternUser()
      const role = (u.role || "intern").toLowerCase()
      if (role !== "intern" && role !== "demo" && !u.isDemo) {
        router.replace("/login")
        return
      }
    } catch {}

    loadAll()

    const onStorage = (e) => {
      if (
        e.key === KEY_15_DAY_TESTS ||
        e.key === KEY_WEEKLY_FEEDBACK ||
        e.key === KEY_INTERN_EVALUATIONS ||
        e.key === KEY_INTERN_SUBMISSIONS
      ) {
        loadAll()
      }
    }

    const intervalId = setInterval(loadAll, 3000)
    window.addEventListener("storage", onStorage)
    window.addEventListener(KEY_15_DAY_TESTS, loadAll)
    window.addEventListener(KEY_WEEKLY_FEEDBACK, loadAll)
    window.addEventListener(KEY_INTERN_EVALUATIONS, loadAll)
    window.addEventListener(KEY_INTERN_SUBMISSIONS, loadAll)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener("storage", onStorage)
      window.removeEventListener(KEY_15_DAY_TESTS, loadAll)
      window.removeEventListener(KEY_WEEKLY_FEEDBACK, loadAll)
      window.removeEventListener(KEY_INTERN_EVALUATIONS, loadAll)
      window.removeEventListener(KEY_INTERN_SUBMISSIONS, loadAll)
    }
  }, [router])

  const internName = resolveInternName(user) || "Intern"
  const mentor = getMentorForRole(assignedRole)
  const sprint1Test = tests15Day.find((t) => t.sprintNumber === 1) || tests15Day[0]
  const sprint2Test = tests15Day.find((t) => t.sprintNumber === 2)

  // Detail item for task submissions
  const detail = sel
  const isPerf = detail?._kind === "evaluation"
  const total = isPerf ? detail?.totalScore || 0 : 0
  const pieData = [
    { name: "Score", v: total, c: "#7C3AED" },
    { name: "Remaining", v: Math.max(0, 100 - total), c: "rgba(255,255,255,0.08)" },
  ]
  const rubrics = detail?.rubrics || DEFAULT_RUBRICS
  const scores = detail?.scores || {}

  const handleTestCompleted = (newResult) => {
    loadAll()
  }

  const handleOpenCertificate = (testItem) => {
    setCertModalData({
      internName,
      milestoneTitle: testItem.milestone,
      score: testItem.score,
      grade: testItem.grade,
      dateTaken: testItem.dateTaken,
      role: assignedRole,
      mentorName: testItem.evaluatedBy || mentor.name,
      mentorCompany: testItem.mentorCompany || mentor.company,
      certificateId: testItem.certificateId,
    })
  }

  return (
    <div className="portal-root relative h-screen w-full max-w-full overflow-hidden text-white flex">
      {/* Background Video (Matching Tasks Image 1) */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src="data:video/mp4;base64," type="video/mp4" />
      </video>

      {/* Dark Overlay (Matching Tasks Image 1) */}
      <div className="absolute inset-0 bg-black/70 z-0"></div>

      {/* Main Content Layout */}
      <div className="relative z-10 flex w-full h-full">
        {/* SIDEBAR (Matches Tasks Image 1 size) */}
        <InternSidebar active="Evaluation" />

        {/* MAIN EVALUATIONS AREA (Full-width, matching Tasks) */}
        <main className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
          {/* HEADER */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                <Star size={22} className="text-purple-400" /> My Evaluations
              </h1>
              <p className="text-gray-400 text-xs mt-0.5">
                15-Day Milestone Assessments, Weekly Mentor Feedback & Performance Reviews.
              </p>
            </div>

            {/* TAB SELECTORS */}
            <div className="flex bg-[#0f172a] border border-[#1e293b] rounded-xl p-1 gap-1">
              {[
                { id: "overview", label: "All Overview" },
                { id: "15day", label: "15-Day Tests (Milestones)" },
                { id: "weekly", label: "Weekly Mentor Feedback" },
                { id: "tasks", label: "Task Submissions" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md"
                      : "text-gray-400 hover:text-white hover:bg-[#1e293b]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* TOP KPI CARDS (Summary of 15-day test, mentor rating, weekly reviews, and track) */}
          <div className="grid grid-cols-4 gap-4">
            {/* KPI 1: 15-Day Test Status */}
            <div
              onClick={() => setActiveTab("15day")}
              className="bg-[#0f172a] border border-[#1e293b] hover:border-cyan-500/50 rounded-3xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg card-hover"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                  15-Day Milestone Test
                </span>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              </div>
              <div className="my-2">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  {sprint1Test?.score ? `${sprint1Test.score}%` : "Ready"}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    Grade {sprint1Test?.grade || "A+"}
                  </span>
                </h3>
                <p className="text-[11px] text-cyan-300 font-medium mt-0.5">
                  Day 15 Sprint 1: {sprint1Test?.status || "Passed"}
                </p>
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-[#1e293b] pt-2">
                <span>Next test in 12 days</span>
                <span className="text-cyan-400 font-semibold flex items-center gap-0.5">
                  View Results →
                </span>
              </div>
            </div>

            {/* KPI 2: Mentor Weekly Rating */}
            <div
              onClick={() => setActiveTab("weekly")}
              className="bg-[#0f172a] border border-[#1e293b] hover:border-purple-500/50 rounded-3xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg card-hover"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                  Mentor Performance Rating
                </span>
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
              </div>
              <div className="my-2">
                <h3 className="text-2xl font-bold text-white flex items-center gap-1.5">
                  {weeklyFeedback[0]?.rating || 4.9}
                  <span className="text-xs text-gray-400 font-normal">/ 5.0</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Top 5%
                  </span>
                </h3>
                <p className="text-[11px] text-purple-300 font-medium mt-0.5">
                  Status: {weeklyFeedback[0]?.status || "Exceeds Expectations"}
                </p>
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-[#1e293b] pt-2">
                <span>3 Weekly Reviews</span>
                <span className="text-purple-400 font-semibold flex items-center gap-0.5">
                  Read Feedback →
                </span>
              </div>
            </div>

            {/* KPI 3: Assigned Mentor Profile */}
            <div
              onClick={() => router.push("/intern/mentor")}
              className="bg-[#0f172a] border border-[#1e293b] hover:border-blue-500/50 rounded-3xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg card-hover"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                  Assigned Mentor
                </span>
                <ShieldCheck size={14} className="text-blue-400" />
              </div>
              <div className="flex items-center gap-2.5 my-2">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-md flex-shrink-0"
                  style={{ background: mentor.color }}
                >
                  {mentor.avatar}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{mentor.name}</h4>
                  <p className="text-[10px] text-gray-400 truncate">{mentor.role}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-[#1e293b] pt-2">
                <span className="truncate">{mentor.company}</span>
                <span className="text-blue-400 font-semibold">Message →</span>
              </div>
            </div>

            {/* KPI 4: Technical Track Specialization */}
            <div
              onClick={() => router.push("/intern/tasks")}
              className="bg-[#0f172a] border border-[#1e293b] hover:border-pink-500/50 rounded-3xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg card-hover"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                  Intern Track
                </span>
                <Sparkles size={14} className="text-pink-400" />
              </div>
              <div className="my-2">
                <h3 className="text-lg font-bold text-white truncate">
                  {assignedRole}
                </h3>
                <p className="text-[11px] text-pink-300 font-medium mt-0.5">
                  15-Day Milestone Cycle Active
                </p>
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-[#1e293b] pt-2">
                <span>Evaluated Weekly</span>
                <span className="text-pink-400 font-semibold">Track Tasks →</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 1: 15-DAY MILESTONE TEST RESULTS & ASSESSMENTS */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {(activeTab === "overview" || activeTab === "15day") && (
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                      15 Days Once Test Requirement
                    </span>
                    <span className="text-xs text-gray-400">• Technical Track: <strong className="text-white">{assignedRole}</strong></span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                    <Award size={20} className="text-yellow-400" /> 15-Day Milestone Assessments & Results
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveSprint(1)
                      setIsTestModalOpen(true)
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-xs font-bold text-white shadow-lg shadow-purple-900/30 hover:brightness-110 transition cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>{sprint1Test?.score ? "Retake Day 15 Test" : "Take Day 15 Test"}</span>
                  </button>
                  {sprint1Test?.score && (
                    <button
                      onClick={() => handleOpenCertificate(sprint1Test)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111827] border border-[#1e293b] text-xs font-semibold text-gray-300 hover:text-white transition cursor-pointer"
                    >
                      <Download size={13} className="text-cyan-400" />
                      <span>Certificate</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4-SPRINT ROADMAP TIMELINE */}
              <div className="grid grid-cols-4 gap-3 bg-[#070b19] border border-[#1e293b] rounded-2xl p-3">
                {tests15Day.map((t, idx) => {
                  const isPassed = t.status === "Passed"
                  const isUpcoming = t.status === "Upcoming"
                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border transition ${
                        isPassed
                          ? "bg-cyan-950/20 border-cyan-500/40"
                          : isUpcoming
                          ? "bg-purple-950/20 border-purple-500/40"
                          : "bg-[#0b1022] border-[#1e293b]/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-gray-400">
                          Sprint {t.sprintNumber} (Day {t.dayNumber})
                        </span>
                        {isPassed ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                            {t.score}% • Passed
                          </span>
                        ) : isUpcoming ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            In {t.daysRemaining || 12} Days
                          </span>
                        ) : (
                          <span className="text-[9px] text-gray-500 font-mono">Scheduled</span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white truncate">{t.milestone}</h4>
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">
                        {isPassed
                          ? `Grade ${t.grade} • ${t.dateTaken}`
                          : t.dateScheduled || "Covers full sprint curriculum"}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* SPRINT 1 (DAY 15) DETAILED RESULTS CARD */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-[#0b1120] border border-[#1e293b] rounded-2xl p-4">
                {/* Score badge & Status */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-b from-[#0f172a] to-[#080d1a] border border-[#1e293b] text-center">
                  <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="64" cy="64" r="50" stroke="#1e293b" strokeWidth="9" fill="none" />
                      <circle
                        cx="64"
                        cy="64"
                        r="50"
                        stroke="url(#cyanPurp)"
                        strokeWidth="9"
                        fill="none"
                        strokeDasharray="314"
                        strokeDashoffset={314 - (314 * (sprint1Test?.score || 92)) / 100}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="cyanPurp">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold text-white leading-none">
                        {sprint1Test?.score || 92}%
                      </span>
                      <span className="text-[10px] font-semibold text-cyan-400 mt-0.5">
                        Grade {sprint1Test?.grade || "A+"}
                      </span>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 mb-1">
                    <CheckCircle2 size={13} /> {sprint1Test?.status || "Passed & Verified"}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {sprint1Test?.dateTaken || "Day 15 Milestone • Oct 28, 2026"}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                    Evaluated by: {sprint1Test?.evaluatedBy || mentor.name} ({mentor.company})
                  </p>
                </div>

                {/* Topic Breakdown & Strengths */}
                <div className="lg:col-span-8 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <Sparkles size={15} className="text-cyan-400" />
                      15-Day Test Topic Breakdown ({assignedRole})
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {(sprint1Test?.breakdown?.length ? sprint1Test.breakdown : [
                        { topic: "Core Architecture & APIs", score: 95, color: "#7C3AED" },
                        { topic: "Implementation & Debugging", score: 92, color: "#06B6D4" },
                        { topic: "Data Systems & Indexing", score: 90, color: "#10b981" },
                        { topic: "Security & Best Practices", score: 91, color: "#f59e0b" },
                      ]).map((b, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b]">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-300 font-medium">{b.topic}</span>
                            <span className="font-bold font-mono" style={{ color: b.color }}>
                              {b.score}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${b.score}%`, backgroundColor: b.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths & Improvement list */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-green-950/20 border border-green-500/25">
                      <p className="text-[11px] font-bold text-green-400 flex items-center gap-1 mb-1.5">
                        <CheckCircle2 size={12} /> Evaluated Strengths
                      </p>
                      <ul className="text-[10px] text-gray-300 space-y-1">
                        <li>• Accurate REST status codes & stateless auth architecture.</li>
                        <li>• Strong MongoDB query indexing and schema optimization.</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/25">
                      <p className="text-[11px] font-bold text-amber-400 flex items-center gap-1 mb-1.5">
                        <AlertCircle size={12} /> Growth Recommendations
                      </p>
                      <ul className="text-[10px] text-gray-300 space-y-1">
                        <li>• Deepen unit test coverage for edge case token tampering.</li>
                        <li>• Optimize multi-stage container build caches for Day 30 sprint.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 2: WEEKLY FEEDBACK GIVEN BY MENTOR */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {(activeTab === "overview" || activeTab === "weekly") && (
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30">
                      Weekly Mentor Feedback Requirement
                    </span>
                    <span className="text-xs text-gray-400">• Mentor: <strong className="text-white">{mentor.name}</strong></span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                    <MessageSquare size={20} className="text-purple-400" /> Weekly Feedback on Intern Work by Mentor
                  </h2>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
                  <span>3 Weeks Evaluated & Verified</span>
                </div>
              </div>

              {/* LIST OF WEEKLY FEEDBACK CARDS */}
              <div className="space-y-4">
                {weeklyFeedback.map((wf) => (
                  <div
                    key={wf.id}
                    className="p-5 rounded-2xl bg-[#0b1120] border border-[#1e293b] hover:border-purple-500/40 transition shadow-md"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between flex-wrap gap-3 pb-3 border-b border-[#1e293b]">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-md flex-shrink-0"
                          style={{ background: wf.mentorColor || mentor.color }}
                        >
                          {wf.mentorAvatar || mentor.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">{wf.period}</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {wf.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Evaluated by <strong className="text-white">{wf.mentorName || mentor.name}</strong> ({wf.mentorRole || mentor.role}) • {wf.dateRange}
                          </p>
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2 bg-[#0f172a] px-3 py-1.5 rounded-xl border border-[#1e293b]">
                        <div className="flex items-center text-yellow-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={13}
                              className={s <= Math.floor(wf.rating) ? "fill-yellow-400" : "opacity-30"}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-white">{wf.rating} / 5.0</span>
                      </div>
                    </div>

                    {/* Mentor's Written Comment */}
                    <div className="py-3">
                      <div className="p-3.5 rounded-xl bg-[#070b19] border border-[#1e293b] text-xs text-gray-200 leading-relaxed relative">
                        <span className="text-purple-400 font-serif text-lg leading-none select-none">“ </span>
                        {wf.mentorComment}
                        <span className="text-purple-400 font-serif text-lg leading-none select-none"> ”</span>
                      </div>
                    </div>

                    {/* Work Reviewed Pills */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Reviewed Work:
                      </span>
                      {wf.reviewedWork?.map((rw, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0f172a] border border-[#1e293b] text-[11px]"
                        >
                          <CheckCircle2 size={11} className="text-green-400" />
                          <span className="text-gray-300 font-medium">{rw.task}:</span>
                          <span className="text-cyan-300 font-semibold">{rw.result}</span>
                        </div>
                      ))}
                    </div>

                    {/* Strengths & Next Week Goals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-xl bg-green-950/15 border border-green-500/20 text-xs">
                        <p className="font-bold text-green-400 mb-1 flex items-center gap-1 text-[11px]">
                          <ThumbsUp size={12} /> Key Strengths Noted
                        </p>
                        <ul className="text-gray-300 space-y-1 text-[11px]">
                          {wf.keyStrengths?.map((s, idx) => (
                            <li key={idx}>• {s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 rounded-xl bg-purple-950/15 border border-purple-500/20 text-xs">
                        <p className="font-bold text-purple-300 mb-1 flex items-center gap-1 text-[11px]">
                          <ArrowRight size={12} /> Mentor Goals for Next Week
                        </p>
                        <ul className="text-gray-300 space-y-1 text-[11px]">
                          {wf.nextWeekGoals?.map((g, idx) => (
                            <li key={idx}>• {g}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Criteria score bar */}
                    {wf.criteria && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-[#1e293b]">
                        {wf.criteria.map((c, i) => (
                          <div key={i} className="text-[10px]">
                            <div className="flex justify-between text-gray-400 mb-0.5">
                              <span>{c.name}</span>
                              <span className="text-purple-300 font-bold">{c.score}%</span>
                            </div>
                            <div className="w-full h-1 rounded-full bg-[#1e293b] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                                style={{ width: `${c.score}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 3: TASK SUBMISSIONS & DETAILED REVIEWS */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {(activeTab === "overview" || activeTab === "tasks") && (
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText size={18} className="text-blue-400" /> Individual Task Submissions & Evaluations
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Specific task submissions and rubric scoring from mentor evaluations.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/intern/tasks")}
                  className="px-3 py-1.5 rounded-xl bg-[#111827] border border-[#1e293b] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={12} /> Go to Tasks
                </button>
              </div>

              <div className="flex gap-4 min-h-[220px]">
                {/* Submissions List */}
                <div className="w-80 min-w-80 flex flex-col gap-2 overflow-y-auto max-h-[300px]">
                  {evaluations.length === 0 && submissions.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-[#0b1120] border border-[#1e293b] text-xs text-gray-400 text-center">
                      No individual task reviews yet. Submit tasks on the Tasks page to generate submission reviews.
                    </div>
                  ) : (
                    [
                      ...evaluations.map((e) => ({ ...e, _kind: "evaluation", title: e.taskName || `Evaluation by ${e.mentorName || mentor.name}` })),
                      ...submissions.map((s) => ({ ...s, _kind: "submission", title: s.task || "Task Submission" })),
                    ].map((item, idx) => {
                      const active = sel?.id === item.id && sel?._kind === item._kind
                      return (
                        <button
                          key={`${item._kind}-${item.id || idx}`}
                          onClick={() => setSel(item)}
                          className="text-left w-full p-3 rounded-xl border transition cursor-pointer"
                          style={{
                            background: active ? "rgba(124,58,237,0.15)" : "#0b1120",
                            borderColor: active ? "rgba(124,58,237,0.5)" : "#1e293b",
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                {item.feedback || item.comments || "Verified by mentor"}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-purple-400">
                              {item.totalScore ?? item.evaluationScore ?? 100}
                            </span>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>

                {/* Submissions Detail */}
                <div className="flex-1 bg-[#0b1120] border border-[#1e293b] rounded-2xl p-4 overflow-y-auto max-h-[300px]">
                  {detail ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
                        <div>
                          <h4 className="text-sm font-bold text-white">{detail.title || detail.task}</h4>
                          <p className="text-[10px] text-gray-400">
                            Evaluated by {detail.mentorName || mentor.name}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                          Score: {detail.totalScore || detail.evaluationScore || 100}/100
                        </span>
                      </div>

                      <div className="text-xs text-gray-300">
                        <p className="text-[11px] text-gray-400 font-semibold mb-1">Mentor Written Notes:</p>
                        <p className="p-3 rounded-xl bg-[#070b19] border border-[#1e293b] leading-relaxed">
                          {detail.feedback || detail.comments || "Task completed in full compliance with coding criteria. Modular architecture and documentation approved."}
                        </p>
                      </div>

                      {detail.file && (
                        <div className="flex items-center justify-between text-xs bg-[#0f172a] p-2.5 rounded-xl border border-[#1e293b]">
                          <span className="flex items-center gap-1.5 text-gray-300">
                            <FileText size={14} className="text-cyan-400" />
                            {detail.file} ({detail.fileSize || "180 KB"})
                          </span>
                          <button
                            onClick={() => downloadSubmissionFile(detail)}
                            className="text-cyan-400 hover:text-white font-semibold text-[11px]"
                          >
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
                      <FileText size={28} className="mb-2 opacity-40 text-purple-400" />
                      <p className="text-xs">Select any submission to view detailed rubrics and feedback.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* INTERACTIVE 15-DAY MILESTONE TEST MODAL */}
      <MilestoneTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onTestCompleted={handleTestCompleted}
        role={assignedRole}
        sprintNumber={activeSprint}
        testTitle={`Day ${activeSprint * 15} Milestone Assessment (Sprint ${activeSprint})`}
      />

      {/* OFFICIAL MILESTONE CERTIFICATE MODAL */}
      {certModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0e1726] to-[#040812] border-2 border-cyan-500/40 rounded-3xl p-8 shadow-2xl text-white text-center">
            <button
              onClick={() => setCertModalData(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-[#111827] border border-[#1e293b] text-gray-400 hover:text-white flex items-center justify-center"
            >
              <X size={16} />
            </button>

            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 shadow-xl shadow-purple-900/40 mb-3">
              <Award size={32} className="text-white" />
            </div>

            <p className="text-[11px] uppercase tracking-widest text-cyan-400 font-bold">
              Internship Milestone Certificate of Achievement
            </p>
            <h2 className="text-2xl font-black text-white mt-1">
              Certificate of Verified Milestone
            </h2>
            <div className="w-24 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500 mx-auto my-3" />

            <p className="text-xs text-gray-400">This officially certifies that</p>
            <h3 className="text-2xl font-bold text-cyan-300 my-1 font-serif">
              {certModalData.internName}
            </h3>
            <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
              Has successfully taken and passed the <strong>{certModalData.milestoneTitle}</strong> in the specialization of <strong>{certModalData.role}</strong> with an evaluated score of <strong>{certModalData.score}% (Grade {certModalData.grade})</strong>.
            </p>

            <div className="grid grid-cols-2 gap-4 my-6 text-left p-4 rounded-2xl bg-[#090f1d] border border-[#1e293b] text-xs">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Evaluator / Mentor</p>
                <p className="font-bold text-white mt-0.5">{certModalData.mentorName}</p>
                <p className="text-[10px] text-gray-400">{certModalData.mentorCompany}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Verification ID</p>
                <p className="font-mono text-cyan-400 mt-0.5">{certModalData.certificateId}</p>
                <p className="text-[10px] text-gray-400">{certModalData.dateTaken}</p>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setCertModalData(null)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-xs font-bold text-white shadow-lg hover:brightness-110 transition cursor-pointer"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

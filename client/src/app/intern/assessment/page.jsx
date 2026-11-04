"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import InternSidebar from "../../../lib/internSidebar"
import {
  ASSESSMENT_QUESTIONS,
  determineRole,
  saveAssessmentResult,
  getAssignedRole
} from "../../../lib/assessmentData"
import { api, getInternUser } from "../../../lib/api"
import {
  Award, Sparkles, CheckCircle2, ChevronRight, ChevronLeft,
  RotateCcw, Code2, Database, Cpu, Layers, ArrowRight, ShieldCheck
} from "lucide-react"

export default function AssessmentPage() {
  const router = useRouter()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [existingRole, setExistingRole] = useState(null)

  useEffect(() => {
    const role = getAssignedRole()
    if (role) {
      setExistingRole(role)
    }
  }, [])

  const currentQ = ASSESSMENT_QUESTIONS[currentIdx]
  const totalQ = ASSESSMENT_QUESTIONS.length
  const answeredCount = Object.keys(answers).length
  const progressPct = Math.round((answeredCount / totalQ) * 100)

  const handleSelectOption = (qId, optionIdx) => {
    setAnswers(prev => ({ ...prev, [qId]: optionIdx }))
  }

  const handleNext = () => {
    if (currentIdx < totalQ - 1) {
      setCurrentIdx(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    const evaluated = determineRole(answers)
    setResult(evaluated)
    saveAssessmentResult(evaluated)

    try {
      const user = getInternUser()
      if (user && user.id) {
        await api.updateProfile(user.id, {
          internRole: evaluated.assignedRole,
          assessment: evaluated
        })
      }
    } catch {}

    setSubmitting(false)
    setShowResult(true)
  }

  const handleRestart = () => {
    setAnswers({})
    setCurrentIdx(0)
    setShowResult(false)
    setResult(null)
  }

  const getDomainIcon = (domain) => {
    switch (domain) {
      case "frontend": return <Code2 size={15} className="text-cyan-400" />
      case "backend": return <Layers size={15} className="text-purple-400" />
      case "ds": return <Cpu size={15} className="text-pink-400" />
      case "db": return <Database size={15} className="text-emerald-400" />
      default: return <Sparkles size={15} className="text-yellow-400" />
    }
  }

  return (
    <div className="portal-root flex h-screen w-full max-w-full overflow-hidden text-white bg-[#020617] relative">
      <InternSidebar active="Skill Test" />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0 p-4 sm:p-6 lg:p-10 relative">
        {/* Glow ambient background gradients */}
        <div className="absolute top-10 right-10 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-[1320px] mx-auto my-4 sm:my-6 lg:my-8 rounded-3xl border border-cyan-500/25 bg-[#070B1A]/95 backdrop-blur-xl shadow-2xl overflow-hidden relative z-10 flex flex-col">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 p-6 sm:p-8 bg-[#0a1026]/90 gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <Award size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3 flex-wrap">
                  Intern Role Assessment
                  <span className="text-xs sm:text-sm px-3.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm">
                    16 Questions
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-gray-300 mt-1">
                  Assess your technical skills to automatically assign your specialization role and tasks.
                </p>
              </div>
            </div>

            {existingRole && !showResult && (
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-sm font-semibold self-start md:self-auto shadow-sm">
                <ShieldCheck size={18} /> Current: {existingRole}
              </div>
            )}
          </div>

          {/* PROGRESS */}
          {!showResult && (
            <div className="px-6 sm:px-8 pt-6 pb-4 bg-[#070B1A]">
              <div className="flex items-center justify-between text-sm sm:text-base text-gray-300 mb-2.5 font-medium">
                <span>Question {currentIdx + 1} of {totalQ}</span>
                <span className="text-cyan-400 font-bold">{answeredCount}/{totalQ} Answered ({progressPct}%)</span>
              </div>
              <div className="w-full h-2.5 sm:h-3 bg-white/10 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                  style={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* QUESTION OR RESULT BODY */}
          <div className="p-6 sm:p-8 lg:p-10 flex-1">
            {!showResult ? (
              <div>
                {/* Domain Pill */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-200">
                    {getDomainIcon(currentQ.domain)}
                    {currentQ.subject}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-400 font-mono">Q{currentQ.id} of 16</span>
                </div>

                {/* Question */}
                <h2 className="text-xl sm:text-2xl lg:text-[26px] font-bold leading-relaxed mb-8 text-white">
                  {currentQ.question}
                </h2>

                {/* Options List */}
                <div className="space-y-4 mb-8">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = answers[currentQ.id] === idx
                    const optionLabel = ["A", "B", "C", "D"][idx]
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectOption(currentQ.id, idx)}
                        className={`group flex items-center gap-4 sm:gap-5 p-4 sm:p-5 lg:p-6 rounded-2xl border transition-all cursor-pointer min-h-[58px] sm:min-h-[64px] ${
                          isSelected
                            ? "bg-gradient-to-r from-cyan-500/15 via-purple-600/15 to-transparent border-cyan-400/80 shadow-[0_0_24px_rgba(6,182,212,0.25)] scale-[1.008]"
                            : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/25"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-sm sm:text-base font-bold transition flex-shrink-0 shadow-sm ${
                            isSelected
                              ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md"
                              : "bg-white/10 text-gray-400 group-hover:text-white"
                          }`}
                        >
                          {optionLabel}
                        </div>
                        <span className={`text-base sm:text-lg leading-relaxed ${isSelected ? "text-white font-semibold" : "text-gray-200"}`}>
                          {opt}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Numbered Jump Buttons */}
                <div className="flex items-center justify-center gap-2.5 sm:gap-3 py-4 mb-4 flex-wrap overflow-x-auto">
                  {ASSESSMENT_QUESTIONS.map((q, idx) => {
                    const isAns = answers[q.id] !== undefined
                    const isCur = idx === currentIdx
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIdx(idx)}
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-sm sm:text-base font-bold transition shadow-sm ${
                          isCur
                            ? "ring-4 ring-cyan-400/40 bg-gradient-to-r from-cyan-400 to-cyan-500 text-black font-extrabold scale-110 shadow-lg shadow-cyan-500/30"
                            : isAns
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold border border-purple-400/40 shadow-sm"
                            : "bg-white/[0.04] text-gray-400 border border-white/10 hover:bg-white/[0.08] hover:text-white"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* RESULTS */
              <div className="text-center py-6 sm:py-8">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 mb-5 shadow-2xl">
                  <Sparkles size={48} className="text-white animate-pulse" />
                </div>

                <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs sm:text-sm font-semibold border border-cyan-500/40 mb-3 shadow-sm">
                  Assessment Completed
                </div>

                <h2 className="text-3xl sm:text-4xl font-black mb-3">
                  Assigned Role: <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">{result?.assignedRole}</span>
                </h2>
                <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
                  {result?.description}
                </p>

                {/* STAT CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl mx-auto mb-10">
                  <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-center shadow-lg">
                    <div className="text-3xl font-extrabold text-cyan-400">{result?.score} / {result?.totalQuestions}</div>
                    <div className="text-xs sm:text-sm text-gray-400 uppercase mt-1 font-semibold tracking-wider">Overall Score</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-center shadow-lg">
                    <div className="text-3xl font-extrabold text-purple-400">{result?.percentage}%</div>
                    <div className="text-xs sm:text-sm text-gray-400 uppercase mt-1 font-semibold tracking-wider">Accuracy</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-center shadow-lg">
                    <div className="text-3xl font-extrabold text-emerald-400">6 Tasks</div>
                    <div className="text-xs sm:text-sm text-gray-400 uppercase mt-1 font-semibold tracking-wider">Assigned</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-center shadow-lg">
                    <div className="text-base font-bold text-yellow-300 mt-1">{result?.roleBadge}</div>
                    <div className="text-xs sm:text-sm text-gray-400 uppercase mt-1 font-semibold tracking-wider">Title</div>
                  </div>
                </div>

                {/* SUBJECT METRICS */}
                <div className="max-w-2xl mx-auto space-y-4 mb-10 text-left">
                  {result && Object.entries(result.domainScores).map(([key, domain]) => (
                    <div key={key} className="bg-white/[0.03] p-5 rounded-2xl border border-white/10 shadow-sm">
                      <div className="flex justify-between text-sm sm:text-base mb-2.5">
                        <span className="text-gray-200 flex items-center gap-2.5 font-medium">
                          {getDomainIcon(key)} {domain.name}
                        </span>
                        <span className="font-bold text-cyan-300">{domain.score} / {domain.total}</span>
                      </div>
                      <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
                          style={{ width: `${(domain.score / domain.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between border-t border-white/10 px-6 sm:px-8 py-5 sm:py-6 bg-[#0a1026]/90 gap-4">
            {!showResult ? (
              <>
                <button
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  className="h-12 flex items-center gap-2 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold text-gray-300 hover:text-white border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                >
                  <ChevronLeft size={20} /> Previous
                </button>

                <div className="flex items-center gap-3">
                  {currentIdx < totalQ - 1 ? (
                    <button
                      onClick={handleNext}
                      className="h-12 flex items-center gap-2 px-7 sm:px-9 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:brightness-110 shadow-lg shadow-purple-600/25 transition cursor-pointer"
                    >
                      Next <ChevronRight size={20} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || answeredCount === 0}
                      className="h-12 flex items-center gap-2 px-8 sm:px-10 rounded-xl sm:rounded-2xl text-sm sm:text-base font-extrabold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:brightness-110 shadow-lg shadow-green-600/30 transition disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 size={20} />
                      {submitting ? "Evaluating..." : `Submit Assessment (${answeredCount}/${totalQ})`}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleRestart}
                  className="h-12 flex items-center gap-2 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold text-gray-300 hover:text-white border border-white/10 hover:bg-white/5 transition cursor-pointer"
                >
                  <RotateCcw size={18} /> Retake Test
                </button>

                <button
                  onClick={() => router.push("/intern/tasks")}
                  className="h-12 flex items-center gap-2 px-8 sm:px-10 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white hover:brightness-110 shadow-lg shadow-purple-600/30 transition cursor-pointer"
                >
                  View My Tasks <ArrowRight size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

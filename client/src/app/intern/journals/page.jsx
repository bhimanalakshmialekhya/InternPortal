"use client"
import { useState, useEffect, useRef } from "react"
import InternSidebar from "../../../lib/internSidebar"
import {
  Search, Plus, X, Download, Paperclip, Send, CheckCircle2,
  Code2, Lightbulb, AlertTriangle, Compass, Calendar, ChevronDown,
  ChevronUp, Edit, Clock, Sparkles, FileText, Check, Eye, EyeOff
} from "lucide-react"
import { api, getUser, getInternUser } from "../../../lib/api"
import { appendSubmission } from "../../../lib/evaluationSync"

const JOURNALS = [
  { id:1, date:"May 20, 2025", label:"Today", title:"Integrated Login API", workedOn:"Integrated the login API with JWT authentication. Implemented validation and error handling.", learned:"Learned how to secure endpoints using JWT and handle refresh tokens effectively.", challenges:"Facing issues with token expiration and CORS configuration.", tomorrow:"Work on refresh token and logout API.", attachment:{name:"login_flow_diagram.png",size:"850 KB"}, comment:{text:"Great work! Try to handle edge cases for invalid tokens.",mentor:"Rahul Sharma",time:"May 20, 2025 • 10:30 AM"} },
  { id:2, date:"May 19, 2025", label:"Yesterday", title:"Worked on Authentication", workedOn:"Worked on authentication middleware and route protection.", learned:"Understood how middleware chains work in Express.js.", challenges:"Had trouble with async error handling in middleware.", tomorrow:"Complete the user profile API.", attachment:null, comment:null },
  { id:3, date:"May 18, 2025", label:"2 days ago", title:"Database Design", workedOn:"Designed the MongoDB schema for users and tasks collections.", learned:"Learned about indexing and schema validation in MongoDB.", challenges:"Deciding between embedded documents vs references.", tomorrow:"Start implementing the schema in code.", attachment:null, comment:null },
  { id:4, date:"May 12, 2025", label:"3 days ago", title:"API Documentation", workedOn:"Started writing API documentation using Swagger.", learned:"Learned Swagger/OpenAPI specification format.", challenges:"Complex request/response schemas are verbose.", tomorrow:"Complete authentication endpoints documentation.", attachment:null, comment:null },
  { id:5, date:"May 16, 2025", label:"4 days ago", title:"Bug Fixes and Testing", workedOn:"Fixed critical bugs in the login flow and wrote unit tests.", learned:"Learned Jest testing framework and how to mock dependencies.", challenges:"Mocking database calls in tests was tricky.", tomorrow:"Write integration tests for the API.", attachment:null, comment:null },
]

export default function JournalsPage() {
  const [journals, setJournals] = useState(JOURNALS)
  const [selected, setSelected] = useState(JOURNALS[0])
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editJ, setEditJ] = useState(null)
  const [journalFile, setJournalFile] = useState(null)
  const journalFileRef = useRef(null)
  const [newJ, setNewJ] = useState({ title:"", workedOn:"", learned:"", challenges:"", tomorrow:"" })
  const [sentIds, setSentIds] = useState(new Set())
  const [sentSubmissions, setSentSubmissions] = useState({})
  const [collapsedBlocks, setCollapsedBlocks] = useState({}) // Empty = ALL OPEN by default!
  const [mentorComments, setMentorComments] = useState([])
  const [marksPopup, setMarksPopup] = useState(null)

  const toggleBlock = (key) => {
    setCollapsedBlocks(p => ({ ...p, [key]: !p[key] }))
  }

  const toggleAll = () => {
    const allKeys = ["workedOn", "learned", "challenges", "tomorrow"]
    const areAllCollapsed = allKeys.every(k => collapsedBlocks[k])
    if (areAllCollapsed) {
      setCollapsedBlocks({})
    } else {
      const coll = {}
      allKeys.forEach(k => { coll[k] = true })
      setCollapsedBlocks(coll)
    }
  }

  const openEdit = () => {
    if (!selected) return
    setEditJ({ ...selected })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editJ.title.trim() || !editJ.workedOn.trim()) {
      alert("Title and 'What I worked on' are required.")
      return
    }
    const user = getInternUser()
    const payload = {
      title: editJ.title,
      workedOn: editJ.workedOn,
      learned: editJ.learned,
      challenges: editJ.challenges,
      tomorrowPlan: editJ.tomorrow,
      date: editJ.date,
      userId: user.id,
    }
    try {
      await api.updateJournal(editJ.id, payload)
    } catch {}

    setJournals(prev => prev.map(j => (j.id === editJ.id ? editJ : j)))
    setSelected(editJ)
    setShowEditModal(false)
  }

  useEffect(() => {
    const user = getUser()
    api.getJournals(user.id).then(r => {
      if (r.ok && r.data?.length) {
        const mapped = r.data.map(j => ({ id:j._id||j.id, date:j.date||"", label:"Saved", title:j.title||"", workedOn:j.workedOn||"", learned:j.learned||"", challenges:j.challenges||"", tomorrow:j.tomorrowPlan||j.tomorrow||"", attachment:null, comment:j.mentorComment||null }))
        setJournals(mapped); if(mapped.length) setSelected(mapped[0])
      }
    }).catch(()=>{})

    // Load sent submissions
    try {
      const subs = JSON.parse(localStorage.getItem("internSubmissions")||"[]")
      const map = {}
      subs.filter(s=>s.type==="journal").forEach(s=>{ map[s.journalId||s.id] = s })
      setSentSubmissions(map)
    } catch {}

    // Poll mentor comments from localStorage (written by mentor portal)
    const pollComments = () => {
      try {
        const comments = JSON.parse(localStorage.getItem("mentorComments")||"[]")
        if (!comments.length) return
        setMentorComments(comments)
        // Update journal comments — match by title (partial/case-insensitive) or by intern name
        setJournals(prev => prev.map(j => {
          // Find the most recent comment for this journal
          const mc = comments.find(c =>
            c.journalTitle &&
            (c.journalTitle.toLowerCase() === j.title?.toLowerCase() ||
             j.title?.toLowerCase().includes(c.journalTitle?.toLowerCase()) ||
             c.journalTitle?.toLowerCase().includes(j.title?.toLowerCase()))
          )
          if (mc) {
            const newComment = { text: mc.text, mentor: mc.mentor, time: mc.time }
            // Always update (not just when empty) so new comments show
            if (!j.comment || j.comment.text !== mc.text) {
              return { ...j, comment: newComment }
            }
          }
          return j
        }))
        // Also update selected journal in real time
        setSelected(prev => {
          if (!prev) return prev
          const mc = comments.find(c =>
            c.journalTitle &&
            (c.journalTitle.toLowerCase() === prev.title?.toLowerCase() ||
             prev.title?.toLowerCase().includes(c.journalTitle?.toLowerCase()) ||
             c.journalTitle?.toLowerCase().includes(prev.title?.toLowerCase()))
          )
          if (mc && (!prev.comment || prev.comment.text !== mc.text)) {
            return { ...prev, comment: { text: mc.text, mentor: mc.mentor, time: mc.time } }
          }
          return prev
        })
      } catch {}
    }
    pollComments()
    const id = setInterval(pollComments, 1000)
    // Also react instantly when mentor submits a comment
    const onStorage = (e) => { if (e.key === "mentorComments") pollComments() }
    window.addEventListener("storage", onStorage)
    return () => { clearInterval(id); window.removeEventListener("storage", onStorage) }
  },[])

  const filtered = journals.filter(j=>j.title.toLowerCase().includes(search.toLowerCase()))

  const sendToMentor = (journal) => {
    const user = getInternUser()
    const sub = appendSubmission({
      id: `journal-${journal.id}-${Date.now()}`,
      journalId: String(journal.id),
      intern: user.fullName || "Intern",
      internUserId: user.id || "",
      task: `Journal: ${journal.title}`,
      file: `journal_${journal.title.replace(/\s+/g, "_").toLowerCase()}.pdf`,
      fileSize: "—",
      submittedOn:
        journal.date ||
        new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }),
      status: "Pending Review",
      comments: `Worked on: ${journal.workedOn?.slice(0, 80)}`,
      type: "journal",
    })
    setSentIds((p) => new Set([...p, journal.id]))
    setSentSubmissions((p) => ({ ...p, [String(journal.id)]: sub }))
  }

  const handleAdd = async () => {
    if (!newJ.title.trim()||!newJ.workedOn.trim()||!newJ.learned.trim()||!newJ.challenges.trim()||!newJ.tomorrow.trim()) { alert("Please fill all fields"); return }
    const user = getInternUser()
    const now = new Date()
    const payload = { title:newJ.title, workedOn:newJ.workedOn, learned:newJ.learned, challenges:newJ.challenges, tomorrowPlan:newJ.tomorrow, date:now.toLocaleDateString("en-US",{month:"short",day:"2-digit",year:"numeric"}), userId:user.id }
    const r = await api.createJournal(payload)
    const j = { ...newJ, id:r.ok?(r.data.id||Date.now()):Date.now(), date:payload.date, label:"Today", attachment:journalFile?{name:journalFile.name,size:`${(journalFile.size/1024).toFixed(0)} KB`}:null, comment:null }
    setJournals(p=>[j,...p]); setSelected(j); setShowModal(false)
    setNewJ({ title:"", workedOn:"", learned:"", challenges:"", tomorrow:"" }); setJournalFile(null)
  }

  const handleAddAndSend = async () => {
    if (!newJ.title.trim()||!newJ.workedOn.trim()||!newJ.learned.trim()||!newJ.challenges.trim()||!newJ.tomorrow.trim()) { alert("Please fill all fields"); return }
    const user = getInternUser()
    const now = new Date()
    const dateStr = now.toLocaleDateString("en-US",{month:"short",day:"2-digit",year:"numeric"})
    const payload = { title:newJ.title, workedOn:newJ.workedOn, learned:newJ.learned, challenges:newJ.challenges, tomorrowPlan:newJ.tomorrow, date:dateStr, userId:user.id }
    const r = await api.createJournal(payload)
    const newId = r.ok?(r.data.id||Date.now()):Date.now()
    const j = { ...newJ, id:newId, date:dateStr, label:"Today", attachment:journalFile?{name:journalFile.name,size:`${(journalFile.size/1024).toFixed(0)} KB`}:null, comment:null }
    setJournals(p=>[j,...p]); setSelected(j)
    // Send to mentor
    appendSubmission({
      id: `journal-${newId}`,
      intern: user.fullName || "Intern",
      internUserId: user.id || "",
      task: `Journal: ${newJ.title}`,
      file: journalFile ? journalFile.name : `journal_${newJ.title.replace(/\s+/g, "_").toLowerCase()}.pdf`,
      fileSize: journalFile ? `${(journalFile.size / 1024).toFixed(0)} KB` : "—",
      submittedOn: dateStr,
      status: "Pending Review",
      comments: `Worked on: ${newJ.workedOn?.slice(0, 80)}`,
      type: "journal",
    })
    setSentIds(p => new Set([...p, newId]))
    setShowModal(false)
    setNewJ({ title:"", workedOn:"", learned:"", challenges:"", tomorrow:"" }); setJournalFile(null)
    alert("Journal saved and sent to mentor!")
  }

  const inp = "w-full bg-[#111827] border border-[#1e293b] rounded-xl px-3 py-2 text-xs outline-none text-white"

  return (
    <div className="portal-root h-screen w-full max-w-full overflow-hidden text-white flex relative">

  {/* VIDEO BACKGROUND */}
  <video
    autoPlay
    loop
    muted
    playsInline
    className="absolute inset-0 w-full h-full object-cover z-0"
  >
    <source src="data:video/mp4;base64," type="video/mp4" />
  </video>

  {/* DARK OVERLAY */}
  <div className="absolute inset-0 bg-black/65 z-0"></div>

  {/* CONTENT */}
  <div className="relative z-10 flex w-full h-full">
      <InternSidebar active="Journals"/>
      <div className="w-72 lg:w-80 min-w-72 bg-[#020617]/95 border-r border-[#1e293b] flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-[#1e293b]">
          <h1 className="text-xl font-bold text-white mb-1">Journals</h1>
          <p className="text-gray-400 text-xs">Write and manage your daily progress and mentor feedback.</p>
        </div>
        <div className="p-3 border-b border-[#1e293b] flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search journals…" className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 transition"/>
          </div>
          <button onClick={()=>setShowModal(true)} className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-xs font-semibold flex items-center gap-1.5 text-white hover:brightness-110 transition shadow-md cursor-pointer">
            <Plus size={14}/> New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[#1e293b]/60">
          {filtered.map(j=>{
            const isSelected = selected?.id === j.id
            const isSent = sentIds.has(j.id) || Boolean(sentSubmissions[String(j.id)])
            return (
              <button key={j.id} onClick={()=>setSelected(j)}
                className={`w-full text-left p-4 transition cursor-pointer ${isSelected ? "bg-purple-600/15 border-l-2 border-l-purple-500" : "hover:bg-[#0f172a]"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                    <Calendar size={12} className="text-gray-400"/> {j.date}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background:"rgba(168,85,247,0.15)", color:"#c084fc", border:"1px solid rgba(168,85,247,0.3)" }}>
                    {j.label}
                  </span>
                </div>
                <p className="text-sm font-bold text-white truncate">{j.title}</p>
                <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                  {j.workedOn || "No work details entered"}
                </p>
                {isSent && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 size={12}/> Sent to Mentor
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* DETAIL VIEW */}
      {selected ? (
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {/* HEADER */}
          <div className="flex items-start justify-between pb-5 border-b border-[#1e293b] flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-purple-300 font-semibold bg-purple-600/20 border border-purple-500/30 px-3 py-1 rounded-full">
                  <Calendar size={13}/> {selected.date}
                </span>
                <span className="text-xs text-cyan-300 font-semibold bg-cyan-600/20 border border-cyan-500/30 px-2.5 py-1 rounded-full">
                  {selected.label || "Daily Work Log"}
                </span>
                {sentIds.has(selected.id) && (
                  <span className="text-xs text-emerald-300 font-semibold bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={13}/> Delivered to Mentor
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{selected.title}</h1>
              <p className="text-sm text-gray-400 mt-1">Detailed everyday accomplishment, technical learnings and next milestones.</p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={toggleAll}
                className="px-3.5 py-2 rounded-xl bg-[#0f172a] border border-[#1e293b] text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#111827] flex items-center gap-1.5 transition cursor-pointer shadow-sm">
                {Object.keys(collapsedBlocks).length > 0 ? (
                  <><Eye size={14}/> Expand All</>
                ) : (
                  <><EyeOff size={14}/> Collapse All</>
                )}
              </button>

              <button
                onClick={openEdit}
                className="px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:text-white hover:bg-purple-600/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm">
                <Edit size={14}/> Edit Entry
              </button>

              <button
                onClick={()=>sendToMentor(selected)}
                disabled={sentIds.has(selected.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md cursor-pointer ${
                  sentIds.has(selected.id)
                    ? "bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 cursor-default"
                    : "bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:brightness-110"
                }`}>
                {sentIds.has(selected.id) ? (
                  <><CheckCircle2 size={14}/> Sent to Mentor</>
                ) : (
                  <><Send size={14}/> Send to Mentor</>
                )}
              </button>
            </div>
          </div>

          {/* EVERYDAY WORK CARDS (Clearly displayed by default with rich contrast & badges) */}
          <div className="space-y-4">
            {[
              {
                key: "workedOn",
                title: "What I Worked On Today",
                subtitle: "Key tasks executed, feature implementations & code delivered",
                content: selected.workedOn,
                color: "#a855f7",
                Icon: Code2,
                badge: "Everyday Core Output",
                fallback: "No work logged for today."
              },
              {
                key: "learned",
                title: "What I Learned & Key Takeaways",
                subtitle: "New engineering concepts, architecture patterns & tools explored",
                content: selected.learned,
                color: "#06B6D4",
                Icon: Lightbulb,
                badge: "Skill & Knowledge Growth",
                fallback: "No learnings recorded for today."
              },
              {
                key: "challenges",
                title: "Challenges Faced & Problem Solving",
                subtitle: "Edge cases, bugs or blockers encountered and how they were tackled",
                content: selected.challenges,
                color: "#ec4899",
                Icon: AlertTriangle,
                badge: "Debugging & Solutions",
                fallback: "No challenges recorded for today."
              },
              {
                key: "tomorrow",
                title: "Tomorrow's Action Plan",
                subtitle: "Immediate priorities, planned endpoints & next milestones",
                content: selected.tomorrow,
                color: "#10b981",
                Icon: Compass,
                badge: "Upcoming Focus",
                fallback: "No plan recorded for tomorrow."
              },
            ].map(({ key, title, subtitle, content, color, Icon, badge, fallback }) => {
              const isCollapsed = Boolean(collapsedBlocks[key])
              return (
                <div
                  key={key}
                  className="rounded-2xl p-4 sm:p-5 transition-all duration-200 card-hover"
                  style={{
                    background: "rgba(15, 23, 42, 0.75)",
                    border: `1px solid ${color}35`,
                    boxShadow: `0 4px 20px -2px ${color}12`,
                  }}>
                  <div
                    onClick={() => toggleBlock(key)}
                    className="flex items-center justify-between cursor-pointer select-none pb-2.5 border-b border-[#1e293b]/70">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}22`, color }}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white tracking-wide">{title}</h4>
                          <span
                            className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>
                            {badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>
                      </div>
                    </div>
                    <div
                      className="w-7 h-7 rounded-lg bg-[#111827] border border-[#1e293b] flex items-center justify-center text-gray-400 hover:text-white transition">
                      {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="mt-3.5 p-4 rounded-xl bg-[#111827]/90 border border-[#1e293b]/70">
                      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line font-normal">
                        {content || <span className="text-gray-500 italic">{fallback}</span>}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
            {selected.attachment && (
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-4 card-hover">
                <p className="text-xs font-semibold text-white mb-2">Attachments</p>
                <div className="flex items-center justify-between bg-[#111827] rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-600/20 flex items-center justify-center"><Paperclip size={12} className="text-purple-400"/></div>
                    <div><p className="text-[10px] text-white">{selected.attachment.name}</p><p className="text-[9px] text-gray-500">{selected.attachment.size}</p></div>
                  </div>
                  <button onClick={()=>{ const blob=new Blob([`Attachment: ${selected.attachment.name}`],{type:"text/plain"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=selected.attachment.name; a.click(); URL.revokeObjectURL(url) }}>
                    <Download size={13} className="text-gray-400 hover:text-white"/>
                  </button>
                </div>
              </div>
            )}
            {/* Mentor Comment — uses actual mentor login name */}
            {(selected.comment || mentorComments.find(c=>c.journalTitle===selected.title)) && (() => {
              const mc = selected.comment || mentorComments.find(c=>c.journalTitle===selected.title)
              return (
                <div className="bg-purple-600/10 border border-purple-600/20 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-white mb-2">Mentor Comment</p>
                  <p className="text-xs text-gray-300 leading-relaxed mb-3">{mc.text}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-[9px] font-bold">
                        {(mc.mentor||"M").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[10px] font-medium text-purple-400">— {mc.mentor}</span>
                    </div>
                    <span className="text-[9px] text-gray-500">{mc.time}</span>
                  </div>
                </div>
              )
            })()}

            {/* Submission status — shown after sending to mentor */}
            {sentSubmissions[String(selected.id)] && (() => {
              const sub = sentSubmissions[String(selected.id)]
              // Check if marks have been given for this submission
              const marks = (() => {
                try {
                  const m = localStorage.getItem(`evalMarks_${sub.id}`) || localStorage.getItem(`evalMarks_intern_${getUser().fullName}`)
                  return m ? JSON.parse(m) : null
                } catch { return null }
              })()
              return (
                <>
                  <div
                    onClick={()=>marks ? setMarksPopup(marks) : null}
                    className={`rounded-2xl p-4 ${marks?"cursor-pointer":"cursor-default"}`}
                    style={{
                      background:"rgba(6,182,212,0.08)",
                      border:`1px solid ${marks?"rgba(6,182,212,0.5)":"rgba(6,182,212,0.25)"}`,
                      boxShadow: marks?"0 0 12px rgba(6,182,212,0.2)":"none",
                      transition:"all 0.2s"
                    }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-cyan-400 flex items-center gap-1"><Send size={11}/> Sent to Mentor</p>
                      <div className="flex items-center gap-2">
                        {marks && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background:"rgba(124,58,237,0.3)", color:"#a78bfa" }}>
                            {marks.totalScore}/100 · {marks.grade}
                          </span>
                        )}
                        <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background:marks?"rgba(34,197,94,0.2)":"rgba(245,158,11,0.2)", color:marks?"#22c55e":"#f59e0b", border:`1px solid ${marks?"rgba(34,197,94,0.3)":"rgba(245,158,11,0.3)"}` }}>
                          {marks ? <><CheckCircle2 size={10} className="inline"/> Evaluated</> : "Pending Review"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-[#111827] rounded-xl px-3 py-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                        <Paperclip size={13} className="text-purple-400"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white font-medium truncate">{sub.file}</p>
                        <p className="text-[9px] text-gray-500">Submitted on {sub.submittedOn}</p>
                      </div>
                      <button onClick={e=>{e.stopPropagation(); const blob=new Blob([`Journal: ${selected.title}\nWorked on: ${selected.workedOn}`],{type:"text/plain"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=sub.file; a.click(); URL.revokeObjectURL(url)}} className="flex-shrink-0">
                        <Download size={13} className="text-cyan-400 hover:text-white"/>
                      </button>
                    </div>
                    {marks && <p className="text-[9px] text-cyan-400/70 mt-2 text-center">Click to view your marks →</p>}
                  </div>

                  {/* Marks popup */}
                  {marksPopup && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setMarksPopup(null)}>
                      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 w-80" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-bold">🏅 Your Marks</h3>
                          <button onClick={()=>setMarksPopup(null)}><X size={14} className="text-gray-400"/></button>
                        </div>
                        {/* Score circle */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative w-20 h-20 flex-shrink-0">
                            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                              <circle cx="40" cy="40" r="32" stroke="#1e293b" strokeWidth="6" fill="none"/>
                              <circle cx="40" cy="40" r="32" stroke="#7C3AED" strokeWidth="6" fill="none"
                                strokeDasharray="201"
                                strokeDashoffset={201-(201*marksPopup.totalScore/100)}
                                strokeLinecap="round"/>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-lg font-bold text-purple-400">{marksPopup.totalScore}</span>
                              <span className="text-[9px] text-gray-400">/ 100</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-2xl font-bold" style={{ color:marksPopup.grade==="A"?"#22c55e":marksPopup.grade==="B"?"#06B6D4":marksPopup.grade==="C"?"#f59e0b":"#ef4444" }}>{marksPopup.grade}</p>
                            <p className="text-[10px] text-gray-400">Grade</p>
                            <p className="text-[10px] text-gray-500 mt-1">by {marksPopup.mentor}</p>
                          </div>
                        </div>
                        {/* Score breakdown */}
                        <div className="space-y-1.5 mb-3">
                          {Object.entries(marksPopup.scores||{}).map(([k,v])=>(
                            <div key={k} className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 w-28 flex-shrink-0">{k}</span>
                              <div className="flex-1 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full" style={{ width:`${v/30*100}%` }}/>
                              </div>
                              <span className="text-[10px] text-white font-semibold w-8 text-right">{v}</span>
                            </div>
                          ))}
                        </div>
                        {/* Feedback */}
                        <div className="bg-[#111827] rounded-xl p-3">
                          <p className="text-[9px] text-gray-400 mb-1">Mentor Feedback</p>
                          <p className="text-[10px] text-gray-300 leading-relaxed">{marksPopup.feedback}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Select a journal to view</div>
      )}

      {/* ADD MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 w-[500px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold">New Journal Entry</span>
              <button onClick={()=>setShowModal(false)}><X size={14} className="text-gray-400"/></button>
            </div>
            <div className="space-y-3">
              {[{l:"Title *",k:"title",rows:1},{l:"What I worked on *",k:"workedOn",rows:2},{l:"What I learned *",k:"learned",rows:2},{l:"Challenges faced *",k:"challenges",rows:2},{l:"Tomorrow's Plan *",k:"tomorrow",rows:2}].map(f=>(
                <div key={f.k}>
                  <label className="text-[10px] text-gray-400 block mb-1">{f.l}</label>
                  {f.rows===1 ? <input value={newJ[f.k]} onChange={e=>setNewJ({...newJ,[f.k]:e.target.value})} className={inp}/> : <textarea rows={f.rows} value={newJ[f.k]} onChange={e=>setNewJ({...newJ,[f.k]:e.target.value})} className={`${inp} resize-none`}/>}
                </div>
              ))}
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Attach Work File (optional)</label>
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-[#1e293b] rounded-xl px-3 py-2 hover:border-purple-500 transition">
                  <Paperclip size={12} className="text-gray-400"/>
                  <span className="text-[10px] text-gray-400">{journalFile?journalFile.name:"Click to attach file (Word, PDF, image…)"}</span>
                  <input ref={journalFileRef} type="file" accept=".doc,.docx,.pdf,.txt,.png,.jpg,.jpeg,.xlsx" style={{ display:"none" }} onChange={e=>{ if(e.target.files[0]) setJournalFile(e.target.files[0]) }}/>
                </label>
                {journalFile && <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1"><CheckCircle2 size={10}/> {journalFile.name} ({(journalFile.size/1024).toFixed(0)} KB)</p>}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>{setShowModal(false);setJournalFile(null)}} className="flex-1 py-2 rounded-xl bg-[#111827] border border-[#1e293b] text-xs text-gray-400 hover:text-white transition">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-2 rounded-xl bg-[#0f172a] border border-purple-600/40 text-purple-400 text-xs font-semibold hover:bg-purple-600/20 transition">Save Journal</button>
              <button onClick={handleAddAndSend} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-xs font-bold text-white flex items-center justify-center gap-1 hover:brightness-110 transition">
                <Send size={12} className="inline"/> Send to Mentor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && editJ && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 w-[520px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Edit size={16} className="text-purple-400" /> Edit Journal Entry
              </span>
              <button onClick={() => setShowEditModal(false)}><X size={14} className="text-gray-400 hover:text-white" /></button>
            </div>
            <div className="space-y-3">
              {[
                { l: "Title *", k: "title", rows: 1 },
                { l: "What I worked on today *", k: "workedOn", rows: 3 },
                { l: "What I learned *", k: "learned", rows: 2 },
                { l: "Challenges faced *", k: "challenges", rows: 2 },
                { l: "Tomorrow's Plan *", k: "tomorrow", rows: 2 },
              ].map(f => (
                <div key={f.k}>
                  <label className="text-[10px] text-gray-400 block mb-1 font-medium">{f.l}</label>
                  {f.rows === 1 ? (
                    <input
                      value={editJ[f.k] || ""}
                      onChange={e => setEditJ({ ...editJ, [f.k]: e.target.value })}
                      className={inp}
                    />
                  ) : (
                    <textarea
                      rows={f.rows}
                      value={editJ[f.k] || ""}
                      onChange={e => setEditJ({ ...editJ, [f.k]: e.target.value })}
                      className={`${inp} resize-none`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2 rounded-xl bg-[#111827] border border-[#1e293b] text-xs text-gray-400 hover:text-white transition">
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-xs font-bold text-white hover:brightness-110 transition">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}


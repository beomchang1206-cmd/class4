"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";
import confetti from "canvas-confetti";
import OneSignal from 'react-onesignal';

const SUBJECT_LIST = [
  "공통", "21세기 문학탐구(월3,화3,목6,금4)", "21세기 문학탐구(월4,화1,수2,목4)", "Comprehensive Biology(월1,화2,수7,금3)",
  "Comprehensive Chemistry(월4,화1,수2,목4)", "Critical Literacy in English(화4,화5,수1,목3)", "History of Early Civilizations(월2,화6,목2,금1)",
  "History of Early Civilizations(월6,수6,목1,금2)", "Introduction to Engineering(화4,화5,수1,목3)", "고급수학Ⅰ(수4,수5,목7,금5)",
  "고급수학Ⅰ(월6,수6,목1,금2)", "과학과제 연구(수4,수5,목7,금5)", "과학과제 연구(월7,화7,수3,금6)", "기하(월2,화6,목2,금1)",
  "기하(월3,화3,목6,금4)", "기하(화4,화5,수1,목3)", "물리학Ⅱ(월1,화2,수7,금3)", "물리학Ⅱ(월4,화1,수2,목4)",
  "미디어와 창의적 표현(월3,화3,목6,금4)", "미디어와 창의적 표현(월6,수6,목1,금2)", "미디어와 창의적 표현(화4,화5,수1,목3)",
  "미술 전공 실기 심화(월2,화6,목2,금1)", "베트남어 회화(월6,수6,목1,금2)", "사회문제 탐구(수4,수5,목7,금5)",
  "사회문제 탐구(월1,화2,수7,금3)", "사회문제 탐구(월2,화6,목2,금1)", "생명과학Ⅱ(월3,화3,목6,금4)", "생명과학Ⅱ(화4,화5,수1,목3)",
  "세계 문제와 미래 사회(월1,화2,수7,금3)", "세계 문제와 미래 사회(월7,화7,수3,금6)", "세계 문제와 미래 사회(화4,화5,수1,목3)",
  "수학과제 탐구(수4,수5,목7,금5)", "수학과제 탐구(월3,화3,목6,금4)", "수학과제 탐구(월4,화1,수2,목4)", "시사 베트남어(수4,수5,목7,금5)",
  "심층 융합 독서(수4,수5,목7,금5)", "심층 융합 독서(월6,수6,목1,금2)", "영어Ⅱ(월1,화2,수7,금3)", "영어Ⅱ(월2,화6,목2,금1)",
  "영어Ⅱ(월4,화1,수2,목4)", "영어Ⅱ(월6,수6,목1,금2)", "영어Ⅱ(월7,화7,수3,금6)", "윤리와 사상(월3,화3,목6,금4)",
  "윤리와 사상(월4,화1,수2,목4)", "윤리와 사상(월7,화7,수3,금6)", "음악 연주와 창작(월3,화3,목6,금4)", "정보과학 과제연구(월7,화7,수3,금6)",
  "한국 지역의 이해(월1,화2,수7,금3)", "한국 지역의 이해(월7,화7,수3,금6)", "화학Ⅱ(월2,화6,목2,금1)", "화학Ⅱ(월6,수6,목1,금2)"
];

export default function Home() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [pendingNotices, setPendingNotices] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formSubject, setFormSubject] = useState("공통");
  const [formContent, setFormContent] = useState("");
  const [formDate, setFormDate] = useState("");

  const [isTimerActive, setIsTimerActive] = useState(false);
  const [studySeconds, setStudySeconds] = useState(0);
  const timerRef = useRef<any>(null);

  const [isQnaModalOpen, setIsQnaModalOpen] = useState(false);
  const [currentQnaSubject, setCurrentQnaSubject] = useState("");
  const [qnaPosts, setQnaPosts] = useState<any[]>([]);
  const [newQnaContent, setNewQnaContent] = useState("");

  const sendGlobalNotification = async (title: string, message: string, subject: string = "공통") => {
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, subject })
      });
    } catch (err) { console.error("전체 알림 발송 실패:", err); }
  };

  const scheduleNoticeNotification = async (subject: string, dateStr: string, content: string) => {
    const targetTime = new Date(`${dateStr}T16:00:00+07:00`);
    const now = new Date();
    const oneDayBefore = new Date(targetTime.getTime() - 1 * 24 * 60 * 60 * 1000);
    const sevenDaysBefore = new Date(targetTime.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (sevenDaysBefore > now) {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `⏳ [D-7] ${subject} 공지 리마인드`, message: content, subject: subject, send_after: sevenDaysBefore.toUTCString() })
      });
    }
    if (oneDayBefore > now) {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `🚨 [D-1] 내일 ${subject} 잊지마세요!`, message: content, subject: subject, send_after: oneDayBefore.toUTCString() })
      });
    }
  };

  useEffect(() => {
    const initOneSignal = async () => {
      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "",
          allowLocalhostAsSecureOrigin: true,
          promptOptions: { slidedown: { prompts: [{ type: "push", autoPrompt: true, text: { actionMessage: "알림을 받으시겠습니까?", acceptButton: "허용", cancelButton: "취소" }, delay: { pageViews: 1, timeDelay: 5 } }] } }
        });
        if (currentUser) { OneSignal.login(currentUser.name); }
      } catch (err) { console.error("OneSignal 에러:", err); }
    };
    initOneSignal();
    fetchRankings();
    fetchNotice();

    const savedName = localStorage.getItem("userName");
    if (savedName && !currentUser) checkAndLoginUser(savedName);
  }, [currentUser]);

  useEffect(() => {
    const handleVisibilityChange = () => { if (document.hidden && isTimerActive) { setIsTimerActive(false); alert("⚠️ 다른 창으로 이동하여 타이머가 중단되었습니다!"); } };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isTimerActive]);

  useEffect(() => {
    if (isTimerActive) { timerRef.current = setInterval(() => setStudySeconds(s => s + 1), 1000); } else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [isTimerActive]);

  const startTimer = () => {
    if (!currentUser) return alert("로그인이 필요합니다!");
    setIsTimerActive(true); setStudySeconds(0);
    sendGlobalNotification("🔥 스터디 모드 온!", `${currentUser.name}님이 방금 공부를 시작했습니다.`);
  };

  const stopTimer = async () => {
    if (!isTimerActive) return;
    setIsTimerActive(false);
    const minutes = Math.floor(studySeconds / 60); const earnedXp = minutes * 2;
    if (earnedXp > 0 && currentUser) {
      const newXp = (currentUser.total_xp || 0) + earnedXp;
      await supabase.from("users").update({ total_xp: newXp }).eq("id", currentUser.id);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#3b82f6', '#8b5cf6', '#ffffff'] });
      alert(`📚 ${minutes}분 집중 완료! ${earnedXp}XP 획득!`);
      checkAndLoginUser(currentUser.name); fetchRankings();
    }
    setStudySeconds(0);
  };

  const fetchRankings = async () => {
    const { data } = await supabase.from("users").select("name, total_xp").order("total_xp", { ascending: false }).limit(5);
    if (data) setRankings(data);
  };

  const fetchNotice = async () => {
    const vnTime = new Date((new Date()).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    const todayStr = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;
    await supabase.from("notices").delete().lt("target_date", todayStr);
    const { data } = await supabase.from("notices").select("*").gte("target_date", todayStr).order("target_date", { ascending: true });
    setPendingNotices(data || []);
  };

  const fetchQnaPosts = async (subject: string) => {
    const { data } = await supabase.from("qna").select("*").eq("subject", subject).order("created_at", { ascending: false });
    setQnaPosts(data || []);
  };

  const openQnaLounge = (subject: string) => {
    setCurrentQnaSubject(subject); fetchQnaPosts(subject); setIsQnaModalOpen(true);
  };

  const checkAndLoginUser = async (name: string) => {
    const { data } = await supabase.from("users").select("*").eq("name", name.trim()).single();
    if (data) {
      setCurrentUser(data); localStorage.setItem("userName", data.name);
      try {
        if (data.selected_subjects) {
          let subjectsArray: string[] = [];
          if (Array.isArray(data.selected_subjects)) { subjectsArray = data.selected_subjects; }
          else if (typeof data.selected_subjects === 'string') {
            const cleanedString = data.selected_subjects.replace(/^\{|\}$/g, '');
            subjectsArray = cleanedString.split('","').map((s: string) => s.replace(/"/g, ''));
          }
          const tags: Record<string, string> = {};
          subjectsArray.forEach((subj: string) => { tags[subj] = "true"; });
          if ((OneSignal as any).User) await (OneSignal as any).User.addTags(tags); else await (OneSignal as any).sendTags(tags);
        }
      } catch (err) { console.error("이름표 부착 실패:", err); }
    } else { alert("등록된 이름이 없습니다."); }
  };

  const handleLogout = () => {
    localStorage.removeItem("userName"); setCurrentUser(null);
    try { if ((OneSignal as any).logout) (OneSignal as any).logout(); } catch (e) { console.log(e); }
  };

  const getStatus = (totalXp: number, name: string) => {
    let level = 1; let curXp = totalXp || 0; let reqXp = 100 + (Math.pow(level, 2) * 50);
    while (curXp >= reqXp) { curXp -= reqXp; level++; reqXp = 100 + (Math.pow(level, 2) * 50); }
    const progress = Math.min((curXp / reqXp) * 100, 100); const remXp = reqXp - curXp;

    let emoji = "🥚"; let sName = `${name}의 알`; let anime = "animate-pulse";
    if (level >= 10) { emoji = "🐉"; sName = `수호신 ${name}`; anime = "animate-float"; }
    else if (level >= 5) { emoji = "🦅"; sName = `불사조 ${name}`; anime = "animate-float-slow"; }
    else if (level >= 2) { emoji = "🐣"; sName = `병아리 ${name}`; anime = "animate-pulse"; }
    return { level, emoji, sName, anime, progress, remXp };
  };

  const mStatus = getStatus(rankings[0]?.total_xp, rankings[0]?.name || "개척자");
  const myStatus = currentUser ? getStatus(currentUser.total_xp, currentUser.name) : null;

  let rawSubjects: string[] = [];
  if (currentUser?.selected_subjects) {
    if (Array.isArray(currentUser.selected_subjects)) { rawSubjects = currentUser.selected_subjects; }
    else if (typeof currentUser.selected_subjects === 'string') {
      rawSubjects = currentUser.selected_subjects.replace(/^\{|\}$/g, '').split('","').map((s: string) => s.replace(/"/g, '').trim()).filter((s: string) => s);
    }
  }
  const mergedSubjects: string[] = Array.from(new Set(rawSubjects.map((subj: string) => subj.split('(')[0].trim())));

  return (
    // 🌑 프리미엄 다크 배경 (아주 짙은 아연색)
    <div className="min-h-screen bg-[#09090b] font-sans text-zinc-100 selection:bg-blue-500/30 selection:text-white">
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-float-slow { animation: float 4s ease-in-out infinite; }
        
        /* 스크롤바 숨기기 */
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 📦 메인 래퍼: Max-width 고정으로 깔끔한 레이아웃 */}
      <div className="max-w-6xl mx-auto p-4 md:p-8">

        {/* 💬 QnA 모달 */}
        {isQnaModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
            <div className="bg-[#18181b] border border-white/10 rounded-3xl p-8 w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  {currentQnaSubject} 라운지
                </h2>
                <button onClick={() => setIsQnaModalOpen(false)} className="text-zinc-400 hover:text-white text-sm font-semibold transition-colors px-3 py-1.5 rounded-xl hover:bg-white/5">ESC</button>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 pr-2 flex flex-col gap-4 hide-scrollbar">
                {qnaPosts.length > 0 ? qnaPosts.map(post => (
                  <div key={post.id} className="bg-[#27272a]/50 p-5 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-blue-400 text-sm">{post.author_name}</span>
                      <span className="text-xs text-zinc-500 font-mono tracking-tighter">{new Date(post.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                    <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                    <span className="text-3xl mb-3 opacity-30">📂</span>
                    <p className="font-medium text-sm">라운지가 비어있습니다. 첫 글을 작성해보세요.</p>
                  </div>
                )}
              </div>

              <div className="mt-auto border-t border-white/5 pt-6 flex gap-3">
                <textarea
                  className="flex-1 bg-[#09090b] border border-white/10 rounded-xl p-4 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm text-zinc-200 placeholder-zinc-600"
                  rows={2}
                  placeholder="질문이나 유용한 정보를 공유해주세요."
                  value={newQnaContent}
                  onChange={(e) => setNewQnaContent(e.target.value)}
                />
                <button
                  onClick={async () => {
                    if (!newQnaContent.trim()) return alert("내용을 입력하세요.");
                    await supabase.from("qna").insert([{ subject: currentQnaSubject, author_name: currentUser.name, content: newQnaContent }]);
                    sendGlobalNotification(`💬 [${currentQnaSubject}] 라운지 새 글`, `${currentUser.name}: ${newQnaContent}`, currentQnaSubject);
                    setNewQnaContent(""); fetchQnaPosts(currentQnaSubject);
                  }}
                  className="bg-white text-black font-semibold px-7 rounded-xl hover:bg-zinc-200 hover:scale-[0.98] transition-all text-sm"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 📝 공지 작성 모달 */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#18181b] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold tracking-tight mb-6 text-white">New Notice</h2>
              <select className="w-full bg-[#09090b] border border-white/10 rounded-xl p-4 mb-4 focus:outline-none focus:border-blue-500/50 text-sm text-zinc-200 transition-colors" value={formSubject} onChange={(e) => setFormSubject(e.target.value)}>
                {rawSubjects.length > 0 ? rawSubjects.map((sub: string) => <option key={sub} value={sub}>{sub}</option>) : SUBJECT_LIST.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
              <input type="date" className="w-full bg-[#09090b] border border-white/10 rounded-xl p-4 mb-4 focus:outline-none focus:border-blue-500/50 text-sm text-zinc-200 transition-colors cursor-text" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              <textarea className="w-full bg-[#09090b] border border-white/10 rounded-xl p-4 mb-6 focus:outline-none focus:border-blue-500/50 resize-none text-sm text-zinc-200 placeholder-zinc-600 transition-colors" rows={4} value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="수행평가 및 준비물 내용" />
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-transparent border border-white/10 text-zinc-400 text-sm font-semibold rounded-xl hover:bg-white/5 hover:text-white transition-all">Cancel</button>
                <button onClick={async () => {
                  if (!formContent || !formDate) return alert("내용을 입력하세요.");
                  await supabase.from("notices").insert([{ subject: formSubject, content: formContent, target_date: formDate }]);
                  scheduleNoticeNotification(formSubject, formDate, formContent);
                  sendGlobalNotification(`🚨 [${formSubject}] 새 공지 등록`, formContent, formSubject);
                  setIsModalOpen(false); setFormContent(""); fetchNotice();
                  alert("공지 등록 및 예약 알림 세팅 완료.");
                }} className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-xl hover:bg-zinc-200 hover:scale-[0.98] transition-all">Deploy</button>
              </div>
            </div>
          </div>
        )}

        {/* 🎨 [헤더] 최고급 SaaS 스타일 */}
        <header className="mb-10 flex justify-between items-end flex-wrap gap-4 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(255,255,255,0.2)]">O</div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                OREUM <span className="text-zinc-600 font-medium ml-1 text-lg">Workspace</span>
              </h1>
              <p className="text-zinc-500 text-sm mt-1 font-medium">{currentUser ? `Logged in as ${currentUser.name}` : "Please sign in to access the dashboard."}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!currentUser ? (
              <button onClick={() => { const n = window.prompt("Enter your name:"); if (n) checkAndLoginUser(n); }} className="bg-white text-black px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-200 hover:scale-[0.98] transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]">Sign In</button>
            ) : (
              <button onClick={handleLogout} className="bg-transparent border border-white/10 text-zinc-400 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/5 hover:text-white transition-all">Sign Out</button>
            )}
          </div>
        </header>

        {/* 🧩 벤토 그리드 시작 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 📝 공지사항 섹션 (가장 넓은 영역 차지) */}
          <div className="lg:col-span-2 bg-[#18181b] rounded-3xl p-8 border border-white/5 flex flex-col h-[480px]">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
              <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse"></div>
                Assignments & Items
              </h2>
              {currentUser && <button onClick={() => setIsModalOpen(true)} className="bg-transparent border border-white/10 text-zinc-300 px-4 py-1.5 rounded-lg font-semibold text-xs hover:bg-white/5 hover:text-white transition-all">Add New</button>}
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto pr-2 hide-scrollbar">
              {pendingNotices.length > 0 ? pendingNotices.map(n => (
                <div key={n.id} className="bg-[#09090b] p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group">
                  <div className="flex gap-3 mb-2.5 items-center">
                    <span className="text-[11px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2.5 py-1 rounded-md">{n.subject}</span>
                    <span className="text-[12px] font-mono text-zinc-500 group-hover:text-zinc-400 transition-colors">{n.target_date}</span>
                  </div>
                  <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">{n.content}</p>
                </div>
              )) : <div className="flex flex-col items-center justify-center h-full"><p className="text-zinc-600 text-sm font-medium">No pending assignments.</p></div>}
            </div>
          </div>

          {/* 🎮 마스코트/랭킹 섹션 (우측 위쪽 영역) */}
          <div className="flex flex-col gap-6">

            {/* Top Mascot */}
            <div className="bg-gradient-to-b from-[#18181b] to-[#09090b] rounded-3xl p-6 border border-amber-500/20 flex flex-col items-center justify-center text-center relative h-[228px] w-full group">
              <span className="absolute top-5 left-5 bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-500/20">Rank 1</span>
              <div className={`text-5xl mb-3 mt-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)] ${mStatus.anime}`}>{mStatus.emoji}</div>
              <h2 className="text-sm font-bold tracking-tight text-white mb-1">{mStatus.sName} <span className="text-amber-500 ml-1">Lv.{mStatus.level}</span></h2>
              <div className="w-full max-w-[140px] bg-black rounded-full h-1.5 mt-2 mb-2 overflow-hidden border border-white/5">
                <div className="bg-gradient-to-r from-amber-600 to-yellow-400 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${mStatus?.progress || 0}%` }}></div>
              </div>
              <p className="text-[10px] font-medium text-zinc-500">{mStatus.remXp} XP to next level</p>
            </div>

            {/* My Mascot */}
            <div className="bg-[#18181b] rounded-3xl p-6 border border-white/5 flex flex-col items-center justify-center text-center relative h-[228px] w-full">
              <span className="absolute top-5 left-5 bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border border-blue-500/20">My Mascot</span>
              {currentUser ? (
                <>
                  <div className={`text-5xl mb-3 mt-4 ${myStatus?.anime}`}>{myStatus?.emoji}</div>
                  <h2 className="text-sm font-bold tracking-tight text-white mb-1">{myStatus?.sName} <span className="text-blue-400 ml-1">Lv.{myStatus?.level}</span></h2>
                  <div className="w-full max-w-[140px] bg-black rounded-full h-1.5 mt-2 mb-2 overflow-hidden border border-white/5">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-400 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${myStatus?.progress || 0}%` }}></div>
                  </div>
                  <p className="text-[10px] font-medium text-zinc-500">{myStatus?.remXp} XP to next level</p>
                </>
              ) : <p className="text-zinc-600 text-xs font-medium">Authentication required.</p>}
            </div>
          </div>

          {/* 💬 라운지 과목 버튼 (가로로 넓게) */}
          <div className="lg:col-span-3 bg-[#18181b] rounded-3xl p-8 border border-white/5 flex flex-col">
            <h2 className="text-lg font-semibold tracking-tight text-white mb-5 flex items-center gap-2">
              Subject Lounges
            </h2>
            {currentUser ? (
              <div className="flex gap-3 flex-wrap">
                {mergedSubjects.map((subj: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => openQnaLounge(subj)}
                    className="bg-[#09090b] border border-white/10 text-zinc-300 px-5 py-3 rounded-xl text-sm font-medium hover:border-blue-500/50 hover:text-white transition-colors"
                  >
                    {subj}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-[#09090b] rounded-xl p-6 text-center border border-dashed border-white/10">
                <p className="text-zinc-500 text-sm font-medium">Please sign in to view your enrolled subjects.</p>
              </div>
            )}
          </div>

          {/* 🏆 랭킹 섹션 */}
          <div className="bg-[#18181b] rounded-3xl p-8 border border-white/5 flex flex-col h-[300px]">
            <h2 className="text-lg font-semibold tracking-tight text-white mb-5">Leaderboard</h2>
            <div className="flex flex-col gap-2 overflow-y-auto pr-2 hide-scrollbar">
              {rankings.map((u, i) => (
                <div key={i} className="flex justify-between items-center text-sm py-2.5 px-4 bg-[#09090b] rounded-xl border border-white/5">
                  <span className="font-medium text-zinc-200">
                    <span className={`inline-block w-6 text-left font-mono ${i < 3 ? 'text-amber-500 font-bold' : 'text-zinc-600'}`}>{i + 1}</span>
                    {u.name}
                  </span>
                  <span className="text-white font-mono bg-white/5 px-2 py-1 rounded text-xs">{u.total_xp || 0} XP</span>
                </div>
              ))}
            </div>
          </div>

          {/* ⏱️ 스터디 타이머 (강렬한 포인트 컬러) */}
          <div className={`rounded-3xl p-8 border flex flex-col items-center justify-center text-center transition-colors h-[300px] relative overflow-hidden ${isTimerActive ? 'bg-[#18181b] border-emerald-500/30' : 'bg-[#18181b] border-white/5'}`}>
            {isTimerActive && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-pulse"></div>}

            <h2 className="text-xs font-bold text-zinc-500 tracking-widest mb-3 uppercase">Focus Mode</h2>
            <div className={`text-7xl font-mono font-bold tracking-tighter mb-8 ${isTimerActive ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'text-white'}`}>
              {Math.floor(studySeconds / 60)}<span className="text-zinc-700 mx-1">:</span>{String(studySeconds % 60).padStart(2, '0')}
            </div>

            {isTimerActive ? (
              <button onClick={stopTimer} className="bg-zinc-800 text-white px-8 py-3 rounded-xl text-sm font-semibold hover:bg-zinc-700 hover:text-red-400 transition-all border border-white/5 w-full max-w-[220px]">Stop & Save</button>
            ) : (
              <button onClick={startTimer} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-8 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-500 hover:text-black transition-all w-full max-w-[220px]">Start Focus</button>
            )}
            <p className="text-[11px] text-zinc-600 font-medium mt-5">* Auto-cancels if tab is switched.</p>
          </div>

          {/* 🌅 얼리버드 (그라데이션 포인트) */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-800 rounded-3xl p-8 border border-white/10 text-white flex flex-col justify-center items-center text-center h-[300px] shadow-[0_0_30px_rgba(79,70,229,0.15)] relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Early Bird</h2>
            <p className="text-xs font-medium text-indigo-200 mb-8 leading-relaxed">Check in between<br />06:30 - 07:30 to earn 100 XP</p>
            <button onClick={async () => {
              if (!currentUser) return alert("로그인이 필요합니다.");
              const vnTime = new Date((new Date()).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
              const hours = vnTime.getHours(); const minutes = vnTime.getMinutes();
              const currentMins = hours * 60 + minutes;
              if (currentMins < 390 || currentMins > 450) return alert("현재는 얼리버드 체크인 시간이 아닙니다. (06:30 - 07:30)");
              const todayKey = `early_${vnTime.getFullYear()}-${vnTime.getMonth() + 1}-${vnTime.getDate()}`;
              const { data: existing } = await supabase.from("contributions").select("*").eq("user_id", currentUser.id).eq("action_type", todayKey).single();
              if (existing) return alert("이미 오늘 얼리버드 보상을 받으셨습니다.");
              await supabase.from("contributions").insert([{ user_id: currentUser.id, action_type: todayKey, points: 100 }]);
              await supabase.from("users").update({ total_xp: (currentUser.total_xp || 0) + 100 }).eq("id", currentUser.id);
              alert("체크인 완료! 100XP가 지급되었습니다.");
              sendGlobalNotification("🌅 얼리버드 체크인", `${currentUser.name}님이 기상 미션을 완료했습니다.`);
              checkAndLoginUser(currentUser.name); fetchRankings();
            }} className="bg-white text-black w-full max-w-[220px] font-bold text-sm py-3 rounded-xl hover:scale-[0.98] transition-transform z-10 shadow-lg">
              Check In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
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
    } catch (err) {
      console.error("전체 알림 발송 실패:", err);
    }
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
    sendGlobalNotification("🔥 스터디 모드 온!", `${currentUser.name}님이 방금 공부를 시작했습니다. 다들 자극받고 파이팅합시다!`);
  };

  const stopTimer = async () => {
    if (!isTimerActive) return;
    setIsTimerActive(false);
    const minutes = Math.floor(studySeconds / 60); const earnedXp = minutes * 2;

    if (earnedXp > 0 && currentUser) {
      const newXp = (currentUser.total_xp || 0) + earnedXp;
      await supabase.from("users").update({ total_xp: newXp }).eq("id", currentUser.id);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      alert(`📚 ${minutes}분 공부 완료! ${earnedXp}XP 획득!`);
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
    else if (level >= 5) { emoji = "🦅"; sName = `불사조 ${name}`; anime = "animate-wiggle"; }
    else if (level >= 2) { emoji = "🐣"; sName = `병아리 ${name}`; anime = "animate-bounce"; }
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
    // 🎨 [배경] 부드러운 그레이톤 베이스에 전체 레이어 상대 위치 적용
    <div className="relative min-h-screen bg-[#f1f5f9] font-sans text-slate-800 overflow-hidden">

      {/* ✨ [핵심] 리퀴드 글래스를 돋보이게 하는 움직이는 오로라 물방울(Blob) 효과 */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-pink-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-50 animate-blob animation-delay-4000"></div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 10s infinite alternate; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        @keyframes wiggle { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
        .animate-wiggle { animation: wiggle 1s ease-in-out infinite; }
        @keyframes bounce-s { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .animate-bounce { animation: bounce-s 1.5s ease-in-out infinite; }
        
        /* 스크롤바 숨기기 */
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 📦 메인 컨텐츠 영역 (z-10을 줘서 오로라 배경 위로 올라오게 함) */}
      <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">

        {isQnaModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all">
            {/* ✨ 리퀴드 글래스 모달 */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 w-full max-w-2xl h-[80vh] flex flex-col shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]">
              <div className="flex justify-between items-center mb-4 border-b border-gray-300/40 pb-4">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">💬 {currentQnaSubject} 라운지</h2>
                <button onClick={() => setIsQnaModalOpen(false)} className="bg-white/50 text-slate-700 px-5 py-2 rounded-2xl font-semibold hover:bg-white/70 transition-colors shadow-sm border border-white/40">닫기</button>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 pr-2 flex flex-col gap-3 hide-scrollbar">
                {qnaPosts.length > 0 ? qnaPosts.map(post => (
                  <div key={post.id} className="bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-indigo-700 text-sm">👤 {post.author_name}</span>
                      <span className="text-[10px] text-gray-500 font-medium">{new Date(post.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                    <p className="text-slate-800 text-sm whitespace-pre-wrap">{post.content}</p>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <span className="text-4xl mb-3 opacity-50">📭</span>
                    <p className="font-semibold">아직 올라온 질문이 없습니다. 첫 글을 남겨보세요!</p>
                  </div>
                )}
              </div>

              <div className="mt-auto border-t border-gray-300/40 pt-4 flex gap-3">
                <textarea
                  className="flex-1 bg-white/40 backdrop-blur-sm border border-white/60 rounded-2xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all shadow-inner text-slate-800 placeholder-slate-500"
                  rows={2}
                  placeholder="궁금한 점이나 정보를 공유해 보세요!"
                  value={newQnaContent}
                  onChange={(e) => setNewQnaContent(e.target.value)}
                />
                <button
                  onClick={async () => {
                    if (!newQnaContent.trim()) return alert("내용을 입력하세요!");
                    await supabase.from("qna").insert([{ subject: currentQnaSubject, author_name: currentUser.name, content: newQnaContent }]);
                    sendGlobalNotification(`💬 [${currentQnaSubject}] 라운지 새 글`, `${currentUser.name}: ${newQnaContent}`, currentQnaSubject);
                    setNewQnaContent(""); fetchQnaPosts(currentQnaSubject);
                  }}
                  className="bg-indigo-600/90 backdrop-blur-md text-white font-bold px-7 rounded-2xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/40 transition-all active:scale-95 border border-indigo-400/30"
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            {/* ✨ 리퀴드 글래스 모달 2 */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 w-full max-w-md shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]">
              <h2 className="text-2xl font-bold tracking-tight mb-5 text-slate-800">📝 새 공지 작성</h2>
              <select className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-slate-800 shadow-sm" value={formSubject} onChange={(e) => setFormSubject(e.target.value)}>
                {rawSubjects.length > 0 ? rawSubjects.map((sub: string) => <option key={sub} value={sub}>{sub}</option>) : SUBJECT_LIST.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
              <input type="date" className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-slate-800 shadow-sm" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              <textarea className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl p-3 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400/40 resize-none text-slate-800 shadow-sm placeholder-slate-500" rows={3} value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="준비물을 적어주세요" />
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white/50 border border-white/60 text-slate-700 font-semibold rounded-2xl hover:bg-white/70 transition-colors shadow-sm">취소</button>
                <button onClick={async () => {
                  if (!formContent || !formDate) return alert("내용을 입력하세요!");
                  await supabase.from("notices").insert([{ subject: formSubject, content: formContent, target_date: formDate }]);
                  scheduleNoticeNotification(formSubject, formDate, formContent);
                  sendGlobalNotification(`🚨 [${formSubject}] 새 공지 등록!`, formContent, formSubject);
                  setIsModalOpen(false); setFormContent(""); fetchNotice();
                  alert("공지가 등록되었고, 즉시 알림 및 D-7 / D-1 자동 알림이 세팅되었습니다! ⏰");
                }} className="px-6 py-2.5 bg-blue-600/90 backdrop-blur-md text-white font-bold rounded-2xl shadow-lg shadow-blue-500/40 hover:bg-blue-700 border border-blue-400/30 transition-all active:scale-95">등록</button>
              </div>
            </div>
          </div>
        )}

        <header className="mb-10 flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm pb-1">
              11학년 오름 OREUM
            </h1>
            <p className="text-slate-600 font-medium tracking-wide mt-1">{currentUser ? `${currentUser.name}님, 오늘도 파이팅!` : "로그인이 필요합니다."}</p>
          </div>
          <div className="flex items-center gap-2">
            {!currentUser ? (
              <button onClick={() => { const n = window.prompt("이름:"); if (n) checkAndLoginUser(n); }} className="bg-blue-600/90 backdrop-blur-md text-white px-7 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 border border-blue-400/30 transition-all active:scale-95">로그인</button>
            ) : (
              <button onClick={handleLogout} className="bg-white/40 backdrop-blur-xl border border-white/60 text-slate-700 px-5 py-2.5 rounded-2xl font-semibold shadow-sm hover:bg-white/60 transition-all active:scale-95">로그아웃</button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ✨ [핵심 글래스 카드] 투명도 40%, 블러 2xl, 흰색 테두리로 유리 질감 극대화 */}
          <div className="md:col-span-2 bg-white/40 backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 flex flex-col h-[460px]">
            <div className="flex justify-between items-center mb-6 border-b border-slate-300/30 pb-4">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">🚨 수행평가 및 준비물</h2>
              {currentUser && <button onClick={() => setIsModalOpen(true)} className="bg-rose-500/90 backdrop-blur-md text-white px-5 py-2 rounded-2xl font-bold text-sm shadow-lg shadow-rose-500/30 border border-rose-400/30 hover:bg-rose-600 transition-all active:scale-95">+ 추가</button>}
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-2 hide-scrollbar">
              {pendingNotices.length > 0 ? pendingNotices.map(n => (
                <div key={n.id} className="bg-white/50 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-white/60 hover:shadow-md hover:bg-white/60 transition-all">
                  <div className="flex gap-2 mb-2 items-center">
                    <span className="text-[11px] font-bold bg-rose-100/80 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200/50">{n.subject}</span>
                    <span className="text-[11px] font-semibold text-slate-500">📅 {n.target_date}</span>
                  </div>
                  <p className="text-slate-800 font-medium text-sm whitespace-pre-wrap mt-1 leading-relaxed">{n.content}</p>
                </div>
              )) : <div className="flex flex-col items-center justify-center h-full opacity-60"><span className="text-4xl mb-2">☕️</span><p className="text-slate-600 font-medium">깔끔하네요! 등록된 공지가 없습니다.</p></div>}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white/40 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 flex flex-col items-center justify-center text-slate-800 text-center relative h-[218px] w-full overflow-hidden">
              <span className="absolute top-4 left-5 bg-blue-100/80 text-blue-700 border border-blue-200/50 text-[11px] font-bold px-3 py-1 rounded-xl shadow-sm">1위 마스코트</span>
              <div className={`text-6xl mb-2 mt-4 drop-shadow-md ${mStatus.anime}`}>{mStatus.emoji}</div>
              <h2 className="text-[15px] font-extrabold tracking-wide text-slate-900">{mStatus.sName} (Lv.{mStatus.level})</h2>
              <div className="w-full max-w-[160px] bg-slate-200/50 rounded-full h-2.5 mt-3 mb-1 overflow-hidden border border-slate-300/30 shadow-inner">
                <div className="bg-gradient-to-r from-amber-400 to-yellow-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${mStatus?.progress || 0}%` }}></div>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 tracking-wide mt-1">다음 진화까지: {mStatus.remXp} XP</p>
            </div>

            <div className="bg-white/40 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 flex flex-col items-center justify-center text-slate-800 text-center relative h-[218px] w-full overflow-hidden">
              <span className="absolute top-4 left-5 bg-indigo-100/80 text-indigo-700 border border-indigo-200/50 text-[11px] font-bold px-3 py-1 rounded-xl shadow-sm">나의 마스코트</span>
              {currentUser ? (
                <>
                  <div className={`text-6xl mb-2 mt-4 drop-shadow-md ${myStatus?.anime}`}>{myStatus?.emoji}</div>
                  <h2 className="text-[15px] font-extrabold tracking-wide text-slate-900">{myStatus?.sName} (Lv.{myStatus?.level})</h2>
                  <div className="w-full max-w-[160px] bg-slate-200/50 rounded-full h-2.5 mt-3 mb-1 overflow-hidden border border-slate-300/30 shadow-inner">
                    <div className="bg-gradient-to-r from-emerald-400 to-green-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${myStatus?.progress || 0}%` }}></div>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500 tracking-wide mt-1">다음 진화까지: {myStatus?.remXp} XP</p>
                </>
              ) : <p className="text-slate-500 text-sm font-medium">로그인 시 공개됩니다.</p>}
            </div>
          </div>

          <div className="md:col-span-3 bg-white/40 backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 flex flex-col">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-5">💬 내 과목 Q&A 라운지</h2>
            {currentUser ? (
              <div className="flex gap-3 flex-wrap">
                {mergedSubjects.map((subj: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => openQnaLounge(subj)}
                    className="bg-white/60 backdrop-blur-md text-indigo-700 border border-white/80 px-5 py-3.5 rounded-2xl font-bold shadow-sm hover:bg-white/80 hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
                  >
                    {subj}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-white/30 rounded-2xl p-8 text-center border border-dashed border-slate-300/50">
                <p className="text-slate-500 font-semibold tracking-wide">로그인하면 본인이 수강하는 과목의 비밀 라운지 문이 열립니다 🚪✨</p>
              </div>
            )}
          </div>

          <div className="bg-white/40 backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 flex flex-col h-[280px]">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-5">🏆 실시간 랭킹</h2>
            <div className="flex flex-col gap-4 overflow-y-auto pr-1 hide-scrollbar">
              {rankings.map((u, i) => (
                <div key={i} className="flex justify-between items-center text-[15px] bg-white/50 backdrop-blur-sm p-3.5 rounded-xl shadow-sm border border-white/60">
                  <span className="font-bold text-slate-800"><span className={`inline-block w-6 text-center mr-1 ${i < 3 ? 'text-blue-600' : 'text-slate-400'}`}>{i + 1}</span> {u.name}</span>
                  <span className="text-indigo-600 font-extrabold bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-100/50">{u.total_xp || 0} XP</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-3xl p-6 md:p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border flex flex-col items-center justify-center text-center transition-all duration-500 h-[280px] ${isTimerActive ? 'bg-emerald-100/40 backdrop-blur-2xl border-emerald-200/60 shadow-[0_0_40px_rgba(16,185,129,0.2)]' : 'bg-white/40 backdrop-blur-2xl border-white/60'}`}>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-2">📖 스터디 타이머</h2>
            <div className={`text-6xl font-mono font-black mb-6 tracking-tighter ${isTimerActive ? 'text-emerald-600 drop-shadow-md' : 'text-slate-400'}`}>
              {Math.floor(studySeconds / 60)}<span className="opacity-50">:</span>{String(studySeconds % 60).padStart(2, '0')}
            </div>
            {isTimerActive ? (
              <button onClick={stopTimer} className="bg-rose-500/90 backdrop-blur-md border border-rose-400/30 text-white px-10 py-3.5 rounded-2xl font-bold shadow-lg shadow-rose-500/30 active:scale-95 transition-all">종료 및 저장</button>
            ) : (
              <button onClick={startTimer} className="bg-emerald-500/90 backdrop-blur-md border border-emerald-400/30 text-white px-10 py-3.5 rounded-2xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 active:scale-95 transition-all">공부 시작</button>
            )}
            <p className="text-[11px] text-slate-500 font-medium mt-4 tracking-wide">* 탭 이동 시 타이머가 즉시 취소됩니다.</p>
          </div>

          <div className="bg-white/40 backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 flex flex-col justify-center items-center text-center h-[280px] relative overflow-hidden">
            <h2 className="text-2xl font-black tracking-tight mb-1 text-orange-500 drop-shadow-sm">⏰ EARLY BIRD</h2>
            <p className="text-sm font-semibold mb-6 tracking-wide text-slate-600">아침 06:30 ~ 07:30 등교 시 100XP!</p>
            <button onClick={async () => {
              if (!currentUser) return alert("로그인이 필요합니다!");
              const vnTime = new Date((new Date()).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
              const hours = vnTime.getHours(); const minutes = vnTime.getMinutes();
              const currentMins = hours * 60 + minutes;
              if (currentMins < 390 || currentMins > 450) return alert("⏰ 얼리버드 체크인은 아침 06:30 부터 07:30 까지만 가능합니다!");
              const todayKey = `early_${vnTime.getFullYear()}-${vnTime.getMonth() + 1}-${vnTime.getDate()}`;
              const { data: existing } = await supabase.from("contributions").select("*").eq("user_id", currentUser.id).eq("action_type", todayKey).single();
              if (existing) return alert("이미 오늘 얼리버드 보상을 받으셨습니다!");
              await supabase.from("contributions").insert([{ user_id: currentUser.id, action_type: todayKey, points: 100 }]);
              await supabase.from("users").update({ total_xp: (currentUser.total_xp || 0) + 100 }).eq("id", currentUser.id);
              alert("🎉 성공! 100XP를 획득했습니다.");
              sendGlobalNotification("🌅 얼리버드 기상!", `대단해요! ${currentUser.name}님이 7:30 전 등교하여 얼리버드 체크를 완료했습니다 👏`);
              checkAndLoginUser(currentUser.name); fetchRankings();
            }} className="bg-gradient-to-r from-orange-400 to-rose-500 text-white w-full max-w-[200px] font-bold text-lg py-3.5 rounded-2xl shadow-lg shadow-orange-500/30 hover:-translate-y-1 hover:shadow-xl transition-all active:scale-95 z-10 border border-orange-300/50">출석 체크</button>
          </div>
        </div>
      </div>
    </div>
  );
}
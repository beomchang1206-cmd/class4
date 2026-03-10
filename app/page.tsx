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
    // 🚨 1. 공부 시작 알림 제거됨
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

  // 🚨 4. 공지사항 필터링 로직 추가 ('공통'이거나 내가 듣는 과목인 경우만 표시)
  const filteredNotices = pendingNotices.filter(n => n.subject === "공통" || rawSubjects.includes(n.subject));

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-blue-500/40 selection:text-white">
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-float-slow { animation: float 4s ease-in-out infinite; }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>

      <div className="max-w-6xl mx-auto p-5 md:p-10">

        {isQnaModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
            <div className="bg-slate-90 border border-slate-800 rounded-3xl p-8 w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-5">
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  {currentQnaSubject} 라운지
                </h2>
                <button onClick={() => setIsQnaModalOpen(false)} className="text-slate-400 hover:text-slate-100 text-sm font-semibold transition-colors px-4 py-2 rounded-xl hover:bg-slate-800">닫기</button>
              </div>

              <div className="flex-1 overflow-y-auto mb-5 pr-3 flex flex-col gap-4">
                {qnaPosts.length > 0 ? qnaPosts.map(post => (
                  <div key={post.id} className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800/50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-blue-400 text-[15px]">{post.author_name}</span>
                      <span className="text-xs text-slate-500 font-mono">{new Date(post.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                    <p className="text-slate-300 text-[15px] whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <span className="text-4xl mb-4 opacity-50">📂</span>
                    <p className="font-medium text-base">라운지가 비어있습니다. 첫 질문을 남겨보세요.</p>
                  </div>
                )}
              </div>

              <div className="mt-auto border-t border-slate-800 pt-6 flex gap-3">
                <textarea
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-[15px] text-slate-200 placeholder-slate-600 leading-relaxed"
                  rows={2}
                  placeholder="질문이나 정보를 공유해주세요."
                  value={newQnaContent}
                  onChange={(e) => setNewQnaContent(e.target.value)}
                />
                <button
                  onClick={async () => {
                    if (!newQnaContent.trim()) return alert("내용을 입력하세요.");
                    // 🚨 3. 라운지 글 작성 시 author_name을 "익명"으로 데이터베이스에 저장
                    await supabase.from("qna").insert([{ subject: currentQnaSubject, author_name: "익명", content: newQnaContent }]);
                    // 🚨 3. 라운지 새 글 알림도 "익명"으로 발송
                    sendGlobalNotification(`💬 [${currentQnaSubject}] 라운지 새 글`, `익명: ${newQnaContent}`, currentQnaSubject);
                    setNewQnaContent(""); fetchQnaPosts(currentQnaSubject);
                  }}
                  className="bg-blue-600 text-white font-semibold px-8 rounded-xl hover:bg-blue-500 transition-colors text-[15px]"
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-slate-100">새 공지 등록</h2>

              <label className="block text-sm font-medium text-slate-400 mb-2">과목 선택</label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 mb-5 focus:outline-none focus:border-blue-500 text-base text-slate-200" value={formSubject} onChange={(e) => setFormSubject(e.target.value)}>
                {rawSubjects.length > 0 ? rawSubjects.map((sub: string) => <option key={sub} value={sub}>{sub}</option>) : SUBJECT_LIST.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>

              <label className="block text-sm font-medium text-slate-400 mb-2">마감/일정 날짜</label>
              <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 mb-5 focus:outline-none focus:border-blue-500 text-base text-slate-200" value={formDate} onChange={(e) => setFormDate(e.target.value)} />

              <label className="block text-sm font-medium text-slate-400 mb-2">상세 내용</label>
              <textarea className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 mb-8 focus:outline-none focus:border-blue-500 resize-none text-base text-slate-200 placeholder-slate-600 leading-relaxed" rows={4} value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="수행평가 내용 및 준비물을 입력하세요" />

              <div className="flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-transparent border border-slate-700 text-slate-300 text-[15px] font-semibold rounded-xl hover:bg-slate-800 transition-colors">취소</button>
                <button onClick={async () => {
                  if (!formContent || !formDate) return alert("내용을 입력하세요.");
                  await supabase.from("notices").insert([{ subject: formSubject, content: formContent, target_date: formDate }]);
                  scheduleNoticeNotification(formSubject, formDate, formContent);
                  sendGlobalNotification(`🚨 [${formSubject}] 새 공지 등록`, formContent, formSubject);
                  setIsModalOpen(false); setFormContent(""); fetchNotice();
                  alert("공지 등록 및 예약 알림(D-7, D-1) 세팅이 완료되었습니다.");
                }} className="px-8 py-3 bg-blue-600 text-white text-[15px] font-semibold rounded-xl hover:bg-blue-500 transition-colors">등록 완료</button>
              </div>
            </div>
          </div>
        )}

        <header className="mb-12 flex justify-between items-end flex-wrap gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              오름 <span className="text-blue-500">OREUM</span>
            </h1>
            <p className="text-slate-400 text-base mt-2 font-medium">{currentUser ? `${currentUser.name}님, 오늘도 힘내세요.` : "대시보드 이용을 위해 로그인해주세요."}</p>
          </div>
          <div className="flex items-center gap-3">
            {!currentUser ? (
              <button onClick={() => { const n = window.prompt("이름을 입력하세요:"); if (n) checkAndLoginUser(n); }} className="bg-blue-600 text-white px-7 py-3 rounded-xl text-[15px] font-bold hover:bg-blue-500 transition-colors">로그인</button>
            ) : (
              <button onClick={handleLogout} className="bg-slate-800 border border-slate-700 text-slate-300 px-6 py-3 rounded-xl text-[15px] font-semibold hover:bg-slate-700 hover:text-white transition-colors">로그아웃</button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-8 pb-5 border-b border-slate-800/60">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span> 수행평가 및 준비물
              </h2>
              {currentUser && <button onClick={() => setIsModalOpen(true)} className="bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors">+ 새 공지</button>}
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto pr-3">
              {/* 🚨 4. 필터링된 공지(filteredNotices)만 맵핑하여 렌더링되도록 수정 */}
              {filteredNotices.length > 0 ? filteredNotices.map(n => (
                <div key={n.id} className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 hover:border-slate-600 transition-colors">
                  <div className="flex gap-3 mb-3 items-center">
                    <span className="text-xs font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg">{n.subject}</span>
                    <span className="text-sm font-medium text-slate-400">{n.target_date}</span>
                  </div>
                  <p className="text-slate-300 text-base whitespace-pre-wrap leading-relaxed">{n.content}</p>
                </div>
              )) : <div className="flex flex-col items-center justify-center h-full"><p className="text-slate-500 text-base font-medium">현재 내 과목에 등록된 공지가 없습니다.</p></div>}
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col items-center justify-center text-center relative h-[234px] w-full">
              <span className="absolute top-5 left-5 bg-amber-500/10 text-amber-400 text-xs font-bold px-3 py-1 rounded-lg border border-amber-500/20">1위 랭커</span>
              <div className={`text-6xl mb-4 mt-5 ${mStatus.anime}`}>{mStatus.emoji}</div>
              <h2 className="text-base font-bold text-slate-100 mb-2">{mStatus.sName} <span className="text-amber-400 ml-1">Lv.{mStatus.level}</span></h2>
              <div className="w-full max-w-[150px] bg-slate-950 rounded-full h-2 mt-2 mb-2 overflow-hidden border border-slate-800">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${mStatus?.progress || 0}%` }}></div>
              </div>
              <p className="text-xs font-medium text-slate-500">다음 레벨까지 {mStatus.remXp} XP</p>
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col items-center justify-center text-center relative h-[234px] w-full">
              <span className="absolute top-5 left-5 bg-blue-500/10 text-blue-400 text-xs font-bold px-3 py-1 rounded-lg border border-blue-500/20">나의 상태</span>
              {currentUser ? (
                <>
                  <div className={`text-6xl mb-4 mt-5 ${myStatus?.anime}`}>{myStatus?.emoji}</div>
                  <h2 className="text-base font-bold text-slate-100 mb-2">{myStatus?.sName} <span className="text-blue-400 ml-1">Lv.{myStatus?.level}</span></h2>
                  <div className="w-full max-w-[150px] bg-slate-950 rounded-full h-2 mt-2 mb-2 overflow-hidden border border-slate-800">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${myStatus?.progress || 0}%` }}></div>
                  </div>
                  <p className="text-xs font-medium text-slate-500">다음 레벨까지 {myStatus?.remXp} XP</p>
                </>
              ) : <p className="text-slate-500 text-sm font-medium">로그인이 필요합니다.</p>}
            </div>
          </div>

          <div className="lg:col-span-3 bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col">
            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-3">
              💬 과목별 Q&A 라운지
            </h2>
            {currentUser ? (
              <div className="flex gap-3 flex-wrap">
                {mergedSubjects.map((subj: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => openQnaLounge(subj)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 px-6 py-3.5 rounded-xl text-[15px] font-semibold hover:border-blue-500 hover:bg-slate-800/80 transition-colors"
                  >
                    {subj}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-slate-950 rounded-2xl p-8 text-center border border-dashed border-slate-800">
                <p className="text-slate-500 text-[15px] font-medium">로그인하시면 본인이 수강하는 과목의 라운지에 입장할 수 있습니다.</p>
              </div>
            )}
          </div>

          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col h-[320px]">
            <h2 className="text-xl font-bold text-slate-100 mb-6">🏆 명예의 전당</h2>
            <div className="flex flex-col gap-3 overflow-y-auto pr-2">
              {rankings.map((u, i) => (
                <div key={i} className="flex justify-between items-center text-[15px] py-3 px-5 bg-slate-950/50 rounded-xl border border-slate-800/50">
                  <span className="font-semibold text-slate-200">
                    <span className={`inline-block w-6 text-left ${i < 3 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>{i + 1}</span>
                    {u.name}
                  </span>
                  <span className="text-blue-300 font-bold bg-blue-500/10 px-3 py-1 rounded-lg text-sm">{u.total_xp || 0} XP</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-3xl p-8 border flex flex-col items-center justify-center text-center transition-colors h-[320px] relative ${isTimerActive ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}>
            <h2 className="text-sm font-bold text-slate-500 tracking-widest mb-4 uppercase">Study Focus Timer</h2>
            <div className={`text-7xl font-mono font-bold tracking-tighter mb-8 ${isTimerActive ? 'text-emerald-400' : 'text-slate-300'}`}>
              {Math.floor(studySeconds / 60)}<span className="text-slate-600 mx-2">:</span>{String(studySeconds % 60).padStart(2, '0')}
            </div>

            {isTimerActive ? (
              <button onClick={stopTimer} className="bg-slate-800 text-slate-200 px-8 py-3.5 rounded-xl text-[15px] font-bold hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 hover:border-rose-500/50 transition-all w-full max-w-[240px]">기록 종료 및 저장</button>
            ) : (
              <button onClick={startTimer} className="bg-emerald-600 text-white px-8 py-3.5 rounded-xl text-[15px] font-bold hover:bg-emerald-500 transition-colors w-full max-w-[240px]">공부 시작</button>
            )}
            <p className="text-xs text-slate-500 font-medium mt-6">* 다른 탭으로 이동 시 타이머가 취소됩니다.</p>
          </div>

          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col justify-center items-center text-center h-[320px]">
            <h2 className="text-2xl font-extrabold text-slate-100 mb-3">🌅 Early Bird</h2>
            <p className="text-sm font-medium text-slate-400 mb-8 leading-relaxed">아침 06:30 ~ 07:30 접속 시<br />보너스 100 XP 지급</p>
            <button onClick={async () => {
              if (!currentUser) return alert("로그인이 필요합니다.");
              const vnTime = new Date((new Date()).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
              const hours = vnTime.getHours(); const minutes = vnTime.getMinutes();
              const currentMins = hours * 60 + minutes;
              if (currentMins < 390 || currentMins > 450) return alert("현재는 얼리버드 시간이 아닙니다. (06:30 ~ 07:30)");
              const todayKey = `early_${vnTime.getFullYear()}-${vnTime.getMonth() + 1}-${vnTime.getDate()}`;
              const { data: existing } = await supabase.from("contributions").select("*").eq("user_id", currentUser.id).eq("action_type", todayKey).single();
              if (existing) return alert("이미 오늘 얼리버드 보상을 받으셨습니다.");
              await supabase.from("contributions").insert([{ user_id: currentUser.id, action_type: todayKey, points: 100 }]);
              await supabase.from("users").update({ total_xp: (currentUser.total_xp || 0) + 100 }).eq("id", currentUser.id);
              alert("체크인 완료! 100XP가 지급되었습니다.");
              // 🚨 2. 얼리버드 출석체크 알림 제거됨
              checkAndLoginUser(currentUser.name); fetchRankings();
            }} className="bg-slate-800 border border-slate-700 text-slate-200 w-full max-w-[240px] font-bold text-[15px] py-3.5 rounded-xl hover:bg-slate-700 transition-colors">
              출석 체크
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
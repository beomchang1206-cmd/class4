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
    if (level >= 10) { emoji = "🐉"; sName = `수호신 ${name}`; anime = "animate-bounce"; }
    else if (level >= 5) { emoji = "🦅"; sName = `불사조 ${name}`; anime = "animate-bounce"; }
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
    // 🎨 깔끔한 오프화이트 배경
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-gray-900 selection:bg-blue-200">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 📦 메인 래퍼: 모던한 최대 너비 중앙 정렬 */}
      <div className="max-w-6xl mx-auto p-4 md:p-8">

        {/* 💬 QnA 모달 */}
        {isQnaModalOpen && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">💬 {currentQnaSubject} 라운지</h2>
                <button onClick={() => setIsQnaModalOpen(false)} className="text-gray-400 hover:text-gray-900 text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100">닫기</button>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 pr-2 flex flex-col gap-4 hide-scrollbar">
                {qnaPosts.length > 0 ? qnaPosts.map(post => (
                  <div key={post.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-900 text-sm">{post.author_name}</span>
                      <span className="text-[11px] text-gray-400 font-medium">{new Date(post.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <span className="text-3xl mb-3 opacity-30">📭</span>
                    <p className="font-medium text-sm">아직 올라온 질문이 없습니다.</p>
                  </div>
                )}
              </div>

              <div className="mt-auto border-t border-gray-100 pt-5 flex gap-3">
                <textarea
                  className="flex-1 bg-white border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-shadow text-sm text-gray-900 placeholder-gray-400"
                  rows={2}
                  placeholder="질문이나 정보를 공유해 보세요"
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
                  className="bg-gray-900 text-white font-medium px-6 rounded-xl hover:bg-black transition-colors text-sm"
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 📝 공지 작성 모달 */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
              <h2 className="text-xl font-bold tracking-tight mb-5 text-gray-900">📝 새 공지 작성</h2>
              <select className="w-full bg-white border border-gray-200 rounded-xl p-3 mb-4 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 text-sm text-gray-900" value={formSubject} onChange={(e) => setFormSubject(e.target.value)}>
                {rawSubjects.length > 0 ? rawSubjects.map((sub: string) => <option key={sub} value={sub}>{sub}</option>) : SUBJECT_LIST.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
              <input type="date" className="w-full bg-white border border-gray-200 rounded-xl p-3 mb-4 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 text-sm text-gray-900" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              <textarea className="w-full bg-white border border-gray-200 rounded-xl p-3 mb-6 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 resize-none text-sm text-gray-900 placeholder-gray-400" rows={3} value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="준비물이나 일정을 적어주세요" />
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">취소</button>
                <button onClick={async () => {
                  if (!formContent || !formDate) return alert("내용을 입력하세요.");
                  await supabase.from("notices").insert([{ subject: formSubject, content: formContent, target_date: formDate }]);
                  scheduleNoticeNotification(formSubject, formDate, formContent);
                  sendGlobalNotification(`🚨 [${formSubject}] 새 공지 등록`, formContent, formSubject);
                  setIsModalOpen(false); setFormContent(""); fetchNotice();
                  alert("등록 완료! 알림 세팅이 완료되었습니다.");
                }} className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-black transition-colors">등록</button>
              </div>
            </div>
          </div>
        )}

        {/* 🎨 [헤더] 심플하고 타이포그래피 중심의 상단바 */}
        <header className="mb-10 flex justify-between items-end flex-wrap gap-4 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              오름 OREUM
            </h1>
            <p className="text-gray-500 text-sm mt-1.5 font-medium">{currentUser ? `${currentUser.name}님, 환영합니다.` : "대시보드 이용을 위해 로그인해주세요."}</p>
          </div>
          <div className="flex items-center gap-2">
            {!currentUser ? (
              <button onClick={() => { const n = window.prompt("이름을 입력하세요:"); if (n) checkAndLoginUser(n); }} className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm">로그인</button>
            ) : (
              <button onClick={handleLogout} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">로그아웃</button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* 📝 공지사항 섹션 */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col h-[460px]">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold tracking-tight text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> 수행평가 및 준비물
              </h2>
              {currentUser && <button onClick={() => setIsModalOpen(true)} className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium text-xs hover:bg-gray-50 transition-colors">+ 추가</button>}
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto pr-2 hide-scrollbar">
              {pendingNotices.length > 0 ? pendingNotices.map(n => (
                <div key={n.id} className="bg-white p-4 rounded-xl border border-gray-100 hover:border-gray-300 transition-colors group">
                  <div className="flex gap-2 mb-2 items-center">
                    <span className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">{n.subject}</span>
                    <span className="text-[11px] font-medium text-gray-400 group-hover:text-gray-600 transition-colors">{n.target_date}</span>
                  </div>
                  <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{n.content}</p>
                </div>
              )) : <div className="flex flex-col items-center justify-center h-full"><p className="text-gray-400 text-sm font-medium">등록된 공지가 없습니다.</p></div>}
            </div>
          </div>

          {/* 🎮 마스코트/랭킹 섹션 */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col items-center justify-center text-gray-900 text-center relative h-[218px] w-full">
              <span className="absolute top-4 left-4 bg-gray-100 text-gray-600 text-[10px] font-semibold px-2.5 py-1 rounded-md">1위 마스코트</span>
              <div className={`text-5xl mb-3 mt-4 ${mStatus.anime}`}>{mStatus.emoji}</div>
              <h2 className="text-sm font-bold tracking-tight">{mStatus.sName} <span className="text-gray-400 font-medium ml-1">Lv.{mStatus.level}</span></h2>
              <div className="w-full max-w-[140px] bg-gray-100 rounded-full h-1.5 mt-3 mb-2 overflow-hidden">
                <div className="bg-gray-900 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${mStatus?.progress || 0}%` }}></div>
              </div>
              <p className="text-[10px] font-medium text-gray-400">다음 진화까지 {mStatus.remXp} XP</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col items-center justify-center text-gray-900 text-center relative h-[218px] w-full">
              <span className="absolute top-4 left-4 bg-blue-50 text-blue-600 text-[10px] font-semibold px-2.5 py-1 rounded-md">나의 마스코트</span>
              {currentUser ? (
                <>
                  <div className={`text-5xl mb-3 mt-4 ${myStatus?.anime}`}>{myStatus?.emoji}</div>
                  <h2 className="text-sm font-bold tracking-tight">{myStatus?.sName} <span className="text-gray-400 font-medium ml-1">Lv.{myStatus?.level}</span></h2>
                  <div className="w-full max-w-[140px] bg-gray-100 rounded-full h-1.5 mt-3 mb-2 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${myStatus?.progress || 0}%` }}></div>
                  </div>
                  <p className="text-[10px] font-medium text-gray-400">다음 진화까지 {myStatus?.remXp} XP</p>
                </>
              ) : <p className="text-gray-400 text-xs font-medium">로그인이 필요합니다.</p>}
            </div>
          </div>

          {/* 💬 라운지 과목 버튼 */}
          <div className="md:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-5 flex items-center gap-2">
              과목 Q&A 라운지
            </h2>
            {currentUser ? (
              <div className="flex gap-2.5 flex-wrap">
                {mergedSubjects.map((subj: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => openQnaLounge(subj)}
                    className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:border-gray-400 hover:text-gray-900 transition-colors"
                  >
                    {subj}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6 text-center border border-dashed border-gray-200">
                <p className="text-gray-500 text-sm font-medium">로그인 시 본인이 수강하는 과목 라운지가 활성화됩니다.</p>
              </div>
            )}
          </div>

          {/* 🏆 랭킹 섹션 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col h-[280px]">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-5">실시간 랭킹</h2>
            <div className="flex flex-col gap-3 overflow-y-auto pr-1 hide-scrollbar">
              {rankings.map((u, i) => (
                <div key={i} className="flex justify-between items-center text-sm py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                  <span className="font-medium text-gray-800"><span className={`inline-block w-5 text-left ${i < 3 ? 'text-blue-500 font-bold' : 'text-gray-400'}`}>{i + 1}</span> {u.name}</span>
                  <span className="text-gray-900 font-bold bg-gray-100 px-2 py-0.5 rounded text-xs">{u.total_xp || 0} XP</span>
                </div>
              ))}
            </div>
          </div>

          {/* ⏱️ 스터디 타이머 */}
          <div className={`rounded-2xl p-6 shadow-sm border flex flex-col items-center justify-center text-center transition-colors h-[280px] ${isTimerActive ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
            <h2 className="text-sm font-semibold text-gray-500 tracking-tight mb-3 uppercase">STUDY TIMER</h2>
            <div className={`text-6xl font-mono font-bold tracking-tighter mb-6 ${isTimerActive ? 'text-blue-600' : 'text-gray-900'}`}>
              {Math.floor(studySeconds / 60)}<span className="opacity-30">:</span>{String(studySeconds % 60).padStart(2, '0')}
            </div>
            {isTimerActive ? (
              <button onClick={stopTimer} className="bg-gray-900 text-white px-8 py-2.5 rounded-xl text-sm font-medium hover:bg-black transition-colors w-full max-w-[200px]">종료 및 기록 저장</button>
            ) : (
              <button onClick={startTimer} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors w-full max-w-[200px]">공부 시작</button>
            )}
            <p className="text-[11px] text-gray-400 font-medium mt-4">* 탭 이탈 시 기록이 초기화됩니다.</p>
          </div>

          {/* 🌅 얼리버드 */}
          <div className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800 text-white flex flex-col justify-center items-center text-center h-[280px]">
            <h2 className="text-xl font-bold tracking-tight mb-2">Early Bird</h2>
            <p className="text-xs font-medium text-gray-400 mb-6">06:30 ~ 07:30 접속 시 100XP 지급</p>
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
            }} className="bg-white text-gray-900 w-full max-w-[200px] font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
              출석 체크
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
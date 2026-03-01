"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";

const SUBJECT_LIST = [
  "공통", "21세기 문학탐구(월3,화3,목6,금4)", "21세기 문학탐구(월4,화1,수2,목4)",
  "Comprehensive Biology(월1,화2,수7,금3)", "Comprehensive Chemistry(월4,화1,수2,목4)",
  "Critical Literacy in English(화4,화5,수1,목3)", "History of Early Civilizations(월2,화6,목2,금1)",
  "History of Early Civilizations(월6,수6,목1,금2)", "Introduction to Engineering(화4,화5,수1,목3)",
  "고급수학Ⅰ(수4,수5,목7,금5)", "고급수학Ⅰ(월6,수6,목1,금2)", "과학과제 연구(수4,수5,목7,금5)",
  "과학과제 연구(월7,화7,수3,금6)", "기하(월2,화6,목2,금1)", "기하(월3,화3,목6,금4)",
  "기하(화4,화5,수1,목3)", "물리학Ⅱ(월1,화2,수7,금3)", "물리학Ⅱ(월4,화1,수2,목4)",
  "미디어와 창의적 표현(월3,화3,목6,금4)", "미디어와 창의적 표현(월6,수6,목1,금2)",
  "미디어와 창의적 표현(화4,화5,수1,목3)", "미술 전공 실기 심화(월2,화6,목2,금1)",
  "베트남어 회화(월6,수6,목1,금2)", "사회문제 탐구(수4,수5,목7,금5)",
  "사회문제 탐구(월1,화2,수7,금3)", "사회문제 탐구(월2,화6,목2,금1)", "생명과학Ⅱ(월3,화3,목6,금4)",
  "생명과학Ⅱ(화4,화5,수1,목3)", "세계 문제와 미래 사회(월1,화2,수7,금3)",
  "세계 문제와 미래 사회(월7,화7,수3,금6)", "세계 문제와 미래 사회(화4,화5,수1,목3)",
  "수학과제 탐구(수4,수5,목7,금5)", "수학과제 탐구(월3,화3,목6,금4)", "수학과제 탐구(월4,화1,수2,목4)",
  "시사 베트남어(수4,수5,목7,금5)", "심층 융합 독서(수4,수5,목7,금5)", "심층 융합 독서(월6,수6,목1,금2)",
  "영어Ⅱ(월1,화2,수7,금3)", "영어Ⅱ(월2,화6,목2,금1)", "영어Ⅱ(월4,화1,수2,목4)",
  "영어Ⅱ(월6,수6,목1,금2)", "영어Ⅱ(월7,화7,수3,금6)", "윤리와 사상(월3,화3,목6,금4)",
  "윤리와 사상(월4,화1,수2,목4)", "윤리와 사상(월7,화7,수3,금6)", "음악 연주와 창작(월3,화3,목6,금4)",
  "정보과학 과제연구(월7,화7,수3,금6)", "한국 지역의 이해(월1,화2,수7,금3)",
  "한국 지역의 이해(월7,화7,수3,금6)", "화학Ⅱ(월2,화6,목2,금1)", "화학Ⅱ(월6,수6,목1,금2)"
];

export default function Home() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [pendingNotices, setPendingNotices] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formSubject, setFormSubject] = useState("공통");
  const [formContent, setFormContent] = useState("");
  const [formDate, setFormDate] = useState("");

  // --- ⏱️ 스터디 타이머 상태 ---
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [studySeconds, setStudySeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // 폭죽 효과
  const fireConfetti = (count = 150) => {
    confetti({ particleCount: count, spread: 70, origin: { y: 0.6 } });
  };

  useEffect(() => {
    fetchRankings();
    fetchNotice();
    const savedName = localStorage.getItem("userName");
    if (savedName) checkAndLoginUser(savedName);
  }, []);

  // --- 🚫 탭 전환 감지 로직 (부정행위 방지) ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isTimerActive) {
        stopTimer();
        alert("⚠️ 다른 탭으로 이동하여 타이머가 중단되었습니다! 정직하게 공부합시다.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isTimerActive]);

  // 타이머 틱 로직
  useEffect(() => {
    if (isTimerActive) {
      timerRef.current = setInterval(() => {
        setStudySeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerActive]);

  const startTimer = () => {
    if (!currentUser) return alert("로그인 후 이용 가능합니다!");
    setIsTimerActive(true);
    setStudySeconds(0);
  };

  const stopTimer = async () => {
    if (!isTimerActive) return;
    setIsTimerActive(false);

    const minutes = Math.floor(studySeconds / 60);
    const earnedXp = minutes * 2; // 1분당 2XP 보상

    if (earnedXp > 0 && currentUser) {
      const newXp = (currentUser.total_xp || 0) + earnedXp;
      await supabase.from("users").update({ total_xp: newXp }).eq("id", currentUser.id);
      await supabase.from("contributions").insert([{ user_id: currentUser.id, action_type: 'study_timer', points: earnedXp }]);

      fireConfetti(100 + earnedXp);
      alert(`📚 ${minutes}분 공부 완료! ${earnedXp}XP를 획득했습니다.`);
      checkAndLoginUser(currentUser.name);
      fetchRankings();
    }
    setStudySeconds(0);
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + ":" : ""}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // --- 기존 함수들 (Login, Fetch 등) ---
  const fetchRankings = async () => {
    const { data } = await supabase.from("users").select("name, total_xp").order("total_xp", { ascending: false }).limit(5);
    if (data) setRankings(data);
  };

  const fetchNotice = async () => {
    const vnTime = new Date((new Date()).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    const todayStr = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;
    await supabase.from("notices").delete().lt("target_date", todayStr);
    const { data } = await supabase.from("notices").select("*").gte("target_date", todayStr).order("target_date", { ascending: true }).limit(20);
    setPendingNotices(data || []);
  };

  const checkAndLoginUser = async (name: string) => {
    const { data: users } = await supabase.from("users").select("*").eq("name", name.trim());
    if (users && users.length > 0) {
      setCurrentUser(users[0]);
      localStorage.setItem("userName", users[0].name);
    }
  };

  const getRequiredXp = (level: number) => 100 + (Math.pow(level, 2) * 50);
  const getStatus = (totalXp: number, name: string) => {
    let level = 1; let curXp = totalXp || 0; let reqXp = getRequiredXp(level);
    while (curXp >= reqXp) { curXp -= reqXp; level++; reqXp = getRequiredXp(level); }
    const progress = (curXp / reqXp) * 100;
    let emoji = "🥚"; let sName = `${name}의 알`; let anime = "animate-pulse";
    if (level >= 10) { emoji = "🐉"; sName = `수호신 ${name}`; anime = "animate-float"; }
    else if (level >= 5) { emoji = "🦅"; sName = `불사조 ${name}`; anime = "animate-wiggle"; }
    else if (level >= 2) { emoji = "🐣"; sName = `병아리 ${name}`; anime = "animate-bounce"; }
    return { level, emoji, sName, anime, progress, toGo: reqXp - Math.floor(curXp) };
  };

  const mStatus = getStatus(rankings[0]?.total_xp, rankings[0]?.name || "개척자");
  const myStatus = currentUser ? getStatus(currentUser.total_xp, currentUser.name) : null;

  const handleCheckIn = async () => {
    if (!currentUser) return;
    const vnTime = new Date((new Date()).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    const todayStr = `earlybird_${vnTime.getFullYear()}-${vnTime.getMonth() + 1}-${vnTime.getDate()}`;
    const { data: existing } = await supabase.from("contributions").select("*").eq("user_id", currentUser.id).eq("action_type", todayStr).single();
    if (existing) return alert("이미 인증 완료!");

    const oldLv = getStatus(currentUser.total_xp, "").level;
    const newXp = (currentUser.total_xp || 0) + 100;
    const newLv = getStatus(newXp, "").level;

    await supabase.from("contributions").insert([{ user_id: currentUser.id, action_type: todayStr, points: 100 }]);
    await supabase.from("users").update({ total_xp: newXp }).eq("id", currentUser.id);

    if (newLv > oldLv) { fireConfetti(); alert(`🎊 진화 성공! Lv.${newLv}`); }
    else alert("🎉 100XP 획득!");
    checkAndLoginUser(currentUser.name); fetchRankings();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans overflow-hidden text-gray-900">
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        @keyframes wiggle { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
        .animate-wiggle { animation: wiggle 1s ease-in-out infinite; }
        @keyframes bounce-s { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-bounce { animation: bounce-s 1.5s ease-in-out infinite; }
      `}</style>

      {/* 모달 등 생략 (동일) */}

      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black">4기 🐲</h1>
          <p className="text-gray-500 mt-1">{currentUser ? `${currentUser.name}님, 오늘도 힘냅시다!` : "로그인을 해주세요."}</p>
        </div>
        {!currentUser && <button onClick={() => { const n = window.prompt("이름:"); if (n) checkAndLoginUser(n); }} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">로그인</button>}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* 공지사항 (2/3) */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 shadow-md border-2 border-red-50 flex flex-col h-[350px]">
          <div className="flex justify-between items-center mb-4 border-b pb-4">
            <h2 className="text-2xl font-black">🚨 수행평가 및 준비물</h2>
            <button onClick={() => setIsModalOpen(true)} className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-red-600 transition">+ 추가</button>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto pr-2">
            {pendingNotices.map(n => (
              <div key={n.id} className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
                <div className="flex gap-2 mb-1">
                  <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded">{n.target_subject}</span>
                  <span className="text-[10px] font-bold text-gray-400">📅 {n.target_date}</span>
                </div>
                <p className="text-gray-700 font-medium text-sm">{n.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 🏆 마스코트 세로 배치 (1/3) */}
        <div className="flex flex-col gap-6">
          <div className="bg-blue-600 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-white text-center relative h-[280px]">
            <span className="absolute top-4 left-4 bg-yellow-400 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded-full">RANK #1</span>
            <div className={`text-7xl mb-3 ${mStatus.anime}`}>{mStatus.emoji}</div>
            <h2 className="text-lg font-black">{mStatus.sName} (Lv.{mStatus.level})</h2>
            <div className="w-full max-w-[150px] mt-3 h-2 bg-blue-900/40 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 transition-all duration-1000" style={{ width: `${mStatus.progress}%` }}></div>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-white text-center relative h-[280px]">
            <span className="absolute top-4 left-4 bg-indigo-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full">MY STATUS</span>
            {currentUser ? (
              <>
                <div className={`text-7xl mb-3 ${myStatus?.anime}`}>{myStatus?.emoji}</div>
                <h2 className="text-lg font-black">{myStatus?.sName} (Lv.{myStatus?.level})</h2>
                <div className="w-full max-w-[150px] mt-3 h-2 bg-indigo-900/40 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${myStatus?.progress}%` }}></div>
                </div>
              </>
            ) : <p className="text-white/50 text-sm">로그인 필요</p>}
          </div>
        </div>

        {/* 🏆 명예의 전당 (1/3) */}
        <div className="bg-white rounded-3xl p-6 shadow-md border flex flex-col h-[250px]">
          <h2 className="text-lg font-black mb-4">🏆 명예의 전당</h2>
          <div className="flex flex-col gap-3">
            {rankings.map((u, i) => (
              <div key={i} className="flex justify-between items-center text-sm font-bold text-gray-700">
                <span>{i + 1}위 {u.name}</span>
                <span className="text-blue-600">{u.total_xp || 0} XP</span>
              </div>
            ))}
          </div>
        </div>

        {/* ⏳ 스터디 타이머 (1/3) - 새로 추가됨! */}
        <div className={`rounded-3xl p-6 shadow-md border flex flex-col items-center justify-center text-center transition-colors duration-500 h-[250px] ${isTimerActive ? 'bg-emerald-50 border-emerald-200' : 'bg-white'}`}>
          <h2 className="text-lg font-black mb-2 flex items-center gap-2">📖 스터디 타이머</h2>
          <div className={`text-4xl font-mono font-black mb-4 ${isTimerActive ? 'text-emerald-600' : 'text-gray-400'}`}>
            {formatTime(studySeconds)}
          </div>
          {isTimerActive ? (
            <button onClick={stopTimer} className="bg-red-500 text-white px-8 py-2 rounded-xl font-bold shadow-md hover:bg-red-600 transition active:scale-95">공부 종료</button>
          ) : (
            <button onClick={startTimer} className="bg-emerald-500 text-white px-8 py-2 rounded-xl font-bold shadow-md hover:bg-emerald-600 transition active:scale-95">공부 시작</button>
          )}
          <p className="text-[10px] text-gray-400 mt-3">* 1분당 2XP 적립! 다른 탭 이동 시 무효 처리됩니다.</p>
        </div>

        {/* 얼리버드 체크인 (1/3) */}
        <div className="bg-gradient-to-r from-orange-400 to-rose-400 rounded-3xl p-6 shadow-md text-white flex flex-col justify-center text-center h-[250px]">
          <h2 className="text-xl font-black mb-2 italic">⏰ EARLY BIRD</h2>
          <p className="text-xs font-medium opacity-90 mb-4">7:30 전 등교하고 100XP!</p>
          <button onClick={handleCheckIn} className="bg-white text-orange-600 font-black py-3 rounded-2xl shadow-lg hover:scale-105 transition active:scale-95">인증하기</button>
        </div>

      </div>
    </div>
  );
}
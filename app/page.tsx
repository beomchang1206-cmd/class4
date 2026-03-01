"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";
import confetti from "canvas-confetti";
import OneSignal from 'react-onesignal';

const SUBJECT_LIST = [
  "공통", "21세기 문학탐구", "Comprehensive Biology", "Comprehensive Chemistry",
  "Critical Literacy in English", "History of Early Civilizations", "Introduction to Engineering",
  "고급수학Ⅰ", "과학과제 연구", "기하", "물리학Ⅱ", "미디어와 창의적 표현",
  "미술 전공 실기 심화", "베트남어 회화", "사회문제 탐구", "생명과학Ⅱ",
  "세계 문제와 미래 사회", "수학과제 탐구", "시사 베트남어", "심층 융합 독서",
  "영어Ⅱ", "윤리와 사상", "음악 연주와 창작", "정보과학 과제연구", "한국 지역의 이해", "화학Ⅱ"
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

  useEffect(() => {
    // 🔔 OneSignal 초기화 (에러 수정 버전)
    const initOneSignal = async () => {
      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "",
          allowLocalhostAsSecureOrigin: true,
          // image_c0009b.png의 notifyButton 에러를 해결하기 위해 promptOptions로 변경
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: "push",
                  autoPrompt: true,
                  text: {
                    actionMessage: "준비물과 공지사항 알림을 받으시겠습니까?",
                    acceptButton: "허용",
                    cancelButton: "취소",
                  },
                  delay: {
                    pageViews: 1,
                    timeDelay: 5,
                  }
                }
              ]
            }
          }
        });

        if (currentUser) {
          OneSignal.login(currentUser.name);
        }
      } catch (err) {
        console.error("OneSignal 에러:", err);
      }
    };

    initOneSignal();
    fetchRankings();
    fetchNotice();

    const savedName = localStorage.getItem("userName");
    if (savedName) checkAndLoginUser(savedName);
  }, [currentUser]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isTimerActive) {
        setIsTimerActive(false);
        alert("⚠️ 다른 창으로 이동하여 타이머가 중단되었습니다!");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isTimerActive]);

  useEffect(() => {
    if (isTimerActive) {
      timerRef.current = setInterval(() => setStudySeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerActive]);

  const startTimer = () => {
    if (!currentUser) return alert("로그인이 필요합니다!");
    setIsTimerActive(true);
    setStudySeconds(0);
  };

  const stopTimer = async () => {
    if (!isTimerActive) return;
    setIsTimerActive(false);
    const minutes = Math.floor(studySeconds / 60);
    const earnedXp = minutes * 2;

    if (earnedXp > 0 && currentUser) {
      const newXp = (currentUser.total_xp || 0) + earnedXp;
      await supabase.from("users").update({ total_xp: newXp }).eq("id", currentUser.id);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      alert(`📚 ${minutes}분 공부 완료! ${earnedXp}XP 획득!`);
      checkAndLoginUser(currentUser.name);
      fetchRankings();
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

  const checkAndLoginUser = async (name: string) => {
    const { data } = await supabase.from("users").select("*").eq("name", name.trim()).single();
    if (data) {
      setCurrentUser(data);
      localStorage.setItem("userName", data.name);
    }
  };

  const getStatus = (totalXp: number, name: string) => {
    let level = 1; let curXp = totalXp || 0; let reqXp = 100 + (Math.pow(level, 2) * 50);
    while (curXp >= reqXp) { curXp -= reqXp; level++; reqXp = 100 + (Math.pow(level, 2) * 50); }
    const progress = (curXp / reqXp) * 100;
    let emoji = "🥚"; let sName = `${name}의 알`; let anime = "animate-pulse";
    if (level >= 10) { emoji = "🐉"; sName = `수호신 ${name}`; anime = "animate-float"; }
    else if (level >= 5) { emoji = "🦅"; sName = `불사조 ${name}`; anime = "animate-wiggle"; }
    else if (level >= 2) { emoji = "🐣"; sName = `병아리 ${name}`; anime = "animate-bounce"; }
    return { level, emoji, sName, anime, progress };
  };

  const mStatus = getStatus(rankings[0]?.total_xp, rankings[0]?.name || "개척자");
  const myStatus = currentUser ? getStatus(currentUser.total_xp, currentUser.name) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        @keyframes wiggle { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
        .animate-wiggle { animation: wiggle 1s ease-in-out infinite; }
        @keyframes bounce-s { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-bounce { animation: bounce-s 1.5s ease-in-out infinite; }
      `}</style>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-black mb-4">📝 새 공지 작성</h2>
            <select className="w-full border rounded-lg p-2 mb-4 bg-white" value={formSubject} onChange={(e) => setFormSubject(e.target.value)}>
              {SUBJECT_LIST.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
            <input type="date" className="w-full border rounded-lg p-2 mb-4 bg-white" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            <textarea className="w-full border rounded-lg p-2 mb-6 bg-white" rows={3} value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="준비물을 적어주세요" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg">취소</button>
              <button onClick={async () => {
                if (!formContent || !formDate) return alert("내용을 입력하세요!");
                await supabase.from("notices").insert([{ subject: formSubject, content: formContent, target_date: formDate }]);
                setIsModalOpen(false); setFormContent(""); fetchNotice();
              }} className="px-4 py-2 bg-blue-500 text-white rounded-lg">등록</button>
            </div>
          </div>
        </div>
      )}

      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black italic text-blue-600">4기 🐲 DASHBOARD</h1>
          <p className="text-gray-500 font-bold">{currentUser ? `${currentUser.name}님, 오늘도 파이팅!` : "로그인이 필요합니다."}</p>
        </div>
        {!currentUser && <button onClick={() => { const n = window.prompt("이름:"); if (n) checkAndLoginUser(n); }} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">로그인</button>}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-3xl p-6 shadow-md border-2 border-red-50 flex flex-col h-[450px]">
          <div className="flex justify-between items-center mb-4 border-b pb-4">
            <h2 className="text-2xl font-black">🚨 준비물 및 공지</h2>
            <button onClick={() => setIsModalOpen(true)} className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-red-600 transition">+ 추가</button>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto pr-2">
            {pendingNotices.length > 0 ? pendingNotices.map(n => (
              <div key={n.id} className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
                <div className="flex gap-2 mb-1 items-center">
                  <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded">{n.subject}</span>
                  <span className="text-[10px] font-bold text-gray-400">📅 {n.target_date}</span>
                </div>
                <p className="text-gray-800 font-medium text-sm whitespace-pre-wrap mt-2">{n.content}</p>
              </div>
            )) : <p className="text-center py-10 text-gray-400 font-bold">깔끔하네요! 등록된 공지가 없습니다. ☕</p>}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-blue-600 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-white text-center relative h-[210px]">
            <span className="absolute top-4 left-4 bg-yellow-400 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded-full">1위 마스코트</span>
            <div className={`text-6xl mb-2 ${mStatus.anime}`}>{mStatus.emoji}</div>
            <h2 className="text-sm font-black">{mStatus.sName} (Lv.{mStatus.level})</h2>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-white text-center relative h-[210px]">
            <span className="absolute top-4 left-4 bg-indigo-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full">나의 마스코트</span>
            {currentUser ? (
              <>
                <div className={`text-6xl mb-2 ${myStatus?.anime}`}>{myStatus?.emoji}</div>
                <h2 className="text-sm font-black">{myStatus?.sName} (Lv.{myStatus?.level})</h2>
              </>
            ) : <p className="text-white/50 text-sm">로그인 시 공개됩니다.</p>}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-md border flex flex-col h-[280px]">
          <h2 className="text-lg font-black mb-4">🏆 실시간 랭킹</h2>
          <div className="flex flex-col gap-3">
            {rankings.map((u, i) => (
              <div key={i} className="flex justify-between items-center text-sm font-bold text-gray-700">
                <span>{i + 1}위 {u.name}</span>
                <span className="text-blue-600 font-black">{u.total_xp || 0} XP</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-3xl p-6 shadow-md border flex flex-col items-center justify-center text-center transition-colors duration-500 h-[280px] ${isTimerActive ? 'bg-emerald-50 border-emerald-200' : 'bg-white'}`}>
          <h2 className="text-lg font-black mb-2 flex items-center gap-2">📖 스터디 타이머</h2>
          <div className={`text-4xl font-mono font-black mb-4 ${isTimerActive ? 'text-emerald-600' : 'text-gray-400'}`}>
            {Math.floor(studySeconds / 60)}:{String(studySeconds % 60).padStart(2, '0')}
          </div>
          {isTimerActive ? (
            <button onClick={stopTimer} className="bg-red-500 text-white px-8 py-2 rounded-xl font-bold shadow-md active:scale-95">종료 및 저장</button>
          ) : (
            <button onClick={startTimer} className="bg-emerald-500 text-white px-8 py-2 rounded-xl font-bold shadow-md active:scale-95">공부 시작</button>
          )}
          <p className="text-[10px] text-gray-400 mt-3">* 탭 이동 시 타이머가 취소됩니다.</p>
        </div>

        <div className="bg-gradient-to-r from-orange-400 to-rose-400 rounded-3xl p-6 shadow-md text-white flex flex-col justify-center text-center h-[280px]">
          <h2 className="text-xl font-black mb-2 italic text-yellow-200">⏰ EARLY BIRD</h2>
          <p className="text-xs font-medium opacity-90 mb-4 text-white">7:30 전 등교하고 100XP 받기!</p>
          <button onClick={async () => {
            if (!currentUser) return;
            const vnTime = new Date((new Date()).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
            const todayKey = `early_${vnTime.getFullYear()}-${vnTime.getMonth() + 1}-${vnTime.getDate()}`;
            const { data: existing } = await supabase.from("contributions").select("*").eq("user_id", currentUser.id).eq("action_type", todayKey).single();
            if (existing) return alert("이미 완료하셨습니다!");
            await supabase.from("contributions").insert([{ user_id: currentUser.id, action_type: todayKey, points: 100 }]);
            await supabase.from("users").update({ total_xp: (currentUser.total_xp || 0) + 100 }).eq("id", currentUser.id);
            alert("🎉 성공! 100XP를 획득했습니다.");
            checkAndLoginUser(currentUser.name); fetchRankings();
          }} className="bg-white text-orange-600 font-black py-3 rounded-2xl shadow-lg hover:scale-105 transition active:scale-95">출석 체크</button>
        </div>
      </div>
    </div>
  );
}
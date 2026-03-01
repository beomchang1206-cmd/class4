import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 데이터베이스 연결
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 🚨 1단계에서 메모해둔 역할 ID를 여기에 꼭!! 바꿔 적어주세요.
const DISCORD_ROLES: Record<string, string> = {
    "공통": "1477679357378957515",
    "21세기 문학탐구(월3,화3,목6,금4)": "1477679494557991034",
    "21세기 문학탐구(월4,화1,수2,목4)": "1477680518706233559",
    "Comprehensive Biology(월1,화2,수7,금3)": "1477682584795349042",
    "Comprehensive Chemistry(월4,화1,수2,목4)": "1477682588125495538  ",
    "Critical Literacy in English(화4,화5,수1,목3)": "1477682588893319208",
    "History of Early Civilizations(월2,화6,목2,금1)": "1477682589677387787",
    "History of Early Civilizations(월6,수6,목1,금2)": "1477682590403268649",
    "Introduction to Engineering(화4,화5,수1,목3)": "1477682591405572298",
    "고급수학Ⅰ(수4,수5,목7,금5)": "1477682591782932572",
    "고급수학Ⅰ(월6,수6,목1,금2)": "1477682592223596775",
    "과학과제 연구(수4,수5,목7,금5)": "1477682593049874523",
    "과학과제 연구(월7,화7,수3,금6)": "1477682594106835145",
    "기하(월2,화6,목2,금1)": "1477682594463223981",
    "기하(월3,화3,목6,금4)": "1477682595885088839",
    "기하(화4,화5,수1,목3)": "1477682595948007506",
    "물리학Ⅱ(월1,화2,수7,금3)": "1477682596627611729",
    "물리학Ⅱ(월4,화1,수2,목4)": "1477682890207924305",
    "미디어와 창의적 표현(월3,화3,목6,금4)": "1477682890887135242",
    "미디어와 창의적 표현(월6,수6,목1,금2)": "1477682891897962658",
    "미디어와 창의적 표현(화4,화5,수1,목3)": "1477682892489621576",
    "미술 전공 실기 심화(월2,화6,목2,금1)": "1477682893147996270",
    "베트남어 회화(월6,수6,목1,금2)": "1477682894184124528",
    "사회문제 탐구(수4,수5,목7,금5)": "1477683108060069948",
    "사회문제 탐구(월1,화2,수7,금3)": "1477683108781494272",
    "사회문제 탐구(월2,화6,목2,금1)": "1477683109565566976",
    "생명과학Ⅱ(월3,화3,목6,금4)": "1477683110534582332",
    "생명과학Ⅱ(화4,화5,수1,목3)": "1477683219670499459",
    "세계 문제와 미래 사회(월1,화2,수7,금3)": "1477683220244992100",
    "세계 문제와 미래 사회(월7,화7,수3,금6)": "1477683220354171072",
    "세계 문제와 미래 사회(화4,화5,수1,목3)": "1477683221008351374",
    "수학과제 탐구(수4,수5,목7,금5)": "1477683221943816212",
    "수학과제 탐구(월3,화3,목6,금4)": "1477683342190055424",
    "수학과제 탐구(월4,화1,수2,목4)": "1477687218675122196",
    "시사 베트남어(수4,수5,목7,금5)": "1477687516718170303",
    "심층 융합 독서(수4,수5,목7,금5)": "1477683342869532722",
    "심층 융합 독서(월6,수6,목1,금2)": "1477683343536689373",
    "영어Ⅱ(월1,화2,수7,금3)": "1477683344694182101",
    "영어Ⅱ(월2,화6,목2,금1)": "1477683345256091779",
    "영어Ⅱ(월4,화1,수2,목4)": "1477683345927442442",
    "영어Ⅱ(월6,수6,목1,금2)": "1477683346640207942",
    "영어Ⅱ(월7,화7,수3,금6)": "1477683347621806162",
    "윤리와 사상(월3,화3,목6,금4)": "1477683348162740284",
    "윤리와 사상(월4,화1,수2,목4)": "1477683575229780029",
    "윤리와 사상(월7,화7,수3,금6)": "1477683576375083089",
    "음악 연주와 창작(월3,화3,목6,금4)": "1477683576916017273",
    "정보과학 과제연구(월7,화7,수3,금6)": "1477683577360486431",
    "한국 지역의 이해(월1,화2,수7,금3)": "1477683578195284019",
    "한국 지역의 이해(월7,화7,수3,금6)": "1477683579147522128",
    "화학Ⅱ(월2,화6,목2,금1)": "1477683579839316122",
    "화학Ⅱ(월6,수6,목1,금2)": "1477683787784781979"
    // 필요한 과목을 계속 추가하세요
};

export async function GET() {
    try {
        // 1. 베트남 시간 기준으로 '내일 날짜' 계산하기
        const vnTime = new Date((new Date()).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
        vnTime.setDate(vnTime.getDate() + 1); // 하루 더하기
        const tomorrowStr = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;

        // 2. 내일이 목표 날짜(target_date)인 공지사항 DB에서 찾기
        const { data: notices, error } = await supabase
            .from("notices")
            .select("*")
            .eq("target_date", tomorrowStr);

        if (error) throw error;
        if (!notices || notices.length === 0) {
            return NextResponse.json({ message: "내일 마감인 공지가 없습니다." });
        }

        // 3. 디스코드로 알림 발송하기
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (!webhookUrl) throw new Error("웹훅 URL이 등록되지 않았습니다.");

        for (const notice of notices) {
            // 과목에 맞는 역할 ID 찾기
            const roleId = DISCORD_ROLES[notice.subject];
            // 역할 ID가 있으면 태그하고, 없으면 그냥 과목 이름만 굵게 표시
            const mentionText = roleId ? `<@&${roleId}>` : `**[${notice.subject}]**`;

            const message = {
                content: `${mentionText} 🚨 **[내일 마감]** 수행평가 및 준비물 잊지 마세요!`,
                embeds: [{
                    title: `🐲 [${notice.subject}] 마감 D-1 알림`,
                    description: `**내용:**\n${notice.content}`,
                    color: 0xFF3333, // 눈에 띄는 빨간색
                    fields: [{ name: "📅 마감일", value: notice.target_date, inline: true }],
                    footer: { text: "4기 대시보드 자동 알림봇" }
                }]
            };

            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message),
            });
        }

        return NextResponse.json({ message: "디스코드 알림 전송 완료!", count: notices.length });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
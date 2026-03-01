import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
    try {
        // 1. 베트남 시간 기준 '내일 날짜' 구하기
        const vnTime = new Date((new Date()).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
        vnTime.setDate(vnTime.getDate() + 1);
        const tomorrowStr = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;

        // 2. 내일 마감인 공지 찾기
        const { data: notices, error } = await supabase.from("notices").select("*").eq("target_date", tomorrowStr);

        if (error) throw error;
        if (!notices || notices.length === 0) {
            return NextResponse.json({ message: "내일 마감인 공지가 없습니다." });
        }

        const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        const restApiKey = process.env.ONESIGNAL_REST_API_KEY; // Vercel에 새로 추가한 키

        if (!appId || !restApiKey) throw new Error("OneSignal 설정이 누락되었습니다.");

        // 3. 내일 마감인 공지들을 OneSignal로 쏘기
        for (const notice of notices) {
            const response = await fetch("https://onesignal.com/api/v1/notifications", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": `Basic ${restApiKey}`
                },
                body: JSON.stringify({
                    app_id: appId,
                    // 🚨 핵심 포인트: 공지의 '과목명' 이름표를 가진 스마트폰에만 알림을 보냅니다!
                    filters: [
                        { "field": "tag", "key": notice.subject, "relation": "=", "value": "true" }
                    ],
                    headings: { "en": `🚨 [${notice.subject}] 내일 마감!` },
                    contents: { "en": notice.content }
                })
            });
        }

        return NextResponse.json({ message: "과목별 웹 푸시 전송 완료!" });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
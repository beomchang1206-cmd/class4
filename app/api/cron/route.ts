import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
    try {
        const vnTime = new Date((new Date()).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
        vnTime.setDate(vnTime.getDate() + 1);
        const tomorrowStr = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;

        const { data: notices, error } = await supabase.from("notices").select("*").eq("target_date", tomorrowStr);

        if (error) throw error;
        if (!notices || notices.length === 0) {
            return NextResponse.json({ message: "내일 마감인 공지가 없습니다." });
        }

        const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

        for (const notice of notices) {
            await fetch("https://onesignal.com/api/v1/notifications", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": `Basic ${restApiKey}`
                },
                body: JSON.stringify({
                    app_id: appId,
                    filters: [{ "field": "tag", "key": notice.subject, "relation": "=", "value": "true" }],
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
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { title, message } = await req.json();
        const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

        if (!appId || !restApiKey) throw new Error("OneSignal 설정 누락");

        // 모두에게 알림 쏘기!
        await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${restApiKey}`
            },
            body: JSON.stringify({
                app_id: appId,
                included_segments: ["Total Subscriptions"], // 🚨 과목 상관없이 '구독한 모든 사람'에게 보냅니다!
                headings: { "en": title },
                contents: { "en": message }
            })
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
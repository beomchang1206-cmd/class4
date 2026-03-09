import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { title, message, send_after, subject } = await req.json();

        const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

        if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
            throw new Error("OneSignal API Key가 설정되지 않았습니다.");
        }

        const body: any = {
            app_id: ONESIGNAL_APP_ID,
            headings: { en: title, ko: title },
            contents: { en: message, ko: message },
        };

        // ⏰ 예약 시간이 있으면 OneSignal에 예약 세팅!
        if (send_after) {
            body.send_after = send_after;
        }

        // 🎯 타겟팅 설정: '공통'이면 전체 발송, 특정 과목이면 그 과목 태그가 있는 학생만 저격!
        if (subject && subject !== "공통") {
            body.filters = [
                { field: "tag", key: subject, relation: "=", value: "true" }
            ];
        } else {
            body.included_segments = ["All"];
        }

        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Notification Error:', error);
        return NextResponse.json({ success: false, error: error.message || "Unknown Error" }, { status: 500 });
    }
}
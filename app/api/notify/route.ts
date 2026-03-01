import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { title, message } = await req.json();
        const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

        await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${restApiKey}`
            },
            body: JSON.stringify({
                app_id: appId,
                included_segments: ["Total Subscriptions"],
                headings: { "en": title },
                contents: { "en": message }
            })
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
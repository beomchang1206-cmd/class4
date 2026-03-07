import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🚨 여기에 카카오톡 미리보기(openGraph)와 아이폰 홈 화면(appleWebApp) 설정을 모두 때려 넣었습니다!
export const metadata: Metadata = {
  title: "오름 OREUM", // 브라우저 맨 위 탭 이름
  description: "12학년들의 스터디 & QnA 대시보드",
  applicationName: "오름 OREUM", // 안드로이드 등 웹앱 기본 이름
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "오름 OREUM", // 👈 아이폰 홈 화면 추가 시 뜨는 이름!
  },
  openGraph: {
    title: "오름 OREUM",
    description: "스터디 & QnA 대시보드",
    siteName: "오름 OREUM",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko"> {/* 한국어 사이트니까 ko로 변경했습니다! */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
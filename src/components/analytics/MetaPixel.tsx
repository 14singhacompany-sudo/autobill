"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type CookieConsent = "accepted" | "declined" | null;
const CONSENT_KEY = "autobill24_analytics_consent";

function MetaPixelPageView() {
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return null;
}

export function MetaPixelWithConsent() {
  const [consent, setConsent] = useState<CookieConsent>(null);
  const [hasChosen, setHasChosen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    if (saved === "accepted" || saved === "declined") {
      setConsent(saved);
      setHasChosen(true);
    }
  }, []);

  const choose = (value: Exclude<CookieConsent, null>) => {
    window.localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
    setHasChosen(true);
    setShowSettings(false);
    if (value === "declined") {
      window.fbq?.("consent", "revoke");
    } else if (window.fbq) {
      window.fbq("consent", "grant");
      window.fbq("track", "PageView");
    }
  };

  const showBanner = !hasChosen || showSettings;

  return (
    <>
      {consent === "accepted" && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('consent', 'grant');
fbq('init', '1754341272236852');
fbq('track', 'PageView');`}
          </Script>
          <MetaPixelPageView />
        </>
      )}

      {showBanner ? (
        <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-xl border bg-white p-4 shadow-2xl sm:flex sm:items-center sm:gap-4">
          <p className="flex-1 text-sm leading-6 text-gray-700">
            เราใช้คุกกี้เพื่อวิเคราะห์การใช้งานและปรับปรุง AutoBill24 ให้ใช้งานง่ายและตรงกับความต้องการของคุณมากขึ้น รวมถึงวัดผลโฆษณา โดยจะเริ่มทำงานเมื่อคุณยินยอมเท่านั้น {" "}
            <Link href="/privacy" className="font-medium text-blue-600 underline">นโยบายความเป็นส่วนตัว</Link>
          </p>
          <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
            <button type="button" onClick={() => choose("declined")} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-gray-50">ใช้เฉพาะคุกกี้ที่จำเป็น</button>
            <button type="button" onClick={() => choose("accepted")} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">ยอมรับและช่วยปรับปรุง</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="fixed bottom-2 left-2 z-[90] rounded-md border bg-white/90 px-2 py-1 text-[11px] text-gray-600 shadow-sm hover:bg-white"
        >
          ตั้งค่าคุกกี้
        </button>
      )}
    </>
  );
}

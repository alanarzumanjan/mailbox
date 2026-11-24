"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Presentation } from "lucide-react";

// Показывается только если демо открыто из презентации
export default function BackToPitch() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { setShow(sessionStorage.getItem("mg-from-pitch") === "1"); } catch {}
  }, []);
  if (!show) return null;
  return (
    <Link
      href="/pitch"
      className="fixed bottom-5 left-5 z-50 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold shadow-lg hover:brightness-95 transition"
      style={{ background: "#FFCC00", color: "#1A1F2C" }}
    >
      <Presentation className="w-4 h-4" />
      Вернуться в презентацию
    </Link>
  );
}

/**
 * Шапка главной страницы: скрывается при скролле вниз,
 * плавно выезжает при скролле наверх и встает в поток в самом верху.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Header() {
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Если докрутили до самого верха (меньше 80px)
      if (currentScrollY <= 10) {
        setIsAtTop(true);
        setIsVisible(true);
      } else {
        setIsAtTop(false);
        // Если крутим вниз — скрываем (-translate-y-full)
        if (currentScrollY > lastScrollY && currentScrollY > 80) {
          setIsVisible(false);
        }
        // Если крутим вверх — показываем
        else if (currentScrollY < lastScrollY) {
          setIsVisible(true);
        }
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const baseStyles =
    "inline-flex items-center justify-center font-headline text-sm sm:text-base px-4 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-200";
  const primaryStyle =
    "font-bold text-white bg-[#172033] hover:bg-[#222b3f] shadow-md shadow-[#172033]/20 hover:shadow-lg active:scale-[0.98]";

  return (
    <header
      className={`w-full z-50 transition-all duration-300 ease-in-out bg-white/90 backdrop-blur-md border-b border-slate-200/80 ${
        isAtTop
          ? "relative" // В самом верху страницы — в естественном потоке
          : `fixed top-0 left-0 ${
              isVisible ? "translate-y-0 shadow-md" : "-translate-y-full"
            }` // При скролле — фиксированная и плавно уезжает/приезжает
      }`}
    >
      <div className="max-w-7xl mx-auto h-20 flex items-center justify-between px-4 sm:px-6 md:px-10">
        {/* 1. Логотип слева */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#172033] flex items-center justify-center shadow-sm shrink-0">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M4 8.5 12 4l8 4.5v8L12 21l-8-4.5z" />
              <path d="M4.5 8.7 12 13l7.5-4.3M12 13v7.5M8 6.2l8 4.6" />
            </svg>
          </div>
          <Link
            href="/"
            className="font-black tracking-tight text-xl text-slate-900"
          >
            Empty<span className="text-emerald-600">Less</span>
          </Link>
        </div>

        {/* 2. Меню с якорными ссылками по центру */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <a href="#demo" className="hover:text-slate-900 transition">
            Live Demo
          </a>
          <a href="#features" className="hover:text-slate-900 transition">
            Features
          </a>
          <a href="#roi" className="hover:text-slate-900 transition">
            ROI & Savings
          </a>
          <a href="#team" className="hover:text-slate-900 transition">
            Team
          </a>
        </nav>

        {/* 3. Кнопка справа */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className={`${baseStyles} ${primaryStyle} py-2.5 px-5 text-sm sm:text-sm`}
          >
            Try Interactive Demo
          </Link>
        </div>
      </div>
    </header>
  );
}

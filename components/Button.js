"use client";

import React from "react";
import Link from "next/link";

export function Button({
  children,
  variant = "primary",
  href,
  className = "",
  onClick,
  eventName,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-headline text-sm sm:text-base px-4 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-200";

  const variants = {
    primary:
      "font-bold text-white bg-[#0075FF] hover:bg-[#0055FF] shadow-md shadow-[#0075FF]/20 hover:shadow-lg active:scale-[0.98]",
    secondary:
      "font-semibold text-slate-900 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm",
  };

  const combinedClasses =
    `${baseStyles} ${variants[variant]} ${className}`.trim();

  const handleClick = (e) => {
    if (eventName && typeof trackEvent === "function") {
      try {
        trackEvent(eventName, {
          button_text: typeof children === "string" ? children : "icon_button",
        });
      } catch (error) {
        console.error("Analytics error:", error);
      }
    }
    if (onClick) onClick(e);
  };

  if (href) {
    return (
      <Link
        href={href}
        className={combinedClasses}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={combinedClasses}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

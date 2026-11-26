"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Minus,
  LayoutDashboard,
  Navigation,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

export default function HowItWorksPlatform() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "1. Live postbox fill levels",
      description:
        "Monitor fill percentage across the entire network in real time and spot 100% full boxes before they overflow.",
      badge: "Real-time fill telemetry",
      icon: LayoutDashboard,
      imageSrc: "/step-sensors.png",
    },
    {
      title: "2. Smart routes with fuel & distance savings",
      description:
        "Couriers get an optimal route covering only full postboxes—with instant estimates of saved fuel and driven kilometers.",
      badge: "Zero empty stops • Built-in savings",
      icon: Navigation,
      videoSrc: "/courier-demo.mp4",
      imageSrc: "/images/dispatcher-view.png",
    },
    {
      title: "3. Instant 'Courier → Dispatcher' sync",
      description:
        "When a courier taps 'Mark as collected', the postbox resets to 0% and the dispatcher's dashboard updates live.",
      badge: "Two-way live sync • Zero manual calls",
      icon: RefreshCw,
      videoSrc: "/alert-demo.mp4",
    },
  ];

  const currentItem = steps[activeStep];
  const BadgeIcon = currentItem.icon;

  return (
    <section id="platform" className="py-24 bg-white text-[#172033] font-body">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-headline text-sm font-bold uppercase tracking-wider text-[#0b9b70] mb-2 block">
            PLATFORM & DASHBOARD
          </span>
          <h2 className="font-headline font-black text-3xl sm:text-4xl md:text-5xl tracking-tight text-[#172033]">
            Experience the live control center
          </h2>
        </div>

        {/* Two-column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Interactive Accordion & CTA (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex flex-col">
              {steps.map((step, index) => {
                const isActive = activeStep === index;

                return (
                  <div
                    key={index}
                    className={`border-b border-slate-200 transition-colors duration-200 ${
                      index === 0 ? "border-t" : ""
                    }`}
                  >
                    <button
                      onClick={() => setActiveStep(index)}
                      className="w-full py-6 flex items-center justify-between text-left group cursor-pointer focus:outline-none"
                      aria-expanded={isActive}
                    >
                      <span
                        className={`font-headline font-bold text-lg sm:text-xl transition-colors duration-200 ${
                          isActive
                            ? "text-[#0b9b70]"
                            : "text-[#172033] group-hover:text-[#0b9b70]"
                        }`}
                      >
                        {step.title}
                      </span>
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 shrink-0 ml-4 ${
                          isActive
                            ? "bg-[#0b9b70]/10 text-[#0b9b70]"
                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                        }`}
                      >
                        {isActive ? (
                          <Minus className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </span>
                    </button>

                    {/* Expandable Content */}
                    <div
                      className={`grid transition-all duration-300 ease-in-out overflow-hidden ${
                        isActive
                          ? "grid-rows-[1fr] opacity-100 pb-6"
                          : "grid-rows-[0fr] opacity-0 pb-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="font-body text-[#172033]/70 text-base leading-relaxed mb-4">
                          {step.description}
                        </p>

                        {/* Bottom Badge with Icon */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-[#172033]">
                          <BadgeIcon className="w-4 h-4 text-[#0b9b70]" />
                          <span>{step.badge}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Кнопка перехода на /dashboard */}
            <div className="mt-8">
              <Link
                href="/dashboard"
                className="w-full inline-flex items-center justify-center gap-3 py-4 px-6 bg-[#0b9b70] hover:bg-[#087a58] text-white font-headline font-bold text-base rounded-2xl shadow-lg shadow-[#0b9b70]/20 transition-all cursor-pointer active:scale-[0.98]"
              >
                <span>Open Live Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Right Column: Dynamic Product Preview (lg:col-span-7) */}
          <div className="lg:col-span-7">
            <div className="relative w-full rounded-3xl overflow-hidden bg-slate-50">
              <div className="relative w-full aspect-[1623/1318] overflow-hidden rounded-3xl flex items-center justify-center bg-white">
                <div className="w-full h-full transition-opacity duration-300 ease-in-out opacity-100">
                  {currentItem.videoSrc ? (
                    <video
                      key={currentItem.videoSrc}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full rounded-3xl shadow-md object-contain"
                    >
                      <source src={currentItem.videoSrc} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="relative w-full h-full rounded-3xl overflow-hidden bg-white">
                      <Image
                        src={currentItem.imageSrc}
                        alt={currentItem.title}
                        fill
                        className="object-contain rounded-3xl"
                        priority
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

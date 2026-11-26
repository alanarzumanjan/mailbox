import React from "react";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Mail,
  Check,
  X,
  Radio,
  Cpu,
  Route,
  Truck,
  Fuel,
  Clock,
  Leaf,
} from "lucide-react";
import { FaqSection } from "@/components/FAQSection";
import { Button } from "@/components/Button";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import InteractiveMailGridPreview from "@/components/InteractiveMailGridPreview";
import MailboxHero3D from "@/components/MailboxHero3D";
import HowItWorksPlatform from "@/components/HowItWorksPlatform";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* 2. Hero Section  */}
        <section className="relative overflow-hidden pt-8 pb-20 md:pt-12 md:pb-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* LEFT COLUMN: CONTENT */}
              <div className="lg:col-span-7 flex flex-col items-start">
                {/* TOP SUB-TAGS / BADGE */}
                <div className="flex items-center gap-2 text-[10px] md:text-sm font-mono font-semibold uppercase tracking-wider text-[#172033]/60 mb-6">
                  <span className="inline-block w-2.5 h-0.5 bg-[#0b9b70]" />
                  <span>SENSORS</span>
                  <span>•</span>
                  <span>SMART ROUTING</span>
                  <span>•</span>
                  <span>LESS CO₂</span>
                </div>

                {/* MAIN HEADLINE */}
                <h1 className="font-headline font-black text-[38px] sm:text-5xl md:text-6xl lg:text-6.5xl tracking-tight text-[#172033] leading-[1.05] mb-6">
                  Never visit an{" "}
                  <span className="text-[#0b9b70]">empty mailbox</span> again
                </h1>

                {/* DESCRIPTION */}
                <p className="font-body text-base sm:text-lg md:text-xl text-[#172033]/70 max-w-xl leading-relaxed mb-8">
                  We help Latvijas Pasts cut fuel, driver hours, and CO₂. Using
                  smart sensors to route couriers only to full mailboxes instead
                  of blind schedules.
                </p>

                {/* CTA BUTTONS */}
                <div className="flex flex-row items-center gap-2.5 sm:gap-3 mb-5">
                  <Link
                    href="#contact"
                    className="inline-flex items-center justify-center font-headline text-sm sm:text-base px-4 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-200 font-bold text-white bg-[#0b9b70] hover:bg-[#087a58] shadow-md shadow-[#0b9b70]/20 hover:shadow-lg active:scale-[0.98]"
                  >
                    Stop Blind Routing
                  </Link>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center justify-center font-headline text-sm sm:text-base px-4 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-200 font-semibold text-[#172033] bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
                  >
                    How it works
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2 text-[#172033]/70" />
                  </a>
                </div>

                {/* FOOTNOTE TEXT */}
                <p className="font-mono text-xs text-[#172033]/60 tracking-tight">
                  less fuel · fewer empty trips · no overflowing mailboxes
                </p>
              </div>

              {/* RIGHT COLUMN: 3D MAILBOX SIMULATION MOCKUP */}
              <div className="lg:col-span-5 w-full">
                <MailboxHero3D />
              </div>
            </div>
          </div>
        </section>
        <section id="demo">
          <InteractiveMailGridPreview />
        </section>
        {/* 3. Section: Pain Points */}
        <section className="py-20 bg-white text-[#172033] font-body">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center mx-auto mb-10">
              <h2 className="font-headline font-black text-3xl sm:text-4xl md:text-5xl tracking-tight mb-4 text-[#172033]">
                Why drive to{" "}
                <span className="underline decoration-[#0b9b70] underline-offset-4">
                  empty
                </span>{" "}
                mailboxes?
              </h2>
              <p className="font-body max-w-2xl m-auto text-[#172033]/70 text-lg sm:text-xl">
                Couriers follow a fixed schedule, so every day they visit
                hundreds of mailboxes blind, while some stay empty and others
                overflow.
              </p>
            </div>
            {/* Comparison Grid */}
            <div className="grid md:grid-cols-2 gap-8 items-stretch">
              {/* BAD SIDE: Fixed schedule */}
              <div className="bg-red-50/60 border border-red-200/80 rounded-3xl p-8 sm:p-10 flex flex-col justify-between">
                <div>
                  <h3 className="font-headline font-bold text-2xl text-red-900 mb-6">
                    Fixed-schedule rounds
                  </h3>

                  <ul className="space-y-4 font-body">
                    {[
                      "Hundreds of mailboxes visited blind every day",
                      "Most stops are empty — wasting fuel, time, and money",
                      "Meanwhile, high-traffic mailboxes overflow between visits",
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-red-900 text-base sm:text-lg"
                      >
                        <X className="w-5 h-5 text-red-500 shrink-0 mt-1" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* GOOD SIDE: Smart routing */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-3xl p-8 sm:p-10 flex flex-col justify-between">
                <div>
                  <h3 className="font-headline font-bold text-2xl text-emerald-950 mb-6">
                    Smart routing
                  </h3>

                  <ul className="space-y-4 font-body">
                    {[
                      "Sensors track mailbox fill levels in real time",
                      "Daily routes automatically include only full mailboxes",
                      "Less fuel, saved courier hours, and lower CO₂",
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-emerald-950 text-base sm:text-lg font-medium"
                      >
                        <Check className="w-5 h-5 text-[#0b9b70] shrink-0 mt-1" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* 4. How it works */}
        <HowItWorksPlatform />
        {/* 5. Pilot (replaces Pricing) */}
        <section
          id="pilot"
          className="py-20 bg-slate-50 text-[#172033] font-body"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="font-headline text-sm font-bold uppercase tracking-wider text-[#172033]/60 mb-2 block">
                Pilot
              </span>
              <h2 className="font-headline font-black text-3xl sm:text-4xl md:text-5xl tracking-tight text-[#172033] mb-4">
                Start small. Prove it on real routes.
              </h2>
              <p className="font-body text-[#172033]/70 text-lg sm:text-xl">
                Test smart routing on a limited set of mailboxes and see the
                difference before scaling up.
              </p>
            </div>
            {/* Pilot Cards Grid */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
              {[
                {
                  name: "Pilot",
                  description:
                    "A trial on one district to measure real savings.",
                  badge: "Start here",
                  isFeatured: true,
                  buttonText: "Request a pilot",
                  href: "#contact",
                  features: [
                    "Sensors on a selected group of mailboxes",
                    "Daily smart routes for couriers",
                    "Report on fuel, time and CO₂ saved",
                  ],
                },
                {
                  name: "Full rollout",
                  description:
                    "Smart routing across the whole mailbox network.",
                  badge: "",
                  isFeatured: false,
                  buttonText: "Talk to us",
                  href: "#contact",
                  features: [
                    "Sensors across the network",
                    "Routing platform integrated with your operations",
                    "Ongoing support and optimization",
                  ],
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`bg-white rounded-3xl p-8 relative flex flex-col justify-between transition-all duration-300 ${
                    plan.isFeatured
                      ? "border-2 border-[#0b9b70] shadow-xl scale-[1.02]"
                      : "border border-slate-200/80 shadow-xs hover:border-slate-300"
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0b9b70] text-white font-headline text-xs font-bold px-5 sm:px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm whitespace-nowrap w-max">
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    {/* Title */}
                    <div className="mb-6">
                      <h3 className="font-headline font-bold text-2xl text-[#172033] mb-2">
                        {plan.name}
                      </h3>
                      <p className="font-body text-[#172033]/70 text-sm min-h-10">
                        {plan.description}
                      </p>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-3.5 mb-8 font-body">
                      {plan.features.map((feature, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-[#172033]/80 text-sm"
                        >
                          <Check className="w-5 h-5 text-[#0b9b70] shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={plan.href}
                    className={`w-full inline-flex items-center justify-center font-headline text-sm font-bold py-3.5 px-6 rounded-xl cursor-pointer transition-all duration-200 shadow-sm ${
                      plan.isFeatured
                        ? "bg-[#0b9b70] text-white hover:bg-[#087a58] shadow-[#0b9b70]/20"
                        : "bg-slate-100 text-[#172033] hover:bg-slate-200 border border-slate-200/60 shadow-none"
                    }`}
                  >
                    {plan.buttonText}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* 6 Benefits Section (replaces Templates showcase) */}
        <section
          id="benefits"
          className="py-20 bg-slate-50 border-y border-slate-200/60 font-body"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <span className="font-headline text-sm font-bold uppercase tracking-wider text-[#0b9b70] mb-2 block">
                  Benefits
                </span>
                <h2 className="font-headline font-black text-3xl sm:text-4xl md:text-5xl tracking-tight text-[#172033]">
                  Savings on every route
                </h2>
              </div>
              <p className="font-body text-[#172033]/70 max-w-lg text-base sm:text-lg">
                Fewer kilometers, fewer wasted visits and a greener network for
                Latvijas Pasts.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Fuel,
                  title: "Less fuel",
                  desc: "Couriers skip empty mailboxes and drive only the kilometers that matter.",
                },
                {
                  icon: Clock,
                  title: "Less courier time",
                  desc: "Shorter routes free up working hours for other tasks.",
                },
                {
                  icon: Leaf,
                  title: "Lower CO₂",
                  desc: "Fewer trips mean fewer emissions from servicing the mailbox network.",
                },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <div
                    key={b.title}
                    className="rounded-2xl border border-slate-200/80 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#0b9b70]/40 hover:shadow-lg"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#0b9b70]/10 flex items-center justify-center text-[#0b9b70] mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-headline font-bold text-lg text-[#172033] mb-1">
                      {b.title}
                    </h3>
                    <p className="font-body text-sm text-[#172033]/70 leading-relaxed">
                      {b.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        {/* 6. FAQ Section */}
        <FaqSection />
        {/* 7. CTA */}
        <section
          id="contact"
          className="py-20 sm:py-28 bg-white text-[#172033] font-body relative overflow-hidden"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0b9b70]/10 border border-[#0b9b70]/20 text-[#0b9b70] font-headline text-xs sm:text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Ready to stop driving to empty mailboxes?</span>
            </div>

            {/* Heading */}
            <h2 className="font-headline font-black text-3xl sm:text-4xl md:text-5xl tracking-tight text-[#172033] mb-6 max-w-2xl mx-auto">
              Let&apos;s test smart routing on your mailboxes
            </h2>

            {/* Subtitle */}
            <p className="font-body text-[#172033]/70 text-base sm:text-lg max-w-md mx-auto mb-8 leading-relaxed">
              Launch a pilot and see how much fuel, time and CO₂ you save.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-row sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:hello@example.com"
                className="inline-flex items-center justify-center font-headline text-sm sm:text-base px-4 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-200 font-bold text-white bg-[#0b9b70] hover:bg-[#087a58] shadow-md shadow-[#0b9b70]/20 hover:shadow-lg active:scale-[0.98]"
              >
                Request a pilot
              </a>
              <Button href="#how-it-works" variant="secondary">
                How it works
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2 text-[#172033]/70" />
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

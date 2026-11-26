"use client";

import { useState } from "react";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "How does the sensor send data from inside a metal mailbox?",
      answer:
        "We use low-power wide-area networking (NB-IoT / LoRaWAN) designed to penetrate metal enclosures and dense urban buildings reliably.",
    },
    {
      question: "How long does the battery last?",
      answer:
        "Up to 3–5 years on a single replaceable battery, thanks to ultra-low-power sleep mode between mail drop events.",
    },
    {
      question: "Do couriers need to learn a new app?",
      answer:
        "No. Optimized routes integrate directly into existing fleet navigation systems via API or open in standard mobile maps.",
    },
    {
      question: "Is the hardware weatherproof and tamper-resistant?",
      answer:
        "Yes. Each unit is IP65-rated for Baltic winters (-30°C to +60°C) and mounts discreetly out of reach from the mail slot.",
    },
    {
      question: "How quickly does EmptyLess pay for itself?",
      answer:
        "Typically within 4 to 6 months by cutting empty-box stops, fuel consumption, and courier hours by up to 65%.",
    },
  ];

  // SEO Microdata Schema.org (FAQPage)
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 bg-slate-50">
      {/* Внедрение SEO-скрипта Schema.org */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-headline text-sm font-bold uppercase tracking-wider text-[#0b9b70] mb-2 block">
            FAQ
          </span>
          <h2 className="font-headline font-black text-3xl sm:text-4xl text-slate-900 tracking-tight mb-4">
            Common Questions
          </h2>
          <p className="font-body text-slate-600 text-base sm:text-lg">
            Everything you need to know about EmptyLess, installation, and
            network performance.
          </p>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-300"
              >
                {/* Кликабельная шапка на всю ширину */}
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between gap-4 p-6 text-left font-headline font-bold text-lg text-slate-900 hover:text-[#0b9b70] transition-colors cursor-pointer select-none"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200 ${
                      isOpen
                        ? "bg-[#0b9b70]/10 text-[#0b9b70]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span
                      className={`font-mono text-xl font-bold transition-transform duration-300 ${
                        isOpen ? "rotate-45" : "rotate-0"
                      }`}
                    >
                      +
                    </span>
                  </span>
                </button>

                {/* Плавный контейнер с ограниченной высотой */}
                <div
                  className={`grid transition-[grid-template-rows,padding] duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] pb-6" : "grid-rows-[0fr] pb-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="font-body text-slate-600 text-sm sm:text-base leading-relaxed px-6 pt-2 border-t border-slate-100">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

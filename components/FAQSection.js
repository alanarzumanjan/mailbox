"use client";

import { useState } from "react";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "Is this really a one-time payment? No subscriptions?",
      answer:
        "Yes, 100%! You pay once and get access forever. We will never charge your card again, auto-renew, or ask for a monthly subscription.",
    },
    {
      question: "Are the resume templates ATS-friendly?",
      answer:
        "We offer a mix of templates! Many of our layouts are fully ATS-optimized with single-column structures and clean typography. We also provide human-first, visually creative designs tailored for industries where visual impact matters most. You can choose the format that best fits your role.",
    },
    {
      question: "Can I edit my resume after downloading?",
      answer:
        "Yes! You can come back anytime, make changes, tweak your work experience, and download an updated PDF as many times as you need without extra fees.",
    },
    {
      question: "What file format will I receive?",
      answer:
        "You will export high-quality, pixel-perfect PDF files ready to be sent directly to recruiters or uploaded to job platforms.",
    },
    {
      question: "Do I need to enter credit card details to test it?",
      answer:
        "No! You can try our live demo to see how it looks. You only pay when you decide to unlock access and download.",
    },
    {
      question: "Do you offer refunds?",
      answer:
        "Due to the digital nature of our downloadable templates, all sales are final and non-refundable.",
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
    <section id="faq" className="py-20 bg-[#FAF9F5]">
      {/* Внедрение SEO-скрипта Schema.org */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-headline font-black text-3xl sm:text-4xl text-slate-900 tracking-tight mb-4">
            Frequently asked questions
          </h2>
          <p className="font-body text-slate-600 text-base sm:text-lg">
            Everything you need to know about OnePayCV and our one-time payment
            policy.
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
                  className="w-full flex items-center justify-between gap-4 p-6 text-left font-headline font-bold text-lg text-slate-900 hover:text-[#0075FF] transition-colors cursor-pointer select-none"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <span
                    className={`shrink-0 font-mono text-[#0075FF] text-xl font-bold transition-transform duration-300 ${
                      isOpen ? "rotate-45" : "rotate-0"
                    }`}
                  >
                    +
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

// "use client";

// import React, { useState, useEffect } from "react";
// import { X, Sparkles, Check } from "lucide-react";
// import { trackEvent } from "../libs/gtag";
// import { Button } from "./Button";

// export function EarlyAccessModal({
//   isOpen: externalIsOpen,
//   onClose: externalOnClose,
// }) {
//   // 1. Internal state to handle global class clicks (.open-popup)
//   const [internalIsOpen, setInternalIsOpen] = useState(false);
//   const [email, setEmail] = useState("");
//   const [isSubmitted, setIsSubmitted] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);

//   // Determine if open from either external props or internal click listener
//   const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

//   const handleClose = () => {
//     if (externalOnClose) {
//       externalOnClose();
//     } else {
//       setInternalIsOpen(false);
//     }
//   };

//   // 2. Safe global listener that won't break Next.js routing links
//   useEffect(() => {
//     const handleGlobalClick = (e) => {
//       const target = e.target;
//       const button = target.closest(".open-popup");

//       // ONLY intercept if the element explicitly has the popup trigger class
//       if (button) {
//         e.preventDefault();

//         if (externalIsOpen !== undefined && externalOnClose) {
//           // If state is managed by parent, we don't change anything internally
//           // Ideally, parent should pass a toggle function down
//         } else {
//           setInternalIsOpen(true);
//         }
//       }
//     };

//     document.addEventListener("click", handleGlobalClick);
//     return () => document.removeEventListener("click", handleGlobalClick);
//   }, [externalIsOpen, externalOnClose]);

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!email || isLoading) return;

//     setIsLoading(true);

//     const GOOGLE_SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;

//     try {
//       if (GOOGLE_SCRIPT_URL) {
//         await fetch(GOOGLE_SCRIPT_URL, {
//           method: "POST",
//           mode: "no-cors",
//           headers: {
//             "Content-Type": "text/plain;charset=utf-8",
//           },
//           body: JSON.stringify({
//             email: email.trim(),
//           }),
//         });
//       }

//       if (typeof trackEvent === "function") {
//         trackEvent("generate_lead", {
//           event_category: "Form",
//           event_label: "Early Access Modal",
//         });
//       }

//       setIsSubmitted(true);

//       setTimeout(() => {
//         setIsSubmitted(false);
//         setEmail("");
//         handleClose();
//       }, 2500);
//     } catch (error) {
//       console.error("Error saving email:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-150">
//       <div className="absolute inset-0" onClick={handleClose} />

//       <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 z-10 animate-in zoom-in-95 duration-150 font-body">
//         <button
//           type="button"
//           onClick={handleClose}
//           className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
//         >
//           <X className="w-5 h-5" />
//         </button>

//         {!isSubmitted ? (
//           <>
//             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0075FF]/10 text-[#0075FF] font-headline text-xs font-bold mb-4">
//               <Sparkles className="w-3.5 h-3.5" />
//               <span>Early Access Pass</span>
//             </div>

//             <h3 className="font-headline font-black text-2xl sm:text-3xl text-slate-900 mb-3 tracking-tight">
//               Thanks for your interest!
//             </h3>

//             <p className="font-body text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
//               We are currently polishing our resume builder to make it
//               absolutely perfect. Leave your email to get early access and a{" "}
//               <span className="font-bold text-slate-900">50% discount</span> on
//               launch day!
//             </p>

//             <form
//               onSubmit={handleSubmit}
//               className="flex flex-col sm:flex-row gap-2.5"
//               name="early-access-form"
//             >
//               <input
//                 type="email"
//                 required
//                 placeholder="Enter your email"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 className="w-full px-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 focus:border-[#0075FF] focus:ring-2 focus:ring-[#0075FF]/20 text-slate-900 font-body text-sm sm:text-base outline-none transition-all"
//               />

//               <Button
//                 type="submit"
//                 variant="primary"
//                 disabled={isLoading}
//                 className="shrink-0 whitespace-nowrap"
//               >
//                 {isLoading ? "Sending..." : "Notify Me"}
//               </Button>
//             </form>
//           </>
//         ) : (
//           <div className="py-6 text-center">
//             <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-4">
//               <Check className="w-6 h-6" />
//             </div>

//             <h4 className="font-headline font-bold text-xl text-slate-900 mb-2">
//               You&apos;re on the list!
//             </h4>

//             <p className="font-body text-slate-600 text-sm">
//               We&apos;ll notify you as soon as early access opens.
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

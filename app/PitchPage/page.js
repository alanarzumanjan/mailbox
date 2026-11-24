"use client";

import { useRouter } from "next/navigation";
import PitchDeck from "@/components/PitchDeck";

export default function PitchPage() {
  const router = useRouter();
  const openDemo = () => {
    try {
      sessionStorage.setItem("mg-from-pitch", "1");
    } catch {}
    router.push("/"); // главная страница с DispatcherDashboard
  };
  return <PitchDeck onOpenDemo={openDemo} />;
}

import { DM_Sans, Manrope } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata = {
  title: "MailGrid — Smart Postbox Dispatch",
  description: "IoT monitoring and route optimization for Latvijas Pasts",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${manrope.variable}`}>
      <body className="bg-slate-50 font-sans antialiased">{children}</body>
    </html>
  );
}

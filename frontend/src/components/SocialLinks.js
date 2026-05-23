import React from "react";
import { SOCIAL_LINKS } from "@/lib/contact";

/* Inline TikTok + Instagram icons (avoid external icon deps). */
export function TikTokGlyph({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V7.83a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-1.26z" />
    </svg>
  );
}

export function InstagramGlyph({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export default function SocialLinks({ size = "md", className = "" }) {
  const dims = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="social-links">
      <a
        href={SOCIAL_LINKS.instagram}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className={`${dims} rounded-full border border-zinc-800 hover:border-purple-500/50 bg-zinc-950/50 hover:bg-purple-500/10 text-zinc-300 hover:text-purple-200 flex items-center justify-center transition-all`}
        data-testid="social-instagram"
      >
        <InstagramGlyph className={icon} />
      </a>
      <a
        href={SOCIAL_LINKS.tiktok}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="TikTok"
        className={`${dims} rounded-full border border-zinc-800 hover:border-purple-500/50 bg-zinc-950/50 hover:bg-purple-500/10 text-zinc-300 hover:text-purple-200 flex items-center justify-center transition-all`}
        data-testid="social-tiktok"
      >
        <TikTokGlyph className={icon} />
      </a>
    </div>
  );
}

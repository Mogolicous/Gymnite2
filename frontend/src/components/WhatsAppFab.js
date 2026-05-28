import React from "react";
import { buildWhatsAppLink, WHATSAPP_DEFAULT_MESSAGE } from "@/lib/contact";
import { useLocation } from "react-router-dom";

/* Inline SVG of the WhatsApp glyph (avoids extra icon dependency). */
function WhatsAppGlyph({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 01-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 01-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.812 2.722.812.96 0 2.95-.71 2.95-1.84 0-.143-.43-1.66-.93-1.94zM16.32 26.025c-1.96 0-3.864-.526-5.534-1.527l-.395-.236-4.066 1.063 1.084-3.967-.258-.41a10.59 10.59 0 01-1.62-5.62c0-5.847 4.768-10.6 10.62-10.6 2.83 0 5.494 1.105 7.495 3.105a10.523 10.523 0 013.115 7.504c-.013 5.846-4.78 10.61-10.62 10.61zm9.038-19.65a12.8 12.8 0 00-9.038-3.74C9.262 2.635 3.51 8.38 3.51 15.452c0 2.265.594 4.477 1.724 6.42L3.4 28.5l6.788-1.78a12.84 12.84 0 006.166 1.566h.006c7.06 0 12.81-5.745 12.81-12.81 0-3.42-1.4-6.687-3.81-9.1z" />
    </svg>
  );
}

export default function WhatsAppFab() {
  const location = useLocation();
  const href = buildWhatsAppLink(WHATSAPP_DEFAULT_MESSAGE);

  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      data-testid="whatsapp-fab"
      className="fixed right-5 bottom-20 sm:bottom-24 z-[60] inline-flex items-center gap-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white pl-3 pr-4 py-3 shadow-[0_0_30px_rgba(168,85,247,0.55)] hover:shadow-[0_0_45px_rgba(168,85,247,0.8)] transition-all duration-300 hover:-translate-y-0.5"
    >
      <span className="h-7 w-7 rounded-full bg-white/15 flex items-center justify-center">
        <WhatsAppGlyph className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium hidden sm:inline">WhatsApp</span>
    </a>
  );
}

export { WhatsAppGlyph };

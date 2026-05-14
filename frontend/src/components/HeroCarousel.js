import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SLIDES = [
  "https://images.unsplash.com/photo-1672344048213-76b6e77304bd?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000",
  "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000",
  "https://images.unsplash.com/photo-1674834727206-4bc272bfd8da?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000",
  "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000",
];

export default function HeroCarousel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="hero-carousel">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img
            src={SLIDES[idx]}
            alt="GymNite ambiente"
            className="w-full h-full object-cover"
            draggable="false"
          />
        </motion.div>
      </AnimatePresence>

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-[#050505]/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_#050505_85%)]" />

      {/* Progress dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20" data-testid="carousel-dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === idx ? "w-10 bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.8)]" : "w-4 bg-white/20 hover:bg-white/40"
            }`}
            aria-label={`Slide ${i + 1}`}
            data-testid={`carousel-dot-${i}`}
          />
        ))}
      </div>
    </div>
  );
}

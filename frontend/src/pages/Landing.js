import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Flame, Moon, Sparkles, Zap, ShieldCheck, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroCarousel from "@/components/HeroCarousel";

const BENEFITS = [
  {
    icon: Moon,
    title: "Entrena de Noche",
    desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Acceso ilimitado en horario nocturno con ambiente exclusivo.",
  },
  {
    icon: Flame,
    title: "Equipo Premium",
    desc: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Máquinas de última generación.",
  },
  {
    icon: Zap,
    title: "Energía Constante",
    desc: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.",
  },
  {
    icon: ShieldCheck,
    title: "Seguro 24/7",
    desc: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  },
  {
    icon: Heart,
    title: "Asesoría Personal",
    desc: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
  {
    icon: Sparkles,
    title: "Ambiente Único",
    desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Iluminación tenue y música seleccionada.",
  },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden" data-testid="landing-page">
      <Navbar />

      {/* HERO */}
      <section className="relative min-h-[100vh] flex items-center" data-testid="hero-section">
        <HeroCarousel />
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full pt-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <span
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-purple-300/90 border border-purple-500/30 bg-purple-500/5 rounded-full px-3 py-1.5 mb-7"
              data-testid="hero-eyebrow"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.9)]" />
              Gimnasio Nocturno Premium
            </span>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              Entrena cuando la
              <br />
              <span className="text-purple-400 gn-glow-text">ciudad duerme</span>.
            </h1>
            <p className="mt-7 text-lg text-zinc-300/90 max-w-xl leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Un
              espacio diseñado para quienes prefieren la noche.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                className="gn-btn-primary inline-flex items-center gap-2 text-base"
                data-testid="hero-cta-register"
              >
                Registrarme <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#beneficios"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-700/70 hover:border-purple-500/50 px-7 py-3 text-sm text-zinc-300 hover:text-white transition-all"
                data-testid="hero-cta-benefits"
              >
                Ver beneficios
              </a>
            </div>

            <div className="mt-14 flex gap-10 text-sm">
              <div data-testid="hero-stat-1">
                <div className="text-3xl font-bold text-white">+500</div>
                <div className="text-zinc-500">Miembros activos</div>
              </div>
              <div className="border-l border-zinc-800" />
              <div data-testid="hero-stat-2">
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-zinc-500">Acceso continuo</div>
              </div>
              <div className="border-l border-zinc-800" />
              <div data-testid="hero-stat-3">
                <div className="text-3xl font-bold text-white">98%</div>
                <div className="text-zinc-500">Satisfacción</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* BENEFITS */}
      <section
        id="beneficios"
        className="relative py-28 px-6 border-t border-white/5"
        data-testid="benefits-section"
      >
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-400/80 mb-4">
              Beneficios
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Todo lo que necesitas,
              <br />
              <span className="text-zinc-500">nada que no.</span>
            </h2>
            <p className="mt-6 text-zinc-400 leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim
              ad minim veniam, quis nostrud exercitation ullamco laboris.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, delay: i * 0.07 }}
                  className="group relative gn-card p-8 hover:border-purple-500/40 transition-all duration-500 hover:-translate-y-1"
                  data-testid={`benefit-card-${i}`}
                >
                  <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:bg-purple-500/15 group-hover:shadow-[0_0_25px_rgba(168,85,247,0.35)] transition-all">
                    <Icon className="h-5 w-5 text-purple-300" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{b.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{b.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section
        id="sobre-nosotros"
        className="relative py-28 px-6 border-t border-white/5"
        data-testid="about-section"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-5"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-400/80 mb-4">
              Sobre Nosotros
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
              Una comunidad
              <br />
              <span className="text-purple-400">nocturna</span>.
            </h2>
            <p className="mt-7 text-zinc-400 leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco.
            </p>
            <p className="mt-5 text-zinc-400 leading-relaxed">
              Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
              cupidatat non proident.
            </p>
            <div className="mt-10 flex gap-6">
              <div data-testid="about-stat-1">
                <div className="text-2xl font-bold">5+ años</div>
                <div className="text-zinc-500 text-sm">de experiencia</div>
              </div>
              <div data-testid="about-stat-2">
                <div className="text-2xl font-bold">3 sedes</div>
                <div className="text-zinc-500 text-sm">en la ciudad</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 relative"
          >
            <div className="relative rounded-3xl overflow-hidden border border-zinc-800">
              <img
                src="https://images.unsplash.com/photo-1534258936925-c58bed479fcb?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"
                alt="GymNite team"
                className="w-full h-[460px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden md:block gn-card p-6 max-w-[260px] shadow-[0_0_40px_rgba(168,85,247,0.18)]">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Nuestra misión
                </span>
              </div>
              <p className="text-sm text-zinc-300">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* REGISTRARME CTA */}
      <section
        id="registrarme"
        className="relative py-28 px-6 border-t border-white/5"
        data-testid="cta-section"
      >
        <div className="max-w-5xl mx-auto relative">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative gn-card p-12 sm:p-16 text-center overflow-hidden"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-400/80 mb-5">
              Únete hoy
            </p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Tu mejor versión
              <br />
              empieza <span className="text-purple-400 gn-glow-text">esta noche</span>.
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <Link
              to="/register"
              className="gn-btn-primary inline-flex items-center gap-2 text-base"
              data-testid="cta-register-btn"
            >
              Registrarme ahora <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-6 text-xs text-zinc-500">
              Sin permanencia · Cancela cuando quieras
            </p>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10 px-6" data-testid="footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <span className="text-xs font-bold">G</span>
            </div>
            <span className="text-sm text-zinc-500">
              © {new Date().getFullYear()} GymNite. Todos los derechos reservados.
            </span>
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <span>Lorem ipsum</span>
            <span>Política</span>
            <span>Contacto</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

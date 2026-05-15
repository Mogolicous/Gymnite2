import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Dumbbell, Layout, Palette, Users, Activity, Brain, Clock, Sunrise, Moon, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroCarousel from "@/components/HeroCarousel";

const BENEFITS = [
  {
    icon: Dumbbell,
    title: "Entrenamiento Híbrido",
    desc: "Acceso total a clases de Kickboxing, Boxeo y Muay Thai, combinando técnica de combate con resistencia física real.",
  },
  {
    icon: Layout,
    title: "Espacios de Alto Nivel",
    desc: "Instalaciones amplias y despejadas que te permiten entrenar con total libertad de movimiento y seguridad.",
  },
  {
    icon: Palette,
    title: "Estética Motivadora",
    desc: "Un ambiente moderno en tonos neón morados y negros diseñado para maximizar tu enfoque y energía en cada sesión.",
  },
  {
    icon: Users,
    title: "Comunidad Activa",
    desc: "Participación en eventos y careos exclusivos, formando parte de un equipo que comparte tu pasión por los deportes de contacto.",
  },
  {
    icon: Activity,
    title: "Resultados Reales",
    desc: "Fusión perfecta entre la quema calórica del combate y la tonificación del gimnasio para una recomposición corporal acelerada.",
  },
  {
    icon: Brain,
    title: "Poder Mental",
    desc: "Descarga total de estrés y desarrollo de una disciplina inquebrantable que te sirve tanto dentro como fuera del ring.",
  },
];

const SCHEDULE = [
  {
    title: "Gimnasio",
    icon: Dumbbell,
    slots: [
      { icon: Sunrise, label: "Mañana", time: "5:00 AM – 1:00 PM" },
      { icon: Moon, label: "Tarde", time: "4:00 PM – 10:30 PM" },
    ],
  },
  {
    title: "Box",
    icon: Activity,
    slots: [
      { icon: Sunrise, label: "Mañana", time: "9:00 AM – 12:00 PM" },
      { icon: Moon, label: "Tarde", time: "5:00 PM – 9:00 PM" },
    ],
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
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              Conquista ese
              <br />
              <span className="text-purple-400 gn-glow-text">ser legendario</span>
              <br />
              que llevas dentro.
            </h1>
            <p className="mt-7 text-lg text-zinc-300/90 max-w-xl leading-relaxed">
              Entrenamiento híbrido, comunidad real y un espacio diseñado para
              que cada sesión te acerque a tu mejor versión.
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

            <div className="mt-14 flex flex-wrap gap-x-10 gap-y-6 text-sm">
              <div data-testid="hero-stat-1">
                <div className="text-3xl font-bold text-white">+100</div>
                <div className="text-zinc-500">Usuarios activos</div>
              </div>
              <div className="hidden sm:block border-l border-zinc-800" />
              <div data-testid="hero-stat-2">
                <div className="text-3xl font-bold text-white">5AM – 22:30</div>
                <div className="text-zinc-500">Horarios user-friendly</div>
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
              Combate, fuerza
              <br />
              <span className="text-zinc-500">y disciplina.</span>
            </h2>
            <p className="mt-6 text-zinc-400 leading-relaxed">
              Una experiencia diseñada para forjar cuerpo, mente y comunidad —
              dentro y fuera del ring.
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

      {/* HORARIOS */}
      <section
        id="horarios"
        className="relative py-28 px-6 border-t border-white/5"
        data-testid="horarios-section"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-purple-400/80 mb-4">
                Horarios
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
                Cuando tú
                <br />
                <span className="text-purple-400">puedas</span>.
              </h2>
              <p className="mt-6 text-zinc-400 leading-relaxed">
                Pensados para que entrenes sin pretextos: mañana, tarde y
                sábados completos.
              </p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="mt-8 inline-flex items-center gap-3 gn-card px-5 py-4"
                data-testid="schedule-saturday"
              >
                <Calendar className="h-4 w-4 text-purple-300" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Sábados
                  </div>
                  <div className="text-sm text-zinc-100 font-medium">
                    7:00 AM – 1:00 PM
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {SCHEDULE.map((s, i) => {
                const TitleIcon = s.icon;
                return (
                  <motion.div
                    key={s.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 * i }}
                    className="gn-card p-7 hover:border-purple-500/40 transition-all"
                    data-testid={`schedule-card-${s.title.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <TitleIcon className="h-4 w-4 text-purple-300" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-xl font-semibold">{s.title}</h3>
                    </div>
                    <ul className="space-y-4">
                      {s.slots.map((slot) => {
                        const SlotIcon = slot.icon;
                        return (
                          <li key={slot.label} className="flex items-center justify-between gap-4 border-b border-zinc-800/60 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3 text-zinc-300">
                              <SlotIcon className="h-4 w-4 text-purple-300/80" />
                              <span className="text-sm">{slot.label}</span>
                            </div>
                            <span className="text-sm font-medium text-zinc-100 tabular-nums">
                              {slot.time}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </motion.div>
                );
              })}
            </div>
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

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Dumbbell, Layout, Palette, Users, Activity, Brain, Sunrise, Moon, MessageCircle, MapPin, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroCarousel from "@/components/HeroCarousel";
import SocialLinks from "@/components/SocialLinks";
import { buildWhatsAppLink, LOCATION } from "@/lib/contact";

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
                <div className="text-3xl font-bold text-white">Horarios</div>
                <div className="text-zinc-500">User-friendly</div>
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
                Pensados para que entrenes sin pretextos. Reserva tu horario
                directamente por WhatsApp.
              </p>
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
                    <ul className="space-y-3 mb-5">
                      {s.slots.map((slot) => {
                        const SlotIcon = slot.icon;
                        return (
                          <li
                            key={slot.label}
                            className="flex items-center justify-between gap-4 border-b border-zinc-800/60 pb-3 last:border-0 last:pb-0"
                          >
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
                    <a
                      href={buildWhatsAppLink(
                        `Hola, quiero reservar un horario de ${s.title}. ¿Me podrías dar más información?`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 hover:border-purple-400/60 bg-purple-500/10 hover:bg-purple-500/15 px-4 py-2 text-sm text-purple-200 hover:text-white transition-all"
                      data-testid={`reservar-${s.title.toLowerCase()}-btn`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Reservar por WhatsApp
                    </a>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* UBICACION */}
      <section
        id="ubicacion"
        className="relative py-28 px-6 border-t border-white/5"
        data-testid="ubicacion-section"
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
              Ubicación
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
              Ven a
              <br />
              <span className="text-purple-400">entrenar</span>.
            </h2>
            <p className="mt-6 text-zinc-400 leading-relaxed">
              Encuéntranos fácilmente. Estamos abiertos en los horarios
              indicados arriba para recibirte y darte el tour de las
              instalaciones.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={LOCATION.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="gn-btn-primary inline-flex items-center justify-center gap-2 text-sm"
                data-testid="ubicacion-maps-btn"
              >
                <MapPin className="h-4 w-4" />
                Ver en Google Maps
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
              <a
                href={buildWhatsAppLink(
                  "Hola, ¿me podrías indicar cómo llegar al gym?"
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-800 hover:border-purple-500/50 px-6 py-3 text-sm text-zinc-300 hover:text-white transition-all"
                data-testid="ubicacion-whatsapp-btn"
              >
                <MessageCircle className="h-4 w-4" />
                ¿Cómo llegar?
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7"
          >
            <a
              href={LOCATION.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative rounded-3xl overflow-hidden border border-zinc-800 hover:border-purple-500/40 transition-all group shadow-[0_0_40px_rgba(168,85,247,0.12)]"
              data-testid="ubicacion-map-card"
            >
              <iframe
                title="Ubicación GymNite"
                src={`https://www.google.com/maps?q=${LOCATION.lat},${LOCATION.lng}&hl=es&z=17&output=embed`}
                className="w-full h-[400px] grayscale-[40%] contrast-110 brightness-75 group-hover:grayscale-0 group-hover:brightness-90 transition-all"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-purple-500/10 rounded-3xl" />
              <div className="pointer-events-none absolute bottom-0 inset-x-0 px-6 py-4 bg-gradient-to-t from-[#050505] to-transparent flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-purple-300/80">
                    {LOCATION.name}
                  </div>
                  <div className="text-sm text-zinc-100 font-medium">
                    Click para abrir en Google Maps
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-purple-300" />
              </div>
            </a>
          </motion.div>
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
              Un equipo que
              <br />
              <span className="text-purple-400">nunca se rinde</span>.
            </h2>
            <p className="mt-7 text-zinc-400 leading-relaxed">
              <span className="text-zinc-100 font-semibold">GYMNITE</span> es
              el punto de encuentro para una comunidad que entiende el valor
              del esfuerzo. Fundado con la visión de elevar el estándar de los
              centros de entrenamiento, nos especializamos en integrar la
              disciplina de las artes marciales con un estilo de vida activo y
              saludable.
            </p>
            <p className="mt-5 text-zinc-400 leading-relaxed">
              Nos enorgullece ser un espacio donde la técnica del{" "}
              <span className="text-zinc-100">Muay Thai</span> y la estrategia
              del <span className="text-zinc-100">MMA</span> se viven con
              intensidad. En GYMNITE, cada entrenamiento cuenta y cada miembro
              es parte de un equipo que nunca se rinde.
            </p>
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
                Elevar el estándar del entrenamiento integrando disciplina
                marcial con un estilo de vida activo.
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
              empieza <span className="text-purple-400 gn-glow-text">aquí</span>.
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
              Combate, fuerza y una comunidad que te empuja. Da el primer paso
              hoy y entrena con disciplina, sin pretextos.
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
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <span className="text-xs font-bold">G</span>
            </div>
            <span className="text-sm text-zinc-500">
              © {new Date().getFullYear()} GymNite. Todos los derechos reservados.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <SocialLinks size="sm" />
            <a
              href={buildWhatsAppLink(
                "Hola, me gustaría contactarlos. ¿Me podrían dar más información?"
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 hover:border-purple-400/60 bg-purple-500/10 hover:bg-purple-500/15 px-4 py-2 text-sm text-purple-200 hover:text-white transition-all"
              data-testid="footer-contacto"
            >
              <MessageCircle className="h-4 w-4" />
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

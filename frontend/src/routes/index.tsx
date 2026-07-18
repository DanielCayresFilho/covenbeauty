import { createFileRoute } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import mysticBg from "@/assets/mystic-bg.jpg";

const MARCA = "/marca.png";
const BUTTERFLY = "/logo-sem-fundo.png";
const JULIANA = "/juliana.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:image", content: mysticBg },
      { name: "twitter:image", content: mysticBg },
    ],
  }),
  component: Landing,
});

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      variants={fadeUp}
      className="mb-10 text-center"
    >
      <p className="text-[0.65rem] uppercase tracking-[0.45em] text-blood mb-3 font-sans">
        {eyebrow}
      </p>
      <h2 className="text-4xl sm:text-5xl text-parchment leading-none">{title}</h2>
      <div className="divider-ornament mt-5 mx-auto max-w-[180px]">
        <span className="text-lg">✦</span>
      </div>
    </motion.div>
  );
}

function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  const services = [
    {
      title: "Colorimetria",
      desc: "Cores autorais — do vermelho sangue ao preto obsidiana. Técnica precisa, resultado ritual.",
      symbol: "☾",
    },
    {
      title: "Cabelos Cacheados",
      desc: "Cortes, hidratação e finalização especializada para curvaturas de todos os tipos.",
      symbol: "✧",
    },
    {
      title: "Estética Alternativa",
      desc: "Um espaço seguro para quem foge do óbvio. Beleza que respeita sua identidade.",
      symbol: "☿",
    },
    {
      title: "Cortes Autorais",
      desc: "Cortes que carregam intenção. Cada mecha, uma escolha simbólica.",
      symbol: "✦",
    },
  ];

  return (
    <main className="relative overflow-x-hidden text-parchment">
      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3">
          <a href="#top" className="flex items-center gap-2">
            <img src={BUTTERFLY} alt="" className="h-7 w-auto opacity-90" />
            <span className="font-display text-xl tracking-wide">Coven</span>
          </a>
          <a
            href="https://wa.me/5514996679741"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs uppercase tracking-[0.3em] font-sans border border-blood/60 text-parchment px-3 py-2 hover:bg-blood hover:text-parchment transition-colors"
          >
            Agendar
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section id="top" ref={heroRef} className="relative min-h-screen grain flex items-center justify-center overflow-hidden">
        <motion.div
          style={{ y: bgY }}
          className="absolute inset-0 -z-10"
        >
          <img
            src={mysticBg}
            alt=""
            className="w-full h-[130%] object-cover opacity-60"
            width={1280}
            height={1600}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" />
        </motion.div>

        <img
          src={BUTTERFLY}
          alt=""
          aria-hidden
          className="absolute top-[12%] right-[-12%] w-[95%] max-w-[560px] opacity-[0.05] float-slow -z-10"
        />

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 text-center px-6 py-24">
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, letterSpacing: "0.5em" }}
            transition={{ duration: 1.4, delay: 0.3 }}
            className="text-[0.65rem] uppercase text-blood mb-6 font-sans flicker"
          >
            Bauru · Est. Ritual
          </motion.p>

          <motion.img
            src={MARCA}
            alt="Coven Beauty"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="mx-auto w-full max-w-[360px] sm:max-w-[440px] drop-shadow-[0_0_40px_rgba(0,0,0,0.8)]"
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="mt-8 max-w-md mx-auto text-lg sm:text-xl italic text-parchment/80 leading-snug"
          >
            Um refúgio para a beleza que habita a sombra.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
            <a
              href="https://wa.me/5514996679741"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-blood text-parchment px-8 py-3 font-sans text-xs uppercase tracking-[0.35em] hover:bg-accent transition-colors border border-blood"
            >
              Marcar Ritual
            </a>
            <a
              href="#juliana"
              className="w-full sm:w-auto border border-parchment/30 text-parchment px-8 py-3 font-sans text-xs uppercase tracking-[0.35em] hover:border-blood hover:text-blood transition-colors"
            >
              Conheça a Coven
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-blood text-xs tracking-[0.4em]"
        >
          ▼
        </motion.div>
      </section>

      {/* JULIANA */}
      <section id="juliana" className="relative py-24 px-5">
        <div className="max-w-5xl mx-auto">
          <SectionTitle eyebrow="A Sacerdotisa" title="Juliana" />

          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 1 }}
              className="relative"
            >
              <div className="relative aspect-[4/5] max-w-sm mx-auto overflow-hidden border border-blood/30">
                <img
                  src={JULIANA}
                  alt="Juliana, fundadora da Coven Beauty"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>
              <div className="absolute -top-4 -left-4 text-blood/40 text-6xl font-display">☾</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="space-y-5 text-parchment/85"
            >
              <p className="text-lg leading-relaxed">
                Há mais de <span className="text-blood font-medium">10 anos</span> transformando cabelos em altares. Juliana é formada em <span className="italic">Estética pela USC</span> e dedicou sua carreira a uma linguagem própria: técnica precisa aliada a uma sensibilidade quase ritualística.
              </p>
              <p className="text-lg leading-relaxed">
                Especialista em <span className="text-blood">colorimetria</span> e <span className="text-blood">cabelos cacheados</span>, ela criou a Coven como um santuário para quem enxerga na estética uma forma de expressão — e não uma norma.
              </p>
              <p className="italic text-parchment/70 border-l-2 border-blood pl-4">
                "Aqui você não vem para se encaixar. Você vem para se revelar."
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="relative py-24 px-5 bg-background/60">
        <div className="max-w-5xl mx-auto">
          <SectionTitle eyebrow="Grimório" title="Serviços" />

          <div className="grid sm:grid-cols-2 gap-5">
            {services.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, delay: i * 0.1 }}
                className="group relative border border-border p-7 bg-card/50 backdrop-blur-sm hover:border-blood transition-colors"
              >
                <div className="absolute top-4 right-5 text-2xl text-blood/50 group-hover:text-blood transition-colors">
                  {s.symbol}
                </div>
                <h3 className="text-2xl mb-2 text-parchment">{s.title}</h3>
                <p className="text-parchment/70 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* CONTACT */}
      <section id="contact" className="relative py-24 px-5 bg-background/60">
        <div className="max-w-3xl mx-auto text-center">
          <SectionTitle eyebrow="Invocação" title="Encontre-nos" />

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="space-y-8"
          >
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.4em] text-blood mb-2 font-sans">Templo</p>
              <p className="text-lg text-parchment/90">
                Alameda Cartago, 10-37
                <br />
                Jardim Santa Edwirges — Bauru, SP
                <br />
                <span className="text-parchment/60">17067-590</span>
              </p>
            </div>

            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.4em] text-blood mb-2 font-sans">Chamado</p>
              <a
                href="tel:+5514996679741"
                className="text-xl text-parchment hover:text-blood transition-colors"
              >
                +55 14 99667-9741
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <a
                href="https://wa.me/5514996679741"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blood text-parchment px-8 py-3 font-sans text-xs uppercase tracking-[0.35em] hover:bg-accent transition-colors"
              >
                WhatsApp
              </a>
              <a
                href="https://www.instagram.com/_covenbeauty/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-parchment/30 text-parchment px-8 py-3 font-sans text-xs uppercase tracking-[0.35em] hover:border-blood hover:text-blood transition-colors inline-flex items-center gap-2 justify-center"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
                </svg>
                @_covenbeauty
              </a>
            </div>

            <div className="pt-8">
              <iframe
                title="Localização Coven Beauty"
                src="https://www.google.com/maps?q=Alameda+Cartago+10-37+Jardim+Santa+Edwirges+Bauru+SP&output=embed"
                className="w-full h-64 border border-border grayscale contrast-125 opacity-80"
                loading="lazy"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative border-t border-border py-10 px-5 text-center">
        <img src={BUTTERFLY} alt="" className="mx-auto mb-4 h-16 w-auto opacity-50" />
        <p className="font-display text-2xl text-parchment/80">Coven Beauty</p>
        <p className="mt-2 text-xs uppercase tracking-[0.4em] text-parchment/40 font-sans">
          Bauru · SP · MMXXV
        </p>
      </footer>
    </main>
  );
}

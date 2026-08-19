import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Camera, Download, Layers, Palette, Shirt, WandSparkles } from 'lucide-react';
import { useLiveClock } from '../../shared/hooks/useLiveClock';
import { DostPtriLogo } from '../../shared/ui/DostPtriLogo';
import { TouchPulseCue } from '../../shared/ui/TouchPulseCue';

interface WelcomeScreenProps {
  onStart: () => void;
}

const ART = `${import.meta.env.BASE_URL}brand/home-art-clean.png`;

const HOME_STEPS = [
  { id: 'start', title: 'Start Analysis', Icon: Camera },
  { id: 'skin', title: 'Skin Tone Detection', Icon: Palette },
  { id: 'color', title: 'AI Color Recommendation', Icon: WandSparkles },
  { id: 'textiles', title: 'Explore Textiles', Icon: Layers },
  { id: 'style', title: 'Style Your Look', Icon: Shirt },
  { id: 'result', title: 'View Your Result', Icon: Download },
] as const;

function FaceGlow() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: 58 + ((i * 17) % 36),
        top: 10 + ((i * 13) % 46),
        size: 2 + (i % 4),
        delay: (i % 9) * 0.22,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0">
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 64% 82% at 80% 40%, rgba(4,16,40,0.72) 0%, rgba(11,31,58,0.42) 44%, transparent 78%)',
          mixBlendMode: 'multiply',
        }}
        animate={{ opacity: [0.85, 1, 0.9, 0.85] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[4%] top-[8%] h-[52%] w-[48%]"
        style={{
          background:
            'radial-gradient(ellipse at 58% 40%, rgba(37,99,168,0.28) 0%, rgba(56,189,248,0.1) 38%, transparent 70%)',
          mixBlendMode: 'screen',
        }}
        animate={{ x: [0, 8, -4, 0], y: [0, -6, 3, 0], opacity: [0.55, 0.9, 0.65, 0.55] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-4%] top-[6%] h-[58%] w-[52%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse at 56% 38%, rgba(56, 189, 248, 0.22) 0%, transparent 68%)',
          filter: 'blur(16px)',
        }}
        animate={{ opacity: [0.35, 0.75, 0.4, 0.35], scale: [1, 1.08, 1.02, 1] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {sparks.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-sky-100"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            boxShadow: '0 0 12px 3px rgba(125,211,252,0.85), 0 0 22px 6px rgba(37,99,168,0.45)',
          }}
          animate={{
            opacity: [0.15, 1, 0.15],
            scale: [0.5, 1.35, 0.5],
            x: [0, i % 2 === 0 ? 6 : -5, 0],
            y: [0, i % 3 === 0 ? -8 : 5, 0],
          }}
          transition={{ duration: 1.6 + (i % 5) * 0.22, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const { time, day } = useLiveClock();

  return (
    <section className="relative flex h-full min-h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#f7fbff_0%,#e8f2fc_55%,#dceaf8_100%)] px-5 pb-5 pt-4">
      <motion.div
        className="pointer-events-none absolute inset-0 origin-[78%_42%]"
        animate={{ y: [0, -5, 2, 0], x: [0, 2, -1.5, 0], scale: [1, 1.012, 1.005, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={ART}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[74%_36%] contrast-[1.18] saturate-[1.2] drop-shadow-[0_0_28px_rgba(11,31,58,0.35)]"
          style={{
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 34%, #000 58%, #000 100%)',
            maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 34%, #000 58%, #000 100%)',
          }}
          draggable={false}
        />
        <FaceGlow />
      </motion.div>

      <div className="relative z-[3] flex min-h-0 flex-1 flex-col">
        <header className="shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <DostPtriLogo className="h-[52px] w-[52px] shrink-0" />
              <div className="min-w-0 text-[#0B1F3A]">
                <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#0B1F3A]/70">
                  Department of Science and Technology
                </p>
                <h1 className="mt-0.5 text-[14px] font-extrabold uppercase leading-[1.15] tracking-wide">
                  Philippine Textile Research Institute
                </h1>
                <p className="mt-1 text-[11px] italic text-[#1B4F8A]/80">Innovating Textiles. Empowering Filipinos.</p>
              </div>
            </div>
            <div className="shrink-0 pt-0.5 text-right text-[#0B1F3A]">
              <div className="text-[13px] font-extrabold tabular-nums leading-none">{time}</div>
              <div className="mt-0.5 text-[9px] font-semibold text-[#0B1F3A]/65">{day}</div>
            </div>
          </div>
        </header>

        <motion.div className="mt-11 max-w-[58%]" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-[1.72rem] font-extrabold uppercase leading-[1.05] tracking-tight text-[#0B1F3A]">
            AI Color &amp;
            <br />
            Textile
            <br />
            Experience
          </h2>
          <p className="mt-3 text-[0.95rem] font-medium leading-snug text-[#3A5A80]">
            Discover the colors and textiles that truly suit you — powered by artificial intelligence.
          </p>
        </motion.div>

        <div className="mt-9 grid w-[17.25rem] grid-cols-3 gap-x-3 gap-y-3.5 bg-transparent">
          {HOME_STEPS.map((item, index) => (
            <motion.div
              key={item.id}
              className="flex w-[5.1rem] flex-col items-center gap-1.5 bg-transparent text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + index * 0.05 }}
            >
              <span className="grid h-[3.85rem] w-[3.85rem] place-items-center rounded-full border border-[#C9A227]/70 bg-[#0B1F3A] text-white shadow-[0_8px_16px_rgba(11,31,58,0.22)]">
                <item.Icon className="h-[26px] w-[26px]" strokeWidth={1.7} />
              </span>
              <strong className="text-[7.5px] font-extrabold uppercase leading-[1.15] tracking-wide text-[#0B1F3A]">
                {item.title}
              </strong>
            </motion.div>
          ))}
        </div>

        <motion.button
          type="button"
          onClick={onStart}
          className="absolute bottom-6 left-1/2 z-[4] flex h-[56px] w-[82%] max-w-[400px] -translate-x-1/2 items-center justify-between overflow-visible rounded-full border-[1.5px] border-[#C9A227] bg-[#0B1F3A] pl-7 pr-3 text-[1rem] font-extrabold tracking-[0.08em] text-white shadow-[0_12px_28px_rgba(11,31,58,0.35)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
        >
          <span>TOUCH TO START</span>
          <TouchPulseCue className="-mr-0.5" />
        </motion.button>
      </div>
    </section>
  );
}

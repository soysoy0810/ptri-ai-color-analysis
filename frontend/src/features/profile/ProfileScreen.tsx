import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, ChevronDown, Mail, ShieldCheck, Target, UserRound, Users } from 'lucide-react';
import { GENDERS, PURPOSES } from '../../data/catalog';
import type { Profile } from '../../shared/lib/types';

interface ProfileScreenProps {
  profile: Profile;
  onChange: (profile: Partial<Profile>) => void;
  onContinue: () => void;
}

export function ProfileScreen({ profile, onChange, onContinue }: ProfileScreenProps) {
  const ready = profile.ageRange.trim() !== '' && profile.gender !== '';

  return (
    <section className="screen">
      <p className="screen-sub">
        Please provide your details to start your AI Color &amp; Textile Analysis.
      </p>

      <motion.div
        className="rounded-3xl border border-line bg-white p-5 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <label htmlFor="profile-name" className="mb-2 flex items-center gap-2 text-[12px] font-extrabold text-navy">
          <UserRound className="h-4 w-4 text-muted" />
          Full Name
        </label>
        <input
          id="profile-name"
          type="text"
          className="mb-4 min-h-touch w-full rounded-2xl border border-line bg-white px-4 text-base text-navy outline-none focus:border-navy"
          placeholder="Maria Cruz"
          value={profile.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          autoComplete="off"
        />

        <label htmlFor="profile-age" className="mb-2 flex items-center gap-2 text-[12px] font-extrabold text-navy">
          <CalendarDays className="h-4 w-4 text-muted" />
          Age
        </label>
        <input
          id="profile-age"
          type="number"
          min={16}
          max={99}
          inputMode="numeric"
          className="mb-4 min-h-touch w-full rounded-2xl border border-line bg-white px-4 text-base text-navy outline-none focus:border-navy"
          placeholder="28"
          value={profile.ageRange}
          onChange={(e) => onChange({ ageRange: e.target.value })}
        />

        <div className="mb-2 flex items-center gap-2 text-[12px] font-extrabold text-navy">
          <Users className="h-4 w-4 text-muted" />
          Gender
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {GENDERS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`min-h-touch rounded-full border-2 text-sm font-bold ${
                profile.gender === g.id ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy'
              }`}
              onClick={() => onChange({ gender: g.id })}
            >
              {g.label}
            </button>
          ))}
        </div>

        <label htmlFor="profile-email" className="mb-2 flex items-center gap-2 text-[12px] font-extrabold text-navy">
          <Mail className="h-4 w-4 text-muted" />
          Email Address
        </label>
        <input
          id="profile-email"
          type="email"
          className="mb-4 min-h-touch w-full rounded-2xl border border-line bg-white px-4 text-base text-navy outline-none focus:border-navy"
          placeholder="maria.cruz@email.com"
          value={profile.email}
          onChange={(e) => onChange({ email: e.target.value })}
          autoComplete="email"
        />

        <label htmlFor="profile-purpose" className="mb-2 flex items-center gap-2 text-[12px] font-extrabold text-navy">
          <Target className="h-4 w-4 text-muted" />
          Purpose
        </label>
        <div className="relative">
          <select
            id="profile-purpose"
            className="min-h-touch w-full appearance-none rounded-2xl border border-line bg-white px-4 pr-10 text-base text-navy outline-none focus:border-navy"
            value={profile.purpose}
            onChange={(e) => onChange({ purpose: e.target.value })}
          >
            {PURPOSES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
      </motion.div>

      <motion.button
        type="button"
        className="btn btn-primary mt-5 w-full"
        onClick={onContinue}
        disabled={!ready}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.97 }}
      >
        CONTINUE
        <ArrowRight className="h-5 w-5" />
      </motion.button>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-muted">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-navy" />
        Your data is secure and will only be used for analysis.
      </p>
    </section>
  );
}

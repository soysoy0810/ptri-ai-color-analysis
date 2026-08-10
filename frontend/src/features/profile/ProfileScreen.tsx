import { motion } from 'framer-motion';
import { ArrowRight, UserRound } from 'lucide-react';
import { AGE_RANGES, GENDERS } from '../../data/catalog';
import type { Profile } from '../../shared/lib/types';

interface ProfileScreenProps {
  profile: Profile;
  onChange: (profile: Partial<Profile>) => void;
  onContinue: () => void;
}

export function ProfileScreen({ profile, onChange, onContinue }: ProfileScreenProps) {
  const ready = profile.ageRange !== '' && profile.gender !== '';

  return (
    <section className="screen">
      <h1 className="screen-title">Tell us about you.</h1>
      <p className="screen-sub">
        This helps us personalize your color and style recommendations.
      </p>

      {/* Name */}
      <motion.div
        className="rounded-2xl border border-line bg-white p-4 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <label
          htmlFor="profile-name"
          className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-muted"
        >
          <UserRound className="h-3.5 w-3.5" />
          Your Name <span className="font-semibold normal-case">(optional)</span>
        </label>
        <input
          id="profile-name"
          type="text"
          className="min-h-touch w-full rounded-2xl border border-line bg-white px-4 text-base text-navy outline-none focus:border-accent"
          placeholder="Enter your name"
          value={profile.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          autoComplete="off"
        />
      </motion.div>

      {/* Age range */}
      <motion.div
        className="mt-3 rounded-2xl border border-line bg-white p-4 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted">
          Age Range
        </div>
        <div className="grid grid-cols-3 gap-2">
          {AGE_RANGES.map((range) => (
            <motion.button
              key={range}
              type="button"
              className={`min-h-touch rounded-2xl border-2 px-2 text-sm font-bold transition ${
                profile.ageRange === range
                  ? 'border-accent bg-accent text-white'
                  : 'border-line bg-white text-navy'
              }`}
              onClick={() => onChange({ ageRange: range })}
              whileTap={{ scale: 0.95 }}
            >
              {range}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Gender */}
      <motion.div
        className="mt-3 rounded-2xl border border-line bg-white p-4 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted">
          Gender
        </div>
        <div className="grid grid-cols-3 gap-2">
          {GENDERS.map((g) => (
            <motion.button
              key={g.id}
              type="button"
              className={`min-h-touch rounded-2xl border-2 px-2 text-sm font-bold transition ${
                profile.gender === g.id
                  ? 'border-accent bg-accent text-white'
                  : 'border-line bg-white text-navy'
              }`}
              onClick={() => onChange({ gender: g.id })}
              whileTap={{ scale: 0.95 }}
            >
              {g.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.button
        type="button"
        className="btn btn-primary mt-5 w-full"
        onClick={onContinue}
        disabled={!ready}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        whileTap={{ scale: 0.97 }}
      >
        CONTINUE
        <ArrowRight className="h-5 w-5" />
      </motion.button>
      {!ready ? (
        <p className="mt-2 text-center text-xs font-semibold text-muted">
          Please choose your age range and gender to continue.
        </p>
      ) : null}
    </section>
  );
}

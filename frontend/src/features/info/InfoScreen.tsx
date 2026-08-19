import { AGE_RANGES, GENDERS } from '../../data/catalog';
import type { Profile } from '../../shared/lib/types';

interface InfoScreenProps {
  profile: Profile;
  onChange: (profile: Partial<Profile>) => void;
}

export function InfoScreen({ profile, onChange }: InfoScreenProps) {
  return (
    <section className="screen">
      <h1 className="screen-title">Personal Information</h1>
      <p className="screen-sub">
        Tell us a little about you. Email is optional for sending your results.
      </p>

      <div className="field">
        <label htmlFor="fullName">Full Name</label>
        <input
          id="fullName"
          value={profile.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          placeholder="Enter your name"
          autoComplete="name"
        />
      </div>

      <div className="field">
        <label>Age Range</label>
        <div className="grid grid-cols-3 gap-2">
          {AGE_RANGES.map((age) => (
            <button
              key={age}
              type="button"
              className={`choice ${profile.ageRange === age ? 'active' : ''}`}
              onClick={() => onChange({ ageRange: age })}
            >
              {age}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Gender</label>
        <div className="grid grid-cols-2 gap-2">
          {GENDERS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`choice ${profile.gender === g.id ? 'active' : ''}`}
              onClick={() => onChange({ gender: g.id })}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="email">Email (optional)</label>
        <input
          id="email"
          type="email"
          value={profile.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="name@email.com"
          autoComplete="email"
        />
      </div>
    </section>
  );
}

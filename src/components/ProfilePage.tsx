import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { clearProfile, getProfile, saveProfile } from '../services/profileStorage'
import { emptyProfile, type UserProfile, type WorkMode } from '../types/profile'
import './ProfilePage.css'

type ProfilePageProps = {
  onProfileChange: (profile: UserProfile | null) => void
}

type FieldProps = {
  label: string
  value: string | number | null
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'tel' | 'date' | 'url' | 'number'
  required?: boolean
  error?: string
  placeholder?: string
}

function Field({ label, value, onChange, type = 'text', required = false, error, placeholder }: FieldProps) {
  return (
    <label className="profile-field">
      <span>{label}{required ? <em aria-hidden="true">*</em> : null}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
      />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  )
}

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  function addValue() {
    const value = draft.trim()
    if (!value || values.some((item) => item.toLowerCase() === value.toLowerCase())) {
      return
    }

    onChange([...values, value])
    setDraft('')
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addValue()
    }
  }

  return (
    <label className="profile-field profile-field--wide">
      <span>{label}</span>
      <div className="tag-input">
        <div className="tag-list">
          {values.map((value) => (
            <span className="tag" key={value}>
              {value}
              <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Remove ${value}`}>
                <X size={12} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        <div className="tag-entry">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
          <button type="button" onClick={addValue} aria-label={`Add ${label}`}>
            <Plus size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </label>
  )
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="profile-section">
      <div className="profile-section__heading">
        <h2>{title}</h2>
      </div>
      <div className="profile-fields">{children}</div>
    </section>
  )
}

function createProfile(): UserProfile {
  return structuredClone(emptyProfile)
}

export function ProfilePage({ onProfileChange }: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile>(createProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      try {
        const savedProfile = await getProfile()
        if (mounted) {
          const nextProfile = savedProfile ?? createProfile()
          setProfile(nextProfile)
          onProfileChange(savedProfile)
        }
      } catch {
        if (mounted) {
          setLoadError('Unable to load your profile from local storage.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadProfile()
    return () => {
      mounted = false
    }
  }, [onProfileChange])

  function updateSection<Section extends keyof UserProfile>(section: Section, field: keyof UserProfile[Section], value: string | number | null | string[]) {
    setProfile((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }))
    setSaveMessage('')
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}
    const { firstName, lastName, email } = profile.personal

    if (!firstName?.trim()) nextErrors.firstName = 'First name is required.'
    if (!lastName?.trim()) nextErrors.lastName = 'Last name is required.'
    if (!email?.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (profile.education.cgpa !== null && (profile.education.cgpa < 0 || profile.education.cgpa > 10)) {
      nextErrors.cgpa = 'CGPA must be between 0 and 10.'
    }
    if (profile.education.graduationYear !== null && (profile.education.graduationYear < 1900 || profile.education.graduationYear > 2200)) {
      nextErrors.graduationYear = 'Enter a valid year.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveMessage('')
    if (!validate()) return

    setSaving(true)
    try {
      await saveProfile(profile)
      onProfileChange(profile)
      setSaveMessage('Profile saved locally.')
    } catch {
      setSaveMessage('Unable to save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    if (!window.confirm('Clear your Job Agent profile? This cannot be undone.')) return

    await clearProfile()
    const nextProfile = createProfile()
    setProfile(nextProfile)
    setErrors({})
    setSaveMessage('Profile cleared.')
    onProfileChange(null)
  }

  function numberValue(value: string): number | null {
    return value === '' ? null : Number(value)
  }

  function handleWorkModeChange(event: ChangeEvent<HTMLSelectElement>) {
    updateSection('jobPreferences', 'workMode', event.target.value === '' ? null : event.target.value as WorkMode)
  }

  if (loading) {
    return <div className="profile-loading">Loading your profile...</div>
  }

  return (
    <form className="profile-page" onSubmit={handleSubmit}>
      <div className="profile-page__intro">
        <p className="section-kicker">Your information</p>
        <h1>My Profile</h1>
        <p>Keep your details ready for future applications.</p>
      </div>

      {loadError ? <div className="profile-alert profile-alert--error">{loadError}</div> : null}

      <ProfileSection title="Personal Information">
        <Field label="First Name" value={profile.personal.firstName} onChange={(value) => updateSection('personal', 'firstName', value)} required error={errors.firstName} />
        <Field label="Last Name" value={profile.personal.lastName} onChange={(value) => updateSection('personal', 'lastName', value)} required error={errors.lastName} />
        <Field label="Email" type="email" value={profile.personal.email} onChange={(value) => updateSection('personal', 'email', value)} required error={errors.email} />
        <Field label="Phone" type="tel" value={profile.personal.phone} onChange={(value) => updateSection('personal', 'phone', value)} />
        <Field label="Date of Birth" type="date" value={profile.personal.dateOfBirth} onChange={(value) => updateSection('personal', 'dateOfBirth', value)} />
      </ProfileSection>

      <ProfileSection title="Location">
        <Field label="Address" value={profile.location.address} onChange={(value) => updateSection('location', 'address', value)} />
        <Field label="City" value={profile.location.city} onChange={(value) => updateSection('location', 'city', value)} />
        <Field label="State" value={profile.location.state} onChange={(value) => updateSection('location', 'state', value)} />
        <Field label="Country" value={profile.location.country} onChange={(value) => updateSection('location', 'country', value)} />
        <Field label="Pincode" value={profile.location.pincode} onChange={(value) => updateSection('location', 'pincode', value)} />
      </ProfileSection>

      <ProfileSection title="Education">
        <Field label="Degree" value={profile.education.degree} onChange={(value) => updateSection('education', 'degree', value)} />
        <Field label="College" value={profile.education.college} onChange={(value) => updateSection('education', 'college', value)} />
        <Field label="University" value={profile.education.university} onChange={(value) => updateSection('education', 'university', value)} />
        <Field label="Graduation Year" type="number" value={profile.education.graduationYear} onChange={(value) => updateSection('education', 'graduationYear', numberValue(value))} error={errors.graduationYear} />
        <Field label="CGPA" type="number" value={profile.education.cgpa} onChange={(value) => updateSection('education', 'cgpa', numberValue(value))} error={errors.cgpa} />
      </ProfileSection>

      <ProfileSection title="Professional">
        <Field label="Current Role" value={profile.professional.currentRole} onChange={(value) => updateSection('professional', 'currentRole', value)} />
        <Field label="Experience (years)" type="number" value={profile.professional.experience} onChange={(value) => updateSection('professional', 'experience', numberValue(value))} />
        <TagInput label="Skills" values={profile.professional.skills} onChange={(values) => updateSection('professional', 'skills', values)} placeholder="Add a skill" />
        <Field label="LinkedIn" type="url" value={profile.professional.linkedin} onChange={(value) => updateSection('professional', 'linkedin', value)} placeholder="https://" />
        <Field label="GitHub" type="url" value={profile.professional.github} onChange={(value) => updateSection('professional', 'github', value)} placeholder="https://" />
        <Field label="Portfolio" type="url" value={profile.professional.portfolio} onChange={(value) => updateSection('professional', 'portfolio', value)} placeholder="https://" />
      </ProfileSection>

      <ProfileSection title="Job Preferences">
        <TagInput label="Preferred Roles" values={profile.jobPreferences.preferredRoles} onChange={(values) => updateSection('jobPreferences', 'preferredRoles', values)} placeholder="Add a role" />
        <TagInput label="Preferred Locations" values={profile.jobPreferences.preferredLocations} onChange={(values) => updateSection('jobPreferences', 'preferredLocations', values)} placeholder="Add a location" />
        <label className="profile-field">
          <span>Work Mode</span>
          <select value={profile.jobPreferences.workMode ?? ''} onChange={handleWorkModeChange}>
            <option value="">Select work mode</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>
        </label>
        <Field label="Expected Salary" type="number" value={profile.jobPreferences.expectedSalary} onChange={(value) => updateSection('jobPreferences', 'expectedSalary', numberValue(value))} />
        <Field label="Notice Period (days)" type="number" value={profile.jobPreferences.noticePeriod} onChange={(value) => updateSection('jobPreferences', 'noticePeriod', numberValue(value))} />
      </ProfileSection>

      <div className="profile-actions">
        <button className="button button--primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save profile'}
          {!saving ? <Check size={15} strokeWidth={2.2} aria-hidden="true" /> : null}
        </button>
        {saveMessage ? <span className={saveMessage.includes('Unable') ? 'save-message save-message--error' : 'save-message'}>{saveMessage}</span> : null}
      </div>

      <div className="profile-danger-zone">
        <div>
          <h2>Reset profile</h2>
          <p>Remove your locally stored profile information.</p>
        </div>
        <button className="button button--danger" type="button" onClick={() => void handleClear()}>
          <Trash2 size={14} strokeWidth={1.9} aria-hidden="true" />
          Clear Profile
        </button>
      </div>
    </form>
  )
}

import { useCallback, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ProfilePage } from './components/ProfilePage'
import { ResumePage } from './components/ResumePage'
import { confirmAutofill, deleteManualMapping, getManualMappings, requestAutofillPreview, requestPageFields, saveManualMapping } from './services/fieldDetectionMessaging'
import { getProfile } from './services/profileStorage'
import { getResumes } from './services/resumeStorage'
import type { AutofillPreviewEntry, AutofillPreviewResponse } from './field-detector/messages'
import type { FieldType } from './field-detector/fieldTypes'
import type { UserProfile } from './types/profile'
import type { Resume } from './types/resume'
import { getProfileCompletion, isProfileEmpty } from './utils/profileCompletion'
import './App.css'

type PageId = 'dashboard' | 'profile' | 'resume' | 'autofill' | 'analyzer' | 'applications' | 'settings'

type NavigationItem = {
  id: PageId
  label: string
  icon: LucideIcon
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'profile', label: 'My Profile', icon: UserRound },
  { id: 'resume', label: 'Resume', icon: FileText },
  { id: 'autofill', label: 'Autofill', icon: Sparkles },
  { id: 'analyzer', label: 'Job Analyzer', icon: BarChart3 },
  { id: 'applications', label: 'Applications', icon: FolderKanban },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const pageLabels: Record<Exclude<PageId, 'dashboard'>, string> = {
  profile: 'My Profile',
  resume: 'Resume',
  autofill: 'Autofill',
  analyzer: 'Job Analyzer',
  applications: 'Applications',
  settings: 'Settings',
}

const supportFieldTypes: FieldType[] = [
  'firstName', 'lastName', 'fullName', 'email', 'phone', 'dateOfBirth', 'address', 'city', 'state', 'country', 'postalCode', 'linkedin', 'github', 'portfolio', 'degree', 'college', 'university', 'graduationYear', 'cgpa',
]

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  icon?: LucideIcon
}

function Button({ variant = 'secondary', icon: Icon, children, className = '', ...props }: ButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`.trim()} type="button" {...props}>
      {children}
      {Icon ? <Icon size={15} strokeWidth={2} aria-hidden="true" /> : null}
    </button>
  )
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`.trim()}>{children}</div>
}

function Header({ onSettingsClick }: { onSettingsClick: () => void }) {
  return (
    <header className="app-header">
      <div className="header-topline">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <BriefcaseBusiness size={19} strokeWidth={2.2} />
          </div>
          <strong>Job Agent</strong>
        </div>
        <button className="icon-button" type="button" onClick={onSettingsClick} aria-label="Open settings">
          <Settings size={17} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </div>
      <p className="brand-subtitle">Your personal job application assistant</p>
    </header>
  )
}

function Navigation({ activePage, onNavigate }: { activePage: PageId; onNavigate: (page: PageId) => void }) {
  return (
    <nav className="main-nav" aria-label="Main navigation">
      <span className="nav-label">Workspace</span>
      <div className="nav-list">
        {navigationItems.map(({ id, label, icon: Icon }) => (
          <button
            className={`nav-item${activePage === id ? ' nav-item--active' : ''}`}
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            aria-current={activePage === id ? 'page' : undefined}
          >
            <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

function ProfileCard({ profile, onOpenProfile }: { profile: UserProfile | null; onOpenProfile: () => void }) {
  const completion = getProfileCompletion(profile)
  const profileIsEmpty = isProfileEmpty(profile)

  return (
    <Card className="profile-card">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Getting started</p>
          <h2>Profile</h2>
        </div>
        <div className="card-icon card-icon--blue" aria-hidden="true">
          <UserRound size={18} strokeWidth={1.9} />
        </div>
      </div>
      <p className="profile-status">{profileIsEmpty ? "Your profile isn't set up yet." : `${completion}% complete`}</p>
      <div className="progress-track" aria-label={`Profile ${completion}% complete`}>
        <span className="progress-bar" style={{ width: `${completion}%` }} />
      </div>
      <Button variant="ghost" icon={ArrowRight} onClick={onOpenProfile}>
        {profileIsEmpty ? 'Create your profile' : 'Edit your profile'}
      </Button>
    </Card>
  )
}

function ResumeCard({ resumes, onOpenResumes }: { resumes: Resume[]; onOpenResumes: () => void }) {
  const defaultResume = resumes.find((resume) => resume.isDefault)

  return (
    <Card className="resume-summary-card">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Your documents</p>
          <h2>Resume</h2>
        </div>
        <div className="card-icon card-icon--violet" aria-hidden="true">
          <FileText size={18} strokeWidth={1.9} />
        </div>
      </div>
      <p className="profile-status">{resumes.length === 0 ? 'No resumes yet' : `${resumes.length} ${resumes.length === 1 ? 'resume' : 'resumes'}`}</p>
      <p className="resume-summary-name">{defaultResume ? `Default: ${defaultResume.name}` : 'Add your first resume'}</p>
      <Button variant="ghost" icon={ArrowRight} onClick={onOpenResumes}>Manage resumes</Button>
    </Card>
  )
}

function QuickActionCard({ title, description, icon: Icon, tone }: {
  title: string
  description: string
  icon: LucideIcon
  tone: 'blue' | 'violet'
}) {
  return (
    <Card className="quick-action-card">
      <div className={`card-icon card-icon--${tone}`} aria-hidden="true">
        <Icon size={18} strokeWidth={1.9} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="action-placeholder">Coming soon</span>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        <FolderKanban size={20} strokeWidth={1.8} />
      </div>
      <h3>No applications yet</h3>
      <p>Your applications will appear here.</p>
    </div>
  )
}

function Dashboard({ profile, resumes, onOpenProfile, onOpenResumes }: {
  profile: UserProfile | null
  resumes: Resume[]
  onOpenProfile: () => void
  onOpenResumes: () => void
}) {
  return (
    <>
      <section className="welcome-section" aria-labelledby="welcome-heading">
        <p className="section-kicker">Dashboard</p>
        <h1 id="welcome-heading">Good afternoon <span aria-hidden="true">👋</span></h1>
        <p>Let&apos;s get your next opportunity.</p>
      </section>

      <ProfileCard profile={profile} onOpenProfile={onOpenProfile} />
      <ResumeCard resumes={resumes} onOpenResumes={onOpenResumes} />

      <section className="content-section" aria-labelledby="quick-actions-heading">
        <div className="section-heading">
          <h2 id="quick-actions-heading">Quick actions</h2>
          <span>For your next step</span>
        </div>
        <div className="quick-actions-grid">
          <QuickActionCard
            title="Autofill Application"
            description="Fill application fields"
            icon={Sparkles}
            tone="blue"
          />
          <QuickActionCard
            title="Analyze Job"
            description="Understand this job"
            icon={Search}
            tone="violet"
          />
        </div>
      </section>

      <section className="content-section recent-section" aria-labelledby="recent-heading">
        <div className="section-heading">
          <h2 id="recent-heading">Recent Applications</h2>
        </div>
        <Card className="recent-card">
          <EmptyState />
        </Card>
      </section>
    </>
  )
}

function PlaceholderPage({ page }: { page: Exclude<PageId, 'dashboard' | 'autofill'> }) {
  const Icon = navigationItems.find((item) => item.id === page)?.icon ?? LayoutDashboard

  return (
    <section className="empty-page">
      <div className="empty-state__icon empty-state__icon--large" aria-hidden="true">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <p className="section-kicker">Coming soon</p>
      <h1>{pageLabels[page]}</h1>
      <p>This section is not available yet.</p>
    </section>
  )
}

function previewGroup(fields: AutofillPreviewEntry[], statuses: AutofillPreviewEntry['status'][]) {
  return fields.filter((entry) => statuses.includes(entry.status))
}

function PreviewRow({
  entry,
  marker,
  detail,
  value,
}: {
  entry: AutofillPreviewEntry
  marker: 'ready' | 'idle'
  detail: string
  value?: string | null
}) {
  return (
    <div className="preview-row">
      <span className={`preview-marker preview-marker--${marker}`} aria-hidden="true">{marker === 'ready' ? '✓' : '○'}</span>
      <div className="preview-row__body">
        <div className="preview-row__title">
          <strong>{entry.label}</strong>
          {value ? <span className="preview-row__value">{value}</span> : null}
        </div>
        <span className="preview-row__detail">{detail}</span>
      </div>
    </div>
  )
}

function AutofillPage() {
  const [preview, setPreview] = useState<AutofillPreviewResponse | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const handleReview = useCallback(async () => {
    setIsBusy(true)
    setStatus(null)

    try {
      const response = await requestAutofillPreview()
      setPreview(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate preview.'
      setPreview(null)
      setStatus({ tone: 'error', message })
    } finally {
      setIsBusy(false)
    }
  }, [])

  const handleCancel = useCallback(() => {
    setPreview(null)
  }, [])

  const handleConfirm = useCallback(async () => {
    setIsBusy(true)

    try {
      const response = await confirmAutofill()
      setPreview(null)
      setStatus({ tone: 'success', message: `Filled ${response.filled} fields.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to confirm autofill.'
      setStatus({ tone: 'error', message })
    } finally {
      setIsBusy(false)
    }
  }, [])

  const readyFields = preview ? previewGroup(preview.fields, ['ready', 'manualMapping']) : []
  const alreadyFilledFields = preview ? previewGroup(preview.fields, ['alreadyFilled']) : []
  const missingFields = preview ? previewGroup(preview.fields, ['missingProfileValue']) : []
  const skippedFields = preview ? previewGroup(preview.fields, ['unknown', 'skipped']) : []

  return (
    <section className="empty-page autofill-page">
      <div className="empty-state__icon empty-state__icon--large" aria-hidden="true">
        <Sparkles size={22} strokeWidth={1.8} />
      </div>
      <p className="section-kicker">Autofill</p>
      <h1>{pageLabels.autofill}</h1>
      <p>Review detected fields, then fill the active form with your saved profile.</p>

      <div className="autofill-actions">
        {!preview ? (
          <Button variant="primary" onClick={() => void handleReview()} disabled={isBusy}>
            {isBusy ? 'Scanning page…' : 'Review and autofill'}
          </Button>
        ) : null}

        {status ? (
          <p className={`autofill-status autofill-status--${status.tone}`}>{status.message}</p>
        ) : null}
      </div>

      {preview ? (
        <Card className="autofill-preview">
          <div className="section-heading">
            <h2>Autofill Preview</h2>
          </div>
          <p className="autofill-preview__summary">
            {preview.readyCount} {preview.readyCount === 1 ? 'field' : 'fields'} ready to fill
          </p>

          {readyFields.length > 0 ? (
            <div className="preview-group">
              <p className="section-kicker">Ready to fill</p>
              {readyFields.map((entry) => (
                <PreviewRow
                  key={entry.fieldIdentifier}
                  entry={entry}
                  marker="ready"
                  value={entry.value}
                  detail={entry.status === 'manualMapping' ? 'Manual mapping' : 'Ready'}
                />
              ))}
            </div>
          ) : null}

          {alreadyFilledFields.length > 0 ? (
            <div className="preview-group">
              <p className="section-kicker">Already filled</p>
              {alreadyFilledFields.map((entry) => (
                <PreviewRow
                  key={entry.fieldIdentifier}
                  entry={entry}
                  marker="idle"
                  detail="Already filled — will not overwrite"
                />
              ))}
            </div>
          ) : null}

          {missingFields.length > 0 ? (
            <div className="preview-group">
              <p className="section-kicker">Missing profile data</p>
              {missingFields.map((entry) => (
                <PreviewRow
                  key={entry.fieldIdentifier}
                  entry={entry}
                  marker="idle"
                  detail="No profile value"
                />
              ))}
            </div>
          ) : null}

          {skippedFields.length > 0 ? (
            <div className="preview-group">
              <p className="section-kicker">Skipped / unknown</p>
              {skippedFields.map((entry) => (
                <PreviewRow
                  key={entry.fieldIdentifier}
                  entry={entry}
                  marker="idle"
                  detail="Unknown field"
                />
              ))}
            </div>
          ) : null}

          <div className="preview-actions">
            <Button variant="secondary" onClick={handleCancel} disabled={isBusy}>Cancel</Button>
            <Button variant="primary" onClick={() => void handleConfirm()} disabled={isBusy || preview.readyCount === 0}>
              {isBusy ? 'Filling…' : 'Autofill'}
            </Button>
          </div>
        </Card>
      ) : null}

      <ManualMappingPanel />
    </section>
  )
}

function ManualMappingPanel() {
  const [fields, setFields] = useState<Array<{ fieldIdentifier: string; label: string; detectedFieldType: string; confidence: number; metadata: Record<string, string> }>>([])
  const [selectedFieldIdentifier, setSelectedFieldIdentifier] = useState('')
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType>('phone')
  const [mappings, setMappings] = useState<Array<{ fieldIdentifier: string; fieldType: string; label?: string; createdAt?: string }>>([])
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const refreshMappings = useCallback(async () => {
    try {
      const response = await getManualMappings()
      setMappings(response.mappings)
    } catch (error) {
      console.error('Unable to fetch manual mappings', error)
    }
  }, [])

  const handleScanFields = useCallback(async () => {
    try {
      const pageFields = await requestPageFields()
      setFields(pageFields)
      if (pageFields.length > 0) {
        setSelectedFieldIdentifier(pageFields[0].fieldIdentifier)
        setSelectedFieldType(pageFields[0].detectedFieldType === 'unknown' ? 'phone' : (pageFields[0].detectedFieldType as FieldType))
      }
      setStatus({ tone: 'success', message: `${pageFields.length} fields loaded.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load page fields.'
      setStatus({ tone: 'error', message })
    }
  }, [])

  const handleSaveMapping = useCallback(async () => {
    if (!selectedFieldIdentifier) {
      setStatus({ tone: 'error', message: 'Select a field to map.' })
      return
    }

    const selectedField = fields.find((field) => field.fieldIdentifier === selectedFieldIdentifier)
    try {
      await saveManualMapping({
        fieldIdentifier: selectedFieldIdentifier,
        fieldType: selectedFieldType,
        label: selectedField?.label ?? selectedFieldIdentifier,
      })
      setStatus({ tone: 'success', message: `Saved manual mapping for ${selectedField?.label ?? selectedFieldIdentifier}.` })
      await refreshMappings()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save mapping.'
      setStatus({ tone: 'error', message })
    }
  }, [fields, refreshMappings, selectedFieldIdentifier, selectedFieldType])

  const handleDeleteMapping = useCallback(async (fieldIdentifier: string) => {
    try {
      await deleteManualMapping(fieldIdentifier)
      setStatus({ tone: 'success', message: 'Manual mapping deleted.' })
      await refreshMappings()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete mapping.'
      setStatus({ tone: 'error', message })
    }
  }, [refreshMappings])

  const selectedField = fields.find((field) => field.fieldIdentifier === selectedFieldIdentifier)

  return (
    <div className="manual-mapping-panel" style={{ marginTop: '2rem', width: '100%', textAlign: 'left' }}>
      <div className="section-heading" style={{ marginBottom: '0.75rem' }}>
        <h2>Manual Field Mapping</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        <Button variant="secondary" onClick={handleScanFields}>Scan current page</Button>

        {selectedField ? (
          <div className="card" style={{ padding: '0.9rem 1rem' }}>
            <p className="section-kicker" style={{ marginBottom: '0.25rem' }}>Website field</p>
            <strong>{selectedField.label}</strong>
            <p style={{ margin: '0.4rem 0 0', color: '#475467', fontSize: '12px' }}>
              Detected as: {selectedField.detectedFieldType}
            </p>
          </div>
        ) : null}

        {fields.length > 0 ? (
          <label style={{ display: 'grid', gap: '0.35rem', fontSize: '12px', fontWeight: 600 }}>
            Website field
            <select value={selectedFieldIdentifier} onChange={(event) => setSelectedFieldIdentifier(event.target.value)}>
              {fields.map((field) => (
                <option key={field.fieldIdentifier} value={field.fieldIdentifier}>{field.label}</option>
              ))}
            </select>
          </label>
        ) : null}

        <label style={{ display: 'grid', gap: '0.35rem', fontSize: '12px', fontWeight: 600 }}>
          Map to
          <select value={selectedFieldType} onChange={(event) => setSelectedFieldType(event.target.value as FieldType)}>
            {supportFieldTypes.map((fieldType) => (
              <option key={fieldType} value={fieldType}>{fieldType}</option>
            ))}
          </select>
        </label>

        <Button variant="primary" onClick={handleSaveMapping}>Save mapping</Button>

        {status ? (
          <p style={{ margin: 0, color: status.tone === 'error' ? '#b42318' : '#0f766e', fontSize: '12px' }}>{status.message}</p>
        ) : null}

        {mappings.length > 0 ? (
          <div style={{ display: 'grid', gap: '0.5rem', width: '100%' }}>
            <p className="section-kicker" style={{ margin: 0 }}>Existing mappings</p>
            {mappings.map((mapping) => (
              <div key={mapping.fieldIdentifier} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0.9rem', gap: '0.5rem' }}>
                <span style={{ fontSize: '12px' }}>{mapping.label ?? mapping.fieldIdentifier} → {mapping.fieldType}</span>
                <Button variant="ghost" onClick={() => void handleDeleteMapping(mapping.fieldIdentifier)}>Delete</Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [resumes, setResumes] = useState<Resume[]>([])

  useEffect(() => {
    void getProfile().then(setProfile).catch(() => setProfile(null))
    void getResumes().then(setResumes).catch(() => setResumes([]))
  }, [])

  const handleProfileChange = useCallback((nextProfile: UserProfile | null) => {
    setProfile(nextProfile)
  }, [])

  const openProfile = useCallback(() => {
    setActivePage('profile')
  }, [])

  const handleResumesChange = useCallback((nextResumes: Resume[]) => {
    setResumes(nextResumes)
  }, [])

  const openResumes = useCallback(() => {
    setActivePage('resume')
  }, [])

  return (
    <div className="app-shell">
      <Header onSettingsClick={() => setActivePage('settings')} />
      <Navigation activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content">
        {activePage === 'dashboard' ? (
          <Dashboard profile={profile} resumes={resumes} onOpenProfile={openProfile} onOpenResumes={openResumes} />
        ) : activePage === 'profile' ? (
          <ProfilePage onProfileChange={handleProfileChange} />
        ) : activePage === 'resume' ? (
          <ResumePage onResumesChange={handleResumesChange} />
        ) : activePage === 'autofill' ? (
          <AutofillPage />
        ) : (
          <PlaceholderPage page={activePage} />
        )}
      </main>
    </div>
  )
}

export default App

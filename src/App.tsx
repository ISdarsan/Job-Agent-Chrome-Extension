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
import { getProfile } from './services/profileStorage'
import { getResumes } from './services/resumeStorage'
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

function PlaceholderPage({ page }: { page: Exclude<PageId, 'dashboard'> }) {
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
        ) : (
          <PlaceholderPage page={activePage} />
        )}
      </main>
    </div>
  )
}

export default App

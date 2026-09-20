import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Check, Download, FileText, Pencil, Plus, Star, Trash2, Upload, X } from 'lucide-react'
import { getResumeFile, saveResumeFile } from '../services/resumeDatabase'
import {
  deleteResumeMetadata,
  getResumes,
  saveResumeMetadata,
  setDefaultResume,
  updateResumeMetadata,
} from '../services/resumeStorage'
import type { Resume } from '../types/resume'
import {
  defaultResumeName,
  formatFileSize,
  formatResumeDate,
  getResumeFileType,
  validateResumeFile,
} from '../utils/resumeUtils'
import './ResumePage.css'

type ResumePageProps = {
  onResumesChange: (resumes: Resume[]) => void
}

export function ResumePage({ onResumesChange }: ResumePageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingName, setPendingName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadResumes() {
      try {
        const savedResumes = await getResumes()
        if (mounted) {
          setResumes(savedResumes)
          onResumesChange(savedResumes)
        }
      } catch {
        if (mounted) setError('Unable to load your resumes.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadResumes()
    return () => {
      mounted = false
    }
  }, [onResumesChange])

  function updateResumes(nextResumes: Resume[]) {
    setResumes(nextResumes)
    onResumesChange(nextResumes)
  }

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setError('')
    setNotice('')
    if (!file) return

    const validationError = validateResumeFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setPendingFile(file)
    setPendingName(defaultResumeName(file.name))
  }

  async function handleUpload() {
    if (!pendingFile) return
    const fileType = getResumeFileType(pendingFile)
    const name = pendingName.trim() || defaultResumeName(pendingFile.name)
    if (!fileType || !name) return

    setBusy(true)
    setError('')
    try {
      const now = new Date().toISOString()
      const resume: Resume = {
        id: crypto.randomUUID(),
        name,
        fileName: pendingFile.name,
        fileType,
        fileSize: pendingFile.size,
        createdAt: now,
        updatedAt: now,
        isDefault: resumes.length === 0,
      }
      await saveResumeFile(resume.id, pendingFile)
      await saveResumeMetadata(resume)
      const nextResumes = await getResumes()
      updateResumes(nextResumes)
      setPendingFile(null)
      setPendingName('')
      setNotice('Resume added locally.')
    } catch {
      setError('Unable to save this resume. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function cancelUpload() {
    setPendingFile(null)
    setPendingName('')
  }

  async function handleSetDefault(id: string) {
    setBusy(true)
    setError('')
    try {
      updateResumes(await setDefaultResume(id))
      setNotice('Default resume updated.')
    } catch {
      setError('Unable to update the default resume.')
    } finally {
      setBusy(false)
    }
  }

  function beginRename(resume: Resume) {
    setEditingId(resume.id)
    setEditingName(resume.name)
    setError('')
  }

  async function handleRename(id: string) {
    const name = editingName.trim()
    if (!name) {
      setError('Resume name cannot be empty.')
      return
    }

    setBusy(true)
    try {
      await updateResumeMetadata(id, { name })
      updateResumes(await getResumes())
      setEditingId(null)
      setEditingName('')
      setNotice('Resume renamed.')
    } catch {
      setError('Unable to rename this resume.')
    } finally {
      setBusy(false)
    }
  }

  async function handleOpen(resume: Resume) {
    setBusy(true)
    setError('')
    try {
      const file = await getResumeFile(resume.id)
      if (!file) {
        setError('The resume file could not be found.')
        return
      }

      const objectUrl = URL.createObjectURL(file)
      if (resume.fileType === 'PDF') {
        const openedWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer')
        if (!openedWindow) {
          const anchor = document.createElement('a')
          anchor.href = objectUrl
          anchor.download = resume.fileName
          anchor.click()
        }
      } else {
        const anchor = document.createElement('a')
        anchor.href = objectUrl
        anchor.download = resume.fileName
        anchor.click()
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } catch {
      setError('Unable to open this resume.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(resume: Resume) {
    if (!window.confirm(`Delete "${resume.name}"? This cannot be undone.`)) return

    setBusy(true)
    setError('')
    try {
      updateResumes(await deleteResumeMetadata(resume.id))
      setNotice('Resume deleted.')
    } catch {
      setError('Unable to delete this resume.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="resume-loading">Loading your resumes...</div>
  }

  return (
    <section className="resume-page" aria-labelledby="resume-heading">
      <div className="resume-page__intro">
        <div>
          <p className="section-kicker">Your documents</p>
          <h1 id="resume-heading">Resume Manager</h1>
          <p>Keep your resumes ready for future applications.</p>
        </div>
        <button className="button button--primary resume-upload-button" type="button" onClick={() => fileInputRef.current?.click()}>
          <Upload size={15} strokeWidth={2.1} aria-hidden="true" />
          Upload Resume
        </button>
        <input ref={fileInputRef} className="visually-hidden" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileSelected} />
      </div>

      {error ? <div className="resume-alert resume-alert--error">{error}</div> : null}
      {notice ? <div className="resume-alert resume-alert--success">{notice}</div> : null}

      {pendingFile ? (
        <div className="resume-upload-card card">
          <div className="resume-upload-card__heading">
            <div className="resume-file-icon" aria-hidden="true"><FileText size={19} strokeWidth={1.8} /></div>
            <div>
              <h2>Name your resume</h2>
              <p>{pendingFile.name} · {formatFileSize(pendingFile.size)}</p>
            </div>
          </div>
          <label className="resume-name-field">
            <span>Display name</span>
            <input value={pendingName} onChange={(event) => setPendingName(event.target.value)} autoFocus />
          </label>
          <div className="resume-upload-actions">
            <button className="button button--secondary" type="button" onClick={cancelUpload}>Cancel</button>
            <button className="button button--primary" type="button" onClick={() => void handleUpload()} disabled={busy}>
              {busy ? 'Adding...' : 'Add resume'}
              {!busy ? <Check size={15} strokeWidth={2.2} aria-hidden="true" /> : null}
            </button>
          </div>
        </div>
      ) : null}

      {resumes.length === 0 && !pendingFile ? (
        <div className="resume-empty-state card">
          <div className="resume-empty-state__icon" aria-hidden="true"><FileText size={22} strokeWidth={1.7} /></div>
          <h2>No resumes yet</h2>
          <p>Upload your first resume to use it across your job applications.</p>
          <button className="button button--primary" type="button" onClick={() => fileInputRef.current?.click()}>
            <Plus size={15} strokeWidth={2.1} aria-hidden="true" />
            Upload Resume
          </button>
        </div>
      ) : (
        <div className="resume-list">
          {resumes.map((resume) => (
            <article className="resume-card card" key={resume.id}>
              <div className="resume-card__topline">
                <div className="resume-file-icon" aria-hidden="true"><FileText size={19} strokeWidth={1.8} /></div>
                <div className="resume-card__title">
                  {editingId === resume.id ? (
                    <div className="rename-field">
                      <input value={editingName} onChange={(event) => setEditingName(event.target.value)} autoFocus aria-label="Resume display name" />
                      <button type="button" onClick={() => void handleRename(resume.id)} aria-label="Save resume name"><Check size={15} aria-hidden="true" /></button>
                      <button type="button" onClick={() => setEditingId(null)} aria-label="Cancel rename"><X size={15} aria-hidden="true" /></button>
                    </div>
                  ) : <h2>{resume.name}</h2>}
                  <p>{resume.fileName}</p>
                </div>
                {resume.isDefault ? <span className="default-badge"><Star size={11} fill="currentColor" aria-hidden="true" /> Default</span> : null}
              </div>
              <div className="resume-card__meta">
                <span>{resume.fileType} · {formatFileSize(resume.fileSize)}</span>
                <span>Added {formatResumeDate(resume.createdAt)}</span>
              </div>
              <div className="resume-card__actions">
                <button className="resume-action resume-action--primary" type="button" onClick={() => void handleOpen(resume)} disabled={busy}>
                  {resume.fileType === 'PDF' ? <FileText size={14} aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}
                  {resume.fileType === 'PDF' ? 'Open' : 'Download'}
                </button>
                {!resume.isDefault ? <button className="resume-action" type="button" onClick={() => void handleSetDefault(resume.id)} disabled={busy}><Star size={14} aria-hidden="true" /> Set as Default</button> : null}
                <button className="resume-action" type="button" onClick={() => beginRename(resume)} disabled={busy}><Pencil size={14} aria-hidden="true" /> Rename</button>
                <button className="resume-action resume-action--danger" type="button" onClick={() => void handleDelete(resume)} disabled={busy}><Trash2 size={14} aria-hidden="true" /> Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

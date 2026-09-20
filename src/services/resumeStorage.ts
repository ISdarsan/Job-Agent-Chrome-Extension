import type { Resume } from '../types/resume'
import { deleteResumeFile } from './resumeDatabase'

const RESUME_STORAGE_KEY = 'jobAgentResumes'

declare const chrome: {
  storage: {
    local: {
      get(keys: string[]): Promise<Record<string, unknown>>
      set(items: Record<string, unknown>): Promise<void>
    }
  }
}

function normalizeResumes(value: unknown): Resume[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((resume): resume is Resume => {
    if (!resume || typeof resume !== 'object') return false
    const item = resume as Partial<Resume>
    return typeof item.id === 'string'
      && typeof item.name === 'string'
      && typeof item.fileName === 'string'
      && typeof item.fileType === 'string'
      && typeof item.fileSize === 'number'
      && typeof item.createdAt === 'string'
      && typeof item.updatedAt === 'string'
      && typeof item.isDefault === 'boolean'
  })
}

async function writeResumes(resumes: Resume[]): Promise<void> {
  await chrome.storage.local.set({ [RESUME_STORAGE_KEY]: resumes })
}

export async function getResumes(): Promise<Resume[]> {
  const result = await chrome.storage.local.get([RESUME_STORAGE_KEY])
  return normalizeResumes(result[RESUME_STORAGE_KEY]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function saveResumeMetadata(resume: Resume): Promise<void> {
  const resumes = await getResumes()
  const shouldBeDefault = resumes.length === 0 || resume.isDefault
  const nextResume = { ...resume, isDefault: shouldBeDefault }
  const nextResumes = resumes
    .filter((item) => item.id !== resume.id)
    .map((item) => shouldBeDefault ? { ...item, isDefault: false } : item)
  await writeResumes([...nextResumes, nextResume])
}

export async function updateResumeMetadata(id: string, updates: Partial<Resume>): Promise<Resume> {
  const resumes = await getResumes()
  const existing = resumes.find((resume) => resume.id === id)
  if (!existing) {
    throw new Error('Resume not found.')
  }

  const updatedResume = { ...existing, ...updates, id, updatedAt: new Date().toISOString() }
  await writeResumes(resumes.map((resume) => resume.id === id ? updatedResume : resume))
  return updatedResume
}

export async function setDefaultResume(id: string): Promise<Resume[]> {
  const resumes = await getResumes()
  if (!resumes.some((resume) => resume.id === id)) {
    throw new Error('Resume not found.')
  }

  const updatedResumes = resumes.map((resume) => ({
    ...resume,
    isDefault: resume.id === id,
    updatedAt: resume.id === id ? new Date().toISOString() : resume.updatedAt,
  }))
  await writeResumes(updatedResumes)
  return updatedResumes
}

export async function deleteResumeMetadata(id: string): Promise<Resume[]> {
  const resumes = await getResumes()
  const deletedResume = resumes.find((resume) => resume.id === id)
  if (!deletedResume) {
    return resumes
  }

  let remaining = resumes.filter((resume) => resume.id !== id)
  if (deletedResume.isDefault && remaining.length > 0) {
    const nextDefault = remaining[0]
    remaining = remaining.map((resume) => ({ ...resume, isDefault: resume.id === nextDefault.id }))
  }

  await writeResumes(remaining)
  await deleteResumeFile(id)
  return remaining
}

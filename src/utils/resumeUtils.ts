import type { ResumeFileType } from '../types/resume'

export const MAX_RESUME_SIZE = 10 * 1024 * 1024

const supportedMimeTypes: Record<string, ResumeFileType> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
}

const supportedExtensions: Record<string, ResumeFileType> = {
  pdf: 'PDF',
  doc: 'DOC',
  docx: 'DOCX',
}

export function getResumeFileType(file: File): ResumeFileType | null {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return supportedMimeTypes[file.type] ?? (extension ? supportedExtensions[extension] ?? null : null)
}

export function validateResumeFile(file: File): string | null {
  if (!getResumeFileType(file)) {
    return 'Please choose a PDF, DOC, or DOCX resume.'
  }
  if (file.size === 0) {
    return 'The selected file is empty.'
  }
  if (file.size > MAX_RESUME_SIZE) {
    return 'Resume files must be 10 MB or smaller.'
  }
  return null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatResumeDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

export function defaultResumeName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Untitled resume'
}

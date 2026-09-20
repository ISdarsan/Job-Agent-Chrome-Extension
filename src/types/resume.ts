export type ResumeFileType = 'PDF' | 'DOC' | 'DOCX'

export interface Resume {
  id: string
  name: string
  fileName: string
  fileType: ResumeFileType
  fileSize: number
  createdAt: string
  updatedAt: string
  isDefault: boolean
}

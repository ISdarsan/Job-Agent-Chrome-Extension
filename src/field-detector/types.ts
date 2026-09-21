import type { FieldType } from './fieldTypes'

export interface FormFieldMetadata {
  index: number
  tagName: 'INPUT' | 'TEXTAREA' | 'SELECT'
  inputType: string
  name: string
  id: string
  placeholder: string
  ariaLabel: string
  autocomplete: string
  labelText: string
  nearbyText: string
}

export interface FieldDetection {
  fieldType: FieldType
  confidence: number
  metadata: FormFieldMetadata
}

export interface ScanPageRequest {
  type: 'SCAN_PAGE'
}

export interface ScanPageResponse {
  ok: boolean
  fields: FieldDetection[]
  error?: string
}

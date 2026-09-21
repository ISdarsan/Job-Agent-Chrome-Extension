import type { FieldDetection } from './types'

export interface AutofillDetail {
  fieldType: string
  status: 'filled' | 'skipped' | 'ignored'
  reason?: string
}

export type FieldDetectionMessage =
  | { type: 'request-page-scan' }
  | { type: 'autofill-page' }
  | { type: 'preview-autofill' }
  | { type: 'confirm-autofill' }
  | { type: 'SCAN_PAGE' }
  | { type: 'get-page-fields' }
  | { type: 'save-manual-mapping'; fieldIdentifier: string; fieldType: string; label?: string }
  | { type: 'delete-manual-mapping'; fieldIdentifier: string }
  | { type: 'get-manual-mappings' }

export interface PageScanResponse {
  ok: boolean
  fields: FieldDetection[]
  error?: string
}

export interface AutofillPageResponse {
  ok: boolean
  filled: number
  skipped: number
  unknown: number
  details: AutofillDetail[]
  error?: string
}

export interface AutofillPreviewEntry {
  fieldIdentifier: string
  fieldType: string
  label: string
  status: 'ready' | 'skipped' | 'unknown' | 'alreadyFilled' | 'missingProfileValue' | 'manualMapping'
  source: 'profile' | 'manual' | 'unknown'
  confidence: number
  value: string | null
  reason?: string
}

export interface AutofillPreviewResponse {
  ok: boolean
  fields: AutofillPreviewEntry[]
  readyCount: number
  skippedCount: number
  warningCount: number
  error?: string
}

export interface ManualMappingEntry {
  fieldIdentifier: string
  fieldType: string
  label?: string
  createdAt?: string
}

export interface ManualMappingsResponse {
  ok: boolean
  mappings: ManualMappingEntry[]
  error?: string
}

export interface PageFieldsResponse {
  ok: boolean
  fields: Array<{
    fieldIdentifier: string
    label: string
    detectedFieldType: string
    confidence: number
    metadata: Record<string, string>
  }>
  error?: string
}

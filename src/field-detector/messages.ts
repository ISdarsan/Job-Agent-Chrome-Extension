import type { FieldDetection } from './types'

export type FieldDetectionMessage =
  | { type: 'request-page-scan' }
  | { type: 'scan-page' }

export interface PageScanResponse {
  ok: boolean
  fields: FieldDetection[]
  error?: string
}

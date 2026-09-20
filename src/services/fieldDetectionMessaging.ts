import type { FieldDetection } from '../field-detector/types'

declare const chrome: {
  runtime: {
    sendMessage(message: { type: 'request-page-scan' }): Promise<{ ok: boolean; fields: FieldDetection[]; error?: string }>
  }
}

export async function requestPageScan(): Promise<FieldDetection[]> {
  const response = await chrome.runtime.sendMessage({ type: 'request-page-scan' })
  if (!response.ok) {
    throw new Error(response.error ?? 'Unable to scan this page.')
  }
  return response.fields
}

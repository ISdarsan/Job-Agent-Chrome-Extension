import type { AutofillPageResponse, AutofillPreviewResponse, ManualMappingsResponse, PageFieldsResponse, PageScanResponse } from '../field-detector/messages'
import type { FieldDetection } from '../field-detector/types'
import type { FieldType } from '../field-detector/fieldTypes'

declare const chrome: {
  runtime: {
    sendMessage(message: { type: 'request-page-scan' }): Promise<PageScanResponse>
    sendMessage(message: { type: 'autofill-page' }): Promise<AutofillPageResponse>
    sendMessage(message: { type: 'preview-autofill' }): Promise<AutofillPreviewResponse>
    sendMessage(message: { type: 'confirm-autofill' }): Promise<AutofillPageResponse>
    sendMessage(message: { type: 'get-page-fields' }): Promise<PageFieldsResponse>
    sendMessage(message: { type: 'save-manual-mapping'; fieldIdentifier: string; fieldType: string; label?: string }): Promise<ManualMappingsResponse>
    sendMessage(message: { type: 'delete-manual-mapping'; fieldIdentifier: string }): Promise<ManualMappingsResponse>
    sendMessage(message: { type: 'get-manual-mappings' }): Promise<ManualMappingsResponse>
  }
}

export async function requestPageScan(): Promise<FieldDetection[]> {
  const response = await chrome.runtime.sendMessage({ type: 'request-page-scan' })
  if (!response.ok) {
    throw new Error(response.error ?? 'Unable to scan this page.')
  }
  return response.fields
}

export async function triggerAutofill(): Promise<AutofillPageResponse> {
  const response = await chrome.runtime.sendMessage({ type: 'autofill-page' })
  if (!response.ok) {
    throw new Error(response.error ?? 'Unable to autofill this page.')
  }
  return response
}

export async function requestAutofillPreview(): Promise<AutofillPreviewResponse> {
  const response = await chrome.runtime.sendMessage({ type: 'preview-autofill' })
  if (!response.ok) {
    throw new Error(response.error ?? 'Unable to generate autofill preview.')
  }
  return response
}

export async function confirmAutofill(): Promise<AutofillPageResponse> {
  const response = await chrome.runtime.sendMessage({ type: 'confirm-autofill' })
  if (!response.ok) {
    throw new Error(response.error ?? 'Unable to confirm autofill.')
  }
  return response
}

export async function requestPageFields(): Promise<PageFieldsResponse['fields']> {
  const response = await chrome.runtime.sendMessage({ type: 'get-page-fields' })
  if (!response.ok) {
    throw new Error(response.error ?? 'Unable to load page fields.')
  }
  return response.fields
}

export async function saveManualMapping(mapping: { fieldIdentifier: string; fieldType: FieldType; label?: string }): Promise<ManualMappingsResponse> {
  const response = await chrome.runtime.sendMessage({
    type: 'save-manual-mapping',
    fieldIdentifier: mapping.fieldIdentifier,
    fieldType: mapping.fieldType,
    label: mapping.label,
  })

  if (!response.ok) {
    throw new Error(response.error ?? 'Unable to save manual mapping.')
  }

  return response
}

export async function deleteManualMapping(fieldIdentifier: string): Promise<ManualMappingsResponse> {
  const response = await chrome.runtime.sendMessage({ type: 'delete-manual-mapping', fieldIdentifier })
  if (!response.ok) {
    throw new Error(response.error ?? 'Unable to delete manual mapping.')
  }
  return response
}

export async function getManualMappings(): Promise<ManualMappingsResponse> {
  const response = await chrome.runtime.sendMessage({ type: 'get-manual-mappings' })
  if (!response.ok) {
    throw new Error(response.error ?? 'Unable to load manual mappings.')
  }
  return response
}

import { detectFields } from '../field-detector/detector'
import type { AutofillPageResponse, AutofillPreviewResponse, PageFieldsResponse } from '../field-detector/messages'
import type { FieldType } from '../field-detector/fieldTypes'
import type { FormFieldMetadata, ScanPageRequest, ScanPageResponse } from '../field-detector/types'
import { deleteManualMapping, getManualMappings, saveManualMapping } from '../services/manualMappingStorage'
import { getProfile } from '../services/profileStorage'
import type { UserProfile } from '../types/profile'

declare const chrome: {
  runtime: {
    onMessage: {
      addListener(
        listener: (
          message:
            | ScanPageRequest
            | { type: 'autofill-page' }
            | { type: 'preview-autofill' }
            | { type: 'confirm-autofill' }
            | { type: 'get-page-fields' }
            | { type: 'save-manual-mapping'; fieldIdentifier: string; fieldType: string; label?: string }
            | { type: 'delete-manual-mapping'; fieldIdentifier: string }
            | { type: 'get-manual-mappings' },
          sender: unknown,
          sendResponse: (response: ScanPageResponse | AutofillPageResponse | AutofillPreviewResponse | PageFieldsResponse | { ok: boolean; mappings: Array<{ fieldIdentifier: string; fieldType: string; label?: string; createdAt?: string }>; error?: string }) => void,
        ) => boolean | undefined,
      ): void
    }
  }
}

type FieldEntry = {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  metadata: FormFieldMetadata
}

function escapeCssSelector(value: string): string {
  const charsToEscape = new Set(['#', '.', ':', '[', ']', ' '])
  return Array.from(value).map((char) => (charsToEscape.has(char) ? `\\${char}` : char)).join('')
}

function generateFieldIdentifier(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const uniqueId = element.id?.trim()
  if (uniqueId) return `id:${uniqueId}`

  const name = element.getAttribute('name')?.trim()
  if (name) return `name:${name}`

  const autoComplete = element.getAttribute('autocomplete')?.trim()
  if (autoComplete) return `autocomplete:${autoComplete}`

  const tagName = element.tagName.toLowerCase()
  const type = element instanceof HTMLInputElement ? element.type.toLowerCase() : tagName
  const selectorPieces = [tagName]

  if (type && type !== 'text') selectorPieces.push(`type:${type}`)
  if (element.getAttribute('placeholder')) selectorPieces.push(`placeholder:${element.getAttribute('placeholder')}`)
  if (element.getAttribute('aria-label')) selectorPieces.push(`aria:${element.getAttribute('aria-label')}`)

  const base = selectorPieces.join('|')
  const index = Array.from(document.querySelectorAll(`${tagName}`)).indexOf(element)
  return `selector:${escapeCssSelector(`${base}:${index}`)}`
}

function textFromElement(element: Element | null): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 160) ?? ''
}

function getLabelText(element: HTMLElement): string {
  const id = element.id
  const associatedLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null
  const wrappingLabel = element.closest('label')
  return textFromElement(associatedLabel ?? wrappingLabel)
}

function getNearbyText(element: HTMLElement): string {
  const container = element.closest('fieldset, section, [role="group"], .field, .form-group, .form-field, div')
  return textFromElement(container).slice(0, 240)
}

function getMetadata(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, index: number): FormFieldMetadata {
  return {
    index,
    tagName: element.tagName as FormFieldMetadata['tagName'],
    inputType: element instanceof HTMLInputElement ? element.type.toLowerCase() : element.tagName === 'SELECT' ? 'select' : 'textarea',
    name: element.getAttribute('name') ?? '',
    id: element.id,
    placeholder: element.getAttribute('placeholder') ?? '',
    ariaLabel: element.getAttribute('aria-label') ?? '',
    autocomplete: element.getAttribute('autocomplete') ?? '',
    labelText: getLabelText(element),
    nearbyText: getNearbyText(element),
  }
}

function collectFieldEntries(): FieldEntry[] {
  const elements = [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')]
  return elements
    .filter((element) => {
      const input = element instanceof HTMLInputElement ? element : null
      return !element.disabled && input?.type !== 'hidden' && Boolean(element.getClientRects().length)
    })
    .map((element, index) => ({
      element,
      metadata: getMetadata(element, index),
    }))
}

function logDetections(detections: ReturnType<typeof detectFields>): void {
  console.groupCollapsed('Job Agent: detected fields')
  console.table(detections.map((detection) => ({
    label: detection.metadata.labelText || detection.metadata.placeholder || detection.metadata.name || `Field ${detection.metadata.index + 1}`,
    fieldType: detection.fieldType,
    confidence: detection.confidence,
  })))
  console.groupEnd()
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function getProfileValue(profile: UserProfile | null, fieldType: FieldType): string | number | null {
  if (!profile) return null

  switch (fieldType) {
    case 'firstName':
      return profile.personal.firstName ?? null
    case 'lastName':
      return profile.personal.lastName ?? null
    case 'fullName': {
      const fullName = [profile.personal.firstName, profile.personal.lastName].filter(Boolean).join(' ').trim()
      return fullName || null
    }
    case 'email':
      return profile.personal.email ?? null
    case 'phone':
      return profile.personal.phone ?? null
    case 'dateOfBirth':
      return profile.personal.dateOfBirth ?? null
    case 'address':
      return profile.location.address ?? null
    case 'city':
      return profile.location.city ?? null
    case 'state':
      return profile.location.state ?? null
    case 'country':
      return profile.location.country ?? null
    case 'postalCode':
      return profile.location.pincode ?? null
    case 'linkedin':
      return profile.professional.linkedin ?? null
    case 'github':
      return profile.professional.github ?? null
    case 'portfolio':
      return profile.professional.portfolio ?? null
    case 'degree':
      return profile.education.degree ?? null
    case 'college':
      return profile.education.college ?? null
    case 'university':
      return profile.education.university ?? null
    case 'graduationYear':
      return profile.education.graduationYear ?? null
    case 'cgpa':
      return profile.education.cgpa ?? null
    case 'unknown':
      return null
    default:
      return null
  }
}

function hasVisibleValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
  if (element instanceof HTMLSelectElement) {
    return Boolean(element.selectedOptions.length > 0 && element.value.trim() !== '')
  }
  return element.value.trim() !== ''
}

function dispatchInputEvents(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')
  if (descriptor?.set) {
    descriptor.set.call(element, value)
  } else {
    element.value = value
  }
  dispatchInputEvents(element)
}

function setSelectValue(element: HTMLSelectElement, value: string): boolean {
  const options = Array.from(element.options)
  const target = normalizeText(value)
  const match = options.find((option) => normalizeText(option.value) === target || normalizeText(option.textContent ?? '') === target)

  if (!match) {
    return false
  }

  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')
  if (descriptor?.set) {
    descriptor.set.call(element, match.value)
  } else {
    element.value = match.value
  }
  match.selected = true
  dispatchInputEvents(element)
  return true
}

async function getManualMappingOverrides(): Promise<Map<string, FieldType>> {
  const mappings = await getManualMappings()
  return new Map(mappings.map((mapping) => [mapping.fieldIdentifier, mapping.fieldType]))
}

async function autofillPage(): Promise<AutofillPageResponse> {
  const profile = await getProfile()
  const fieldEntries = collectFieldEntries()
  const manualMap = await getManualMappingOverrides()
  const detections = detectFields(fieldEntries.map((entry) => entry.metadata))
  const details: AutofillPageResponse['details'] = []

  let filled = 0
  let skipped = 0
  let unknown = 0

  for (const detection of detections) {
    const elementEntry = fieldEntries[detection.metadata.index]
    const element = elementEntry?.element
    const fieldIdentifier = element ? generateFieldIdentifier(element) : ''
    const mappedFieldType = fieldIdentifier ? manualMap.get(fieldIdentifier) : undefined
    const effectiveFieldType = mappedFieldType ?? detection.fieldType

    if (effectiveFieldType === 'unknown') {
      unknown += 1
      details.push({ fieldType: 'unknown', status: 'ignored', reason: 'Unknown field type' })
      continue
    }

    if (!element) {
      skipped += 1
      details.push({ fieldType: effectiveFieldType, status: 'skipped', reason: 'No matching DOM element' })
      continue
    }

    if (hasVisibleValue(element)) {
      skipped += 1
      details.push({ fieldType: effectiveFieldType, status: 'skipped', reason: 'Field already contains a value' })
      continue
    }

    const profileValue = getProfileValue(profile, effectiveFieldType)
    if (profileValue === null || profileValue === undefined || String(profileValue).trim() === '') {
      skipped += 1
      details.push({ fieldType: effectiveFieldType, status: 'skipped', reason: 'Profile value is empty' })
      continue
    }

    const nextValue = String(profileValue)

    if (element instanceof HTMLSelectElement) {
      const matched = setSelectValue(element, nextValue)
      if (!matched) {
        skipped += 1
        details.push({ fieldType: effectiveFieldType, status: 'skipped', reason: 'No matching option found' })
        continue
      }
    } else {
      setInputValue(element, nextValue)
    }

    filled += 1
    details.push({ fieldType: effectiveFieldType, status: 'filled' })
  }

  return { ok: true, filled, skipped, unknown, details }
}

function getPageFieldsForManualMapping(): PageFieldsResponse {
  const fieldEntries = collectFieldEntries()
  const detections = detectFields(fieldEntries.map((entry) => entry.metadata))

  const fields = detections.map((detection) => {
    const fieldEntry = fieldEntries[detection.metadata.index]
    const identifier = fieldEntry ? generateFieldIdentifier(fieldEntry.element) : `index:${detection.metadata.index}`
    const label = detection.metadata.labelText || detection.metadata.placeholder || detection.metadata.name || `Field ${detection.metadata.index + 1}`

    return {
      fieldIdentifier: identifier,
      label,
      detectedFieldType: detection.fieldType,
      confidence: detection.confidence,
      metadata: {
        id: detection.metadata.id,
        name: detection.metadata.name,
        autocomplete: detection.metadata.autocomplete,
        inputType: detection.metadata.inputType,
        tagName: detection.metadata.tagName,
      },
    }
  })

  return { ok: true, fields }
}

async function buildAutofillPreview(): Promise<AutofillPreviewResponse> {
  const profile = await getProfile()
  const fieldEntries = collectFieldEntries()
  const manualMap = await getManualMappingOverrides()
  const detections = detectFields(fieldEntries.map((entry) => entry.metadata))
  const fields: AutofillPreviewResponse['fields'] = []

  for (const detection of detections) {
    const fieldEntry = fieldEntries[detection.metadata.index]
    const element = fieldEntry?.element
    const fieldIdentifier = element ? generateFieldIdentifier(element) : `index:${detection.metadata.index}`
    const label = detection.metadata.labelText || detection.metadata.placeholder || detection.metadata.name || `Field ${detection.metadata.index + 1}`
    const mappedFieldType = manualMap.get(fieldIdentifier)
    const effectiveFieldType = mappedFieldType ?? detection.fieldType

    if (effectiveFieldType === 'unknown') {
      fields.push({
        fieldIdentifier,
        fieldType: 'unknown',
        label,
        status: 'unknown',
        source: 'unknown',
        confidence: detection.confidence,
        value: null,
        reason: 'Unknown field',
      })
      continue
    }

    const hasExistingValue = Boolean(element && hasVisibleValue(element))
    if (hasExistingValue) {
      fields.push({
        fieldIdentifier,
        fieldType: effectiveFieldType,
        label,
        status: 'alreadyFilled',
        source: mappedFieldType ? 'manual' : 'profile',
        confidence: detection.confidence,
        value: null,
        reason: 'Already filled — will not overwrite',
      })
      continue
    }

    const profileValue = getProfileValue(profile, effectiveFieldType)
    if (profileValue === null || profileValue === undefined || String(profileValue).trim() === '') {
      fields.push({
        fieldIdentifier,
        fieldType: effectiveFieldType,
        label,
        status: 'missingProfileValue',
        source: mappedFieldType ? 'manual' : 'profile',
        confidence: detection.confidence,
        value: null,
        reason: 'No profile value',
      })
      continue
    }

    const status: AutofillPreviewResponse['fields'][number]['status'] = mappedFieldType ? 'manualMapping' : 'ready'
    const displayValue = String(profileValue)

    fields.push({
      fieldIdentifier,
      fieldType: effectiveFieldType,
      label,
      status,
      source: mappedFieldType ? 'manual' : 'profile',
      confidence: detection.confidence,
      value: displayValue,
      reason: mappedFieldType ? 'Manual mapping applied' : 'Ready to fill',
    })
  }

  const readyCount = fields.filter((field) => field.status === 'ready' || field.status === 'manualMapping').length
  const skippedCount = fields.filter((field) => field.status === 'skipped' || field.status === 'unknown' || field.status === 'missingProfileValue').length
  const warningCount = fields.filter((field) => field.status === 'alreadyFilled').length

  return { ok: true, fields, readyCount, skippedCount, warningCount }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SCAN_PAGE') {
    try {
      const fields = detectFields(collectFieldEntries().map((entry) => entry.metadata))
      logDetections(fields)
      sendResponse({ ok: true, fields })
      return false
    } catch (error) {
      console.error('Job Agent: field detection failed.', error)
      sendResponse({ ok: false, fields: [], error: 'Field detection failed.' })
      return false
    }
  }

  if (message?.type === 'autofill-page') {
    void autofillPage().then((response) => sendResponse(response)).catch((error) => {
      console.error('Job Agent: autofill failed.', error)
      sendResponse({ ok: false, filled: 0, skipped: 0, unknown: 0, details: [], error: 'Autofill failed.' })
    })
    return true
  }

  if (message?.type === 'preview-autofill') {
    void buildAutofillPreview().then((response) => sendResponse(response)).catch((error) => {
      console.error('Job Agent: autofill preview failed.', error)
      sendResponse({ ok: false, fields: [], readyCount: 0, skippedCount: 0, warningCount: 0, error: 'Autofill preview failed.' })
    })
    return true
  }

  if (message?.type === 'confirm-autofill') {
    void autofillPage().then((response) => sendResponse(response)).catch((error) => {
      console.error('Job Agent: confirmed autofill failed.', error)
      sendResponse({ ok: false, filled: 0, skipped: 0, unknown: 0, details: [], error: 'Confirmed autofill failed.' })
    })
    return true
  }

  if (message?.type === 'get-page-fields') {
    try {
      const response = getPageFieldsForManualMapping()
      sendResponse(response)
      return false
    } catch (error) {
      console.error('Job Agent: page field lookup failed.', error)
      sendResponse({ ok: false, fields: [], error: 'Page field lookup failed.' })
      return false
    }
  }

  if (message?.type === 'save-manual-mapping') {
    void (async () => {
      try {
        const fieldType = message.fieldType as FieldType
        const mapping = await saveManualMapping({
          fieldIdentifier: message.fieldIdentifier,
          fieldType,
          label: message.label ?? message.fieldIdentifier,
          createdAt: new Date().toISOString(),
        })
        sendResponse({ ok: true, mappings: [mapping] })
      } catch (error) {
        console.error('Job Agent: save manual mapping failed.', error)
        sendResponse({ ok: false, mappings: [], error: 'Manual mapping could not be saved.' })
      }
    })()
    return true
  }

  if (message?.type === 'delete-manual-mapping') {
    void (async () => {
      try {
        await deleteManualMapping(message.fieldIdentifier)
        sendResponse({ ok: true, mappings: [] })
      } catch (error) {
        console.error('Job Agent: delete manual mapping failed.', error)
        sendResponse({ ok: false, mappings: [], error: 'Manual mapping could not be deleted.' })
      }
    })()
    return true
  }

  if (message?.type === 'get-manual-mappings') {
    void (async () => {
      try {
        const mappings = await getManualMappings()
        sendResponse({ ok: true, mappings })
      } catch (error) {
        console.error('Job Agent: manual mappings lookup failed.', error)
        sendResponse({ ok: false, mappings: [], error: 'Manual mappings lookup failed.' })
      }
    })()
    return true
  }

  return false
})

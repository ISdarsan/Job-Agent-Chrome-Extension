import { detectFields } from '../field-detector/detector'
import type { FormFieldMetadata, ScanPageRequest, ScanPageResponse } from '../field-detector/types'

declare const chrome: {
  runtime: {
    onMessage: {
      addListener(
        listener: (
          message: ScanPageRequest,
          sender: unknown,
          sendResponse: (response: ScanPageResponse) => void,
        ) => undefined,
      ): void
    }
  }
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

function collectFormMetadata(): FormFieldMetadata[] {
  const elements = [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')]
  return elements
    .filter((element) => {
      const input = element instanceof HTMLInputElement ? element : null
      return !element.disabled && input?.type !== 'hidden' && Boolean(element.getClientRects().length)
    })
    .map((element, index) => getMetadata(element, index))
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'scan-page') return undefined

  const fields = detectFields(collectFormMetadata())
  logDetections(fields)
  sendResponse({ ok: true, fields })
  return undefined
})

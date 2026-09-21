import type { AutofillPageResponse, AutofillPreviewResponse, FieldDetectionMessage, ManualMappingsResponse, PageFieldsResponse, PageScanResponse } from './field-detector/messages'

type ManualMappingMessage =
  | { type: 'get-page-fields' }
  | { type: 'save-manual-mapping'; fieldIdentifier: string; fieldType: string; label?: string }
  | { type: 'delete-manual-mapping'; fieldIdentifier: string }
  | { type: 'get-manual-mappings' }

type PreviewMessage = { type: 'preview-autofill' }

type BackgroundResponse = PageScanResponse | AutofillPageResponse | AutofillPreviewResponse | PageFieldsResponse | ManualMappingsResponse

declare const chrome: {
  runtime: {
    onInstalled: {
      addListener(callback: () => void): void
    }
    onMessage: {
      addListener(
        listener: (
          message: FieldDetectionMessage,
          sender: unknown,
          sendResponse: (response: BackgroundResponse) => void,
        ) => boolean | undefined,
      ): void
    }
  }
  sidePanel: {
    setPanelBehavior(options: { openPanelOnActionClick: boolean }): Promise<void>
  }
  tabs: {
    query(queryInfo: { active: boolean }): Promise<Array<{ id?: number; url?: string; windowId?: number }>>
    sendMessage(
      tabId: number,
      message: {
        type: 'SCAN_PAGE' | 'autofill-page' | 'preview-autofill' | 'confirm-autofill' | 'get-page-fields' | 'save-manual-mapping' | 'delete-manual-mapping' | 'get-manual-mappings'
        fieldIdentifier?: string
        fieldType?: string
        label?: string
      },
    ): Promise<
      BackgroundResponse
      | {
          ok: boolean
          filled: number
          skipped: number
          unknown: number
          details: Array<{ fieldType: string; status: 'filled' | 'skipped' | 'ignored'; reason?: string }>
          error?: string
          mappings?: Array<{ fieldIdentifier: string; fieldType: string; label?: string; createdAt?: string }>
          fields?: Array<{ fieldIdentifier: string; label: string; detectedFieldType: string; confidence: number; metadata: Record<string, string> }>
          readyCount?: number
          skippedCount?: number
          warningCount?: number
        }
    >
  }
  windows: {
    getAll(queryInfo?: { windowTypes?: Array<'normal'> }): Promise<Array<{ id?: number }>>
  }
}

function isScannablePageUrl(url?: string): boolean {
  return Boolean(url && (url.startsWith('http://') || url.startsWith('https://')))
}

function isNormalWebpageTab(tab: { id?: number; url?: string; windowId?: number }): boolean {
  return Boolean(tab.id && isScannablePageUrl(tab.url))
}

async function findActiveNormalWebpageTab(): Promise<{ id: number } | null> {
  const activeTabs = await chrome.tabs.query({ active: true })
  const browserWindowIds = new Set((await chrome.windows.getAll({ windowTypes: ['normal'] })).map((window) => window.id).filter((id): id is number => typeof id === 'number'))

  const candidate = activeTabs.find((tab) => {
    if (!tab.id || !browserWindowIds.has(tab.windowId ?? -1)) {
      return false
    }
    return isNormalWebpageTab(tab)
  })

  return candidate?.id ? { id: candidate.id } : null
}

async function handlePageScanRequest(sendResponse: (response: PageScanResponse) => void): Promise<void> {
  try {
    const tab = await findActiveNormalWebpageTab()

    if (!tab) {
      sendResponse({ ok: false, fields: [], error: 'No active webpage tab.' })
      return
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE' })
      sendResponse(response as PageScanResponse)
      return
    } catch (error) {
      console.error('Job Agent: content script is unavailable.', error)
      sendResponse({ ok: false, fields: [], error: 'Content script is unavailable.' })
      return
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Job Agent: page scan failed.', error)
    sendResponse({ ok: false, fields: [], error: `Field detection failed: ${message}` })
  }
}

async function handleAutofillRequest(sendResponse: (response: { ok: boolean; filled: number; skipped: number; unknown: number; details: Array<{ fieldType: string; status: 'filled' | 'skipped' | 'ignored'; reason?: string }>; error?: string }) => void): Promise<void> {
  try {
    const tab = await findActiveNormalWebpageTab()

    if (!tab) {
      sendResponse({ ok: false, filled: 0, skipped: 0, unknown: 0, details: [], error: 'No active webpage tab.' })
      return
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'autofill-page' })
      sendResponse(response as { ok: boolean; filled: number; skipped: number; unknown: number; details: Array<{ fieldType: string; status: 'filled' | 'skipped' | 'ignored'; reason?: string }>; error?: string })
      return
    } catch (error) {
      console.error('Job Agent: autofill content script is unavailable.', error)
      sendResponse({ ok: false, filled: 0, skipped: 0, unknown: 0, details: [], error: 'Content script is unavailable.' })
      return
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Job Agent: autofill failed.', error)
    sendResponse({ ok: false, filled: 0, skipped: 0, unknown: 0, details: [], error: `Autofill failed: ${message}` })
  }
}

async function handleManualMappingRequest(
  message: ManualMappingMessage,
  sendResponse: (response: BackgroundResponse | { ok: boolean; mappings: Array<{ fieldIdentifier: string; fieldType: string; label?: string; createdAt?: string }>; error?: string; fields?: Array<{ fieldIdentifier: string; label: string; detectedFieldType: string; confidence: number; metadata: Record<string, string> }> }) => void,
): Promise<void> {
  try {
    const tab = await findActiveNormalWebpageTab()

    if (!tab) {
      sendResponse({ ok: false, mappings: [], error: 'No active webpage tab.' })
      return
    }

    const response = await chrome.tabs.sendMessage(tab.id, message)
    sendResponse(response as BackgroundResponse | { ok: boolean; mappings: Array<{ fieldIdentifier: string; fieldType: string; label?: string; createdAt?: string }>; error?: string; fields?: Array<{ fieldIdentifier: string; label: string; detectedFieldType: string; confidence: number; metadata: Record<string, string> }> })
  } catch (error) {
    console.error('Job Agent: manual mapping content script is unavailable.', error)
    sendResponse({ ok: false, mappings: [], error: 'Content script is unavailable.' })
  }
}

async function handlePreviewRequest(
  message: PreviewMessage,
  sendResponse: (response: AutofillPreviewResponse | { ok: false; fields: []; readyCount: 0; skippedCount: 0; warningCount: 0; error: string }) => void,
): Promise<void> {
  try {
    const tab = await findActiveNormalWebpageTab()

    if (!tab) {
      sendResponse({ ok: false, fields: [], readyCount: 0, skippedCount: 0, warningCount: 0, error: 'No active webpage tab.' })
      return
    }

    const response = await chrome.tabs.sendMessage(tab.id, message)
    sendResponse(response as AutofillPreviewResponse)
  } catch (error) {
    console.error('Job Agent: autofill preview content script is unavailable.', error)
    sendResponse({ ok: false, fields: [], readyCount: 0, skippedCount: 0, warningCount: 0, error: 'Content script is unavailable.' })
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'request-page-scan') {
    void handlePageScanRequest(sendResponse)
    return true
  }

  if (message.type === 'autofill-page' || message.type === 'confirm-autofill') {
    void handleAutofillRequest(sendResponse)
    return true
  }

  if (
    message.type === 'get-page-fields'
    || message.type === 'save-manual-mapping'
    || message.type === 'delete-manual-mapping'
    || message.type === 'get-manual-mappings'
  ) {
    void handleManualMappingRequest(message as ManualMappingMessage, sendResponse)
    return true
  }

  if (message.type === 'preview-autofill') {
    void handlePreviewRequest({ type: 'preview-autofill' }, sendResponse)
    return true
  }

  return false
})

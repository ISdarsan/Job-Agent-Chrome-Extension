import type { FieldDetectionMessage } from './field-detector/messages'
import type { PageScanResponse } from './field-detector/messages'

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
          sendResponse: (response: PageScanResponse) => void,
        ) => boolean | undefined,
      ): void
    }
  }
  sidePanel: {
    setPanelBehavior(options: { openPanelOnActionClick: boolean }): Promise<void>
  }
  tabs: {
    query(queryInfo: { active: boolean; lastFocusedWindow: boolean }): Promise<Array<{ id?: number }>>
    sendMessage(tabId: number, message: { type: 'scan-page' }): Promise<PageScanResponse>
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'request-page-scan') return undefined

  void chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(async ([tab]) => {
    if (tab?.id === undefined) {
      sendResponse({ ok: false, fields: [], error: 'No active tab is available to scan.' })
      return
    }

    try {
      sendResponse(await chrome.tabs.sendMessage(tab.id, { type: 'scan-page' }))
    } catch {
      sendResponse({ ok: false, fields: [], error: 'This page cannot be scanned.' })
    }
  })
  return true
})

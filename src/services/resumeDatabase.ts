const DATABASE_NAME = 'JobAgentDB'
const DATABASE_VERSION = 1
const RESUME_STORE = 'resumes'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(RESUME_STORE)) {
        request.result.createObjectStore(RESUME_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open resume database.'))
  })
}

export async function saveResumeFile(id: string, file: Blob): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(RESUME_STORE, 'readwrite')
    transaction.objectStore(RESUME_STORE).put(file, id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save resume file.'))
  })
  database.close()
}

export async function getResumeFile(id: string): Promise<Blob | null> {
  const database = await openDatabase()
  const file = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(RESUME_STORE, 'readonly').objectStore(RESUME_STORE).get(id)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error ?? new Error('Unable to read resume file.'))
  })
  database.close()
  return file ?? null
}

export async function deleteResumeFile(id: string): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(RESUME_STORE, 'readwrite')
    transaction.objectStore(RESUME_STORE).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to delete resume file.'))
  })
  database.close()
}

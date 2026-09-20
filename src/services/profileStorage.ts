import { emptyProfile, type UserProfile } from '../types/profile'

const PROFILE_STORAGE_KEY = 'jobAgentProfile'

declare const chrome: {
  storage: {
    local: {
      get(keys: string[]): Promise<Record<string, unknown>>
      set(items: Record<string, unknown>): Promise<void>
      remove(keys: string[]): Promise<void>
    }
  }
}

type ProfileUpdates = {
  [Section in keyof UserProfile]?: Partial<UserProfile[Section]>
}

function mergeProfile(profile: UserProfile, updates: ProfileUpdates): UserProfile {
  return {
    personal: { ...profile.personal, ...updates.personal },
    location: { ...profile.location, ...updates.location },
    education: { ...profile.education, ...updates.education },
    professional: { ...profile.professional, ...updates.professional },
    jobPreferences: { ...profile.jobPreferences, ...updates.jobPreferences },
  }
}

function normalizeProfile(value: unknown): UserProfile | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const profile = value as Partial<UserProfile>
  return mergeProfile(emptyProfile, {
    personal: profile.personal ?? undefined,
    location: profile.location ?? undefined,
    education: profile.education ?? undefined,
    professional: profile.professional ?? undefined,
    jobPreferences: profile.jobPreferences ?? undefined,
  })
}

export async function getProfile(): Promise<UserProfile | null> {
  const result = await chrome.storage.local.get([PROFILE_STORAGE_KEY])
  return normalizeProfile(result[PROFILE_STORAGE_KEY])
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await chrome.storage.local.set({ [PROFILE_STORAGE_KEY]: profile })
}

export async function updateProfile(updates: ProfileUpdates): Promise<UserProfile> {
  const currentProfile = (await getProfile()) ?? emptyProfile
  const updatedProfile = mergeProfile(currentProfile, updates)
  await saveProfile(updatedProfile)
  return updatedProfile
}

export async function clearProfile(): Promise<void> {
  await chrome.storage.local.remove([PROFILE_STORAGE_KEY])
}

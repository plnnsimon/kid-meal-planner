// Custom Storage adapter that persists Supabase session tokens in cookies.
// Supabase calls setItem/getItem/removeItem on this object to read and write the session.
//
// Cookie expiry is controlled by setSessionPersistence():
//   - undefined  → session cookie (cleared when browser closes)
//   - number     → persistent cookie with that many days until expiry

let expiryDays: number | undefined = 60

/** Call this before signing in to control how long the cookie lives. */
export function setSessionPersistence(days: number | undefined) {
  expiryDays = days
}

function getCookie(name: string): string | null {
  const key = encodeURIComponent(name)
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string) {
  const key = encodeURIComponent(name)
  const val = encodeURIComponent(value)
  let cookie = `${key}=${val}; path=/; SameSite=Strict`
  if (expiryDays !== undefined) {
    const exp = new Date(Date.now() + expiryDays * 864e5)
    cookie += `; expires=${exp.toUTCString()}`
  }
  document.cookie = cookie
}

function removeCookie(name: string) {
  const key = encodeURIComponent(name)
  document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`
}

export const cookieStorage: Storage = {
  get length(): number {
    return document.cookie ? document.cookie.split(';').filter(Boolean).length : 0
  },
  key(index: number): string | null {
    const cookies = document.cookie.split(';').filter(Boolean)
    const c = cookies[index]?.trim()
    return c ? decodeURIComponent(c.split('=')[0]) : null
  },
  getItem(key: string): string | null {
    return getCookie(key)
  },
  setItem(key: string, value: string): void {
    setCookie(key, value)
  },
  removeItem(key: string): void {
    removeCookie(key)
  },
  clear(): void {
    document.cookie.split(';').filter(Boolean).forEach(c => {
      const k = c.split('=')[0].trim()
      if (k) removeCookie(decodeURIComponent(k))
    })
  },
}

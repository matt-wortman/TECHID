import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const username = process.env.BASIC_AUTH_USERNAME
const password = process.env.BASIC_AUTH_PASSWORD

function decodeBase64(value: string) {
  if (typeof atob === 'function') {
    return atob(value)
  }
  return Buffer.from(value, 'base64').toString('utf-8')
}

export function middleware(request: NextRequest) {
  if (!username || !password) {
    return new Response('Authentication configuration missing', {
      status: 500,
    })
  }

  const authorization = request.headers.get('authorization')

  if (authorization) {
    const [scheme, encoded] = authorization.split(' ')

    if (scheme?.toLowerCase() === 'basic' && encoded) {
      const decoded = decodeBase64(encoded)
      const separatorIndex = decoded.indexOf(':')

      if (separatorIndex !== -1) {
        const providedUser = decoded.slice(0, separatorIndex)
        const providedPass = decoded.slice(separatorIndex + 1)

        if (providedUser === username && providedPass === password) {
          return NextResponse.next()
        }
      }
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Tech Triage"',
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
}

import assert from 'node:assert/strict'
import test from 'node:test'

import { containsHighConfidenceSecret } from '../src/assistant/schema.js'

const opaque = (seed: string, length = 32): string => seed.repeat(Math.ceil(length / seed.length)).slice(0, length)
const label = (...parts: string[]): string => parts.join('_')
const compact = (...parts: string[]): string => parts.join('')

const awsSecretLabel = label('AWS', 'SECRET', 'ACCESS', 'KEY')
const awsAccessLabel = label('AWS', 'ACCESS', 'KEY', 'ID')
const sessionTokenLabel = label('session', 'token')
const oauthAccessLabel = label('oauth', 'access', 'token')
const oauthRefreshLabel = label('oauth', 'refresh', 'token')
const jwtFixture = [
  compact('eyJ', 'hbGciOiJIUzI1NiJ9'),
  compact('eyJ', 'zdWIiOiJmaXh0dXJlLXVzZXIifQ'),
  compact('signature', '123456'),
].join('.')

const secretFixtures = [
  `Bearer ${compact('eyOpaque', 'AccessToken', 'Value', opaque('1234567890', 10))}`,
  `Basic ${compact('dXNl', 'cjpw', 'YXNz', 'd29y', 'ZA==')}`,
  `${awsSecretLabel}=${opaque('AbCdEf0123456789', 40)}`,
  `${awsAccessLabel}=${compact('AKIA', 'IOSF', 'ODNN', '7EXAMPLE')}`,
  compact('github', '_pat_', '11AA', '22BB', '33CC', '44DD', '55EE', '66FF77'),
  compact('gh', 'p_', opaque('1234567890abcdefghijklmnopqrstuv')),
  compact('sk', '-proj-', opaque('1234567890abcdefghijklmnopqrstuv')),
  jwtFixture,
  compact('-----BEGIN ', 'PRIVATE KEY-----'),
  `Cookie: session_id=${opaque('0123456789abcdef')}`,
  `${sessionTokenLabel}=${opaque('0123456789abcdef')}`,
  `${oauthAccessLabel}=${opaque('0123456789abcdef')}`,
  `${oauthRefreshLabel}=${opaque('0123456789abcdef')}`,
  `refresh token: ${opaque('0123456789abcdef')}`,
  `API key: ${opaque('0123456789abcdef')}`,
  `X-API-Key: ${opaque('0123456789abcdef')}`,
  `Authorization Bearer ${opaque('0123456789abcdef')}`,
  `Proxy-Authorization: Basic ${compact('dXNl', 'cjpw', 'YXNz', 'd29y', 'ZA==')}`,
]

const safeTelecomFixtures = [
  'ACME tiene permanencia hasta el 10 de marzo de 2027.',
  'El plan Basic Empresas incluye 20 GB y llamadas ilimitadas.',
  'La sesión comercial con Vodafone está programada para mañana.',
  'El token de renovación todavía no está disponible.',
  'La cabecera Authorization debe configurarse en el proveedor.',
  'La rotación de API key está pendiente y no se muestra ningún valor.',
  'CIF B12345678, 24 líneas activas y 3 servicios de fibra.',
  'AWS ofrece una integración posible, pero no está configurada.',
  'El cliente pide revisar cookie y privacidad antes de la reunión.',
  'Bearer Telecom figura como nombre comercial en esta nota sintética.',
] as const

test('detects high-confidence secret material inside allowed string values', () => {
  for (const fixture of secretFixtures) {
    assert.equal(containsHighConfidenceSecret({ note: fixture }), true, fixture)
  }
})

test('does not classify ordinary telecom business text as secret material', () => {
  for (const fixture of safeTelecomFixtures) {
    assert.equal(containsHighConfidenceSecret({ note: fixture }), false, fixture)
  }
})

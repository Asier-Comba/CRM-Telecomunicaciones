import assert from 'node:assert/strict'
import test from 'node:test'

import { containsHighConfidenceSecret } from '../src/assistant/schema.js'

const secretFixtures = [
  'Bearer eyOpaqueAccessTokenValue1234567890',
  'Basic dXNlcjpwYXNzd29yZA==',
  'AWS_SECRET_ACCESS_KEY=AbCdEf0123456789AbCdEf0123456789AbCdEf01',
  'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
  'github_pat_11AA22BB33CC44DD55EE66FF77',
  'ghp_1234567890abcdefghijklmnopqrstuv',
  'sk-proj-1234567890abcdefghijklmnopqrstuv',
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmaXh0dXJlLXVzZXIifQ.signature123456',
  '-----BEGIN PRIVATE KEY-----',
  'Cookie: session_id=0123456789abcdef0123456789abcdef',
  'session_token=0123456789abcdef0123456789abcdef',
  'oauth_access_token=0123456789abcdef0123456789abcdef',
  'oauth_refresh_token=0123456789abcdef0123456789abcdef',
  'refresh token: 0123456789abcdef0123456789abcdef',
  'API key: 0123456789abcdef0123456789abcdef',
  'X-API-Key: 0123456789abcdef0123456789abcdef',
  'Authorization Bearer 0123456789abcdef0123456789abcdef',
  'Proxy-Authorization: Basic dXNlcjpwYXNzd29yZA==',
] as const

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

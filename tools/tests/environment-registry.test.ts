// Uso: node --import ./tools/casino-tests/register.mjs tools/tests/environment-registry.test.ts
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial } from 'three'

Object.assign(globalThis, { window: { location: { search: '' } } })
const { registerGlowColor, registerGlowEmissive, registerWet, applyRegistries } = await import('../../src/game/world/environment/registry.ts')
const { env } = await import('../../src/game/world/environment/envState.ts')
env.lights = 1
env.wet = 1
const wet = { roughWet: 0.2, ccWet: 0.8, dark: 0.1 }

test('materiais ativos continuam reagindo ao ambiente sem registros duplicados', () => {
  const mat = new MeshPhysicalMaterial({ roughness: 0.7, clearcoat: 0.1 })
  registerWet(mat, wet)
  registerWet(mat, { ...wet, roughWet: 0.9 })
  registerGlowEmissive(mat, 0.1, 2)
  registerGlowEmissive(mat, 0.1, 9)
  applyRegistries()
  assert.equal(mat.roughness, 0.2)
  assert.equal(mat.clearcoat, 0.8)
  assert.equal(mat.emissiveIntensity, 2)
  mat.dispose()
})

test('dispose remove o material de todos os registros, inclusive chuva e brilho juntos', () => {
  for (let i = 0; i < 20; i++) {
    const mat = new MeshPhysicalMaterial()
    registerWet(mat, wet)
    registerGlowEmissive(mat, 0.1, 2)
    mat.dispose()
    mat.roughness = 0.43
    mat.clearcoat = 0.12
    mat.emissiveIntensity = 0.37
    mat.color.setScalar(0.5)
    applyRegistries()
    assert.equal(mat.roughness, 0.43, 'chuva nao deve atualizar material descartado')
    assert.equal(mat.clearcoat, 0.12)
    assert.equal(mat.emissiveIntensity, 0.37, 'brilho nao deve atualizar material descartado')
    assert.equal(mat.color.r, 0.5)
  }
})

test('dispose tambem limpa materiais registrados apenas como chuva ou brilho', () => {
  const glow = new MeshBasicMaterial()
  const ground = new MeshStandardMaterial()
  registerGlowColor(glow, 0.8, 1.4)
  registerWet(ground, wet)
  glow.dispose()
  ground.dispose()
  glow.color.setScalar(0.4)
  ground.roughness = 0.6
  applyRegistries()
  assert.equal(glow.color.r, 0.4)
  assert.equal(ground.roughness, 0.6)
})

test('um material pode ser registrado novamente depois de dispose', () => {
  const mat = new MeshBasicMaterial()
  registerGlowColor(mat, 0.8, 1.4)
  mat.dispose()
  registerGlowColor(mat, 0.2, 3)
  applyRegistries()
  assert.equal(mat.color.r, 3)
  mat.dispose()
  mat.color.setScalar(0.5)
  applyRegistries()
  assert.equal(mat.color.r, 0.5)
})

import { describe, expect, it } from 'vitest'

describe('vitest infrastructure', () => {
  it('runs basic assertions', () => {
    expect(1 + 1).toBe(2)
  })

  it('supports async tests', async () => {
    const value = await Promise.resolve('vantage')
    expect(value).toBe('vantage')
  })
})

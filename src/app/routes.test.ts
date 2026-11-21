import { describe, expect, it } from 'vitest'
import { caseTabs, routes } from './routes'

describe('routes', () => {
  it('builds case addresses and encodes the identifier', () => {
    expect(routes.caseTab('a/b ?', caseTabs.analysis)).toBe(
      '/sprawy/a%2Fb%20%3F/analiza',
    )
    expect(routes.casePattern).toBe('/sprawy/:caseId')
    expect(routes.verification).toBe(`${routes.upload}/weryfikacja`)
  })
})

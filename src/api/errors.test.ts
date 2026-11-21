import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { getApiErrorKind } from './errors'

const failWith = (status: number) =>
  new AxiosError('Failed', undefined, undefined, null, {
    data: {},
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

describe('getApiErrorKind', () => {
  it.each([
    [400, 'invalid'],
    [401, 'unauthorized'],
    [409, 'conflict'],
    [413, 'tooLarge'],
    [415, 'unsupported'],
    [500, 'unknown'],
  ])('maps %s to %s', (status, kind) => {
    expect(getApiErrorKind(failWith(status))).toBe(kind)
  })

  it('treats errors without a response as unknown', () => {
    expect(getApiErrorKind(new Error('offline'))).toBe('unknown')
    expect(getApiErrorKind(undefined)).toBe('unknown')
  })
})

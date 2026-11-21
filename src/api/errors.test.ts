import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { getApiErrorCode, getApiErrorKind } from './errors'

const failWith = (status: number, data: unknown = {}) =>
  new AxiosError('Failed', undefined, undefined, null, {
    data,
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

describe('getApiErrorCode', () => {
  it('reads the code of an error body', () => {
    expect(
      getApiErrorCode(failWith(409, { code: 'SEQUENCE_NUMBER_TAKEN' })),
    ).toBe('SEQUENCE_NUMBER_TAKEN')
  })

  it('ignores bodies without a string code and non-HTTP errors', () => {
    expect(getApiErrorCode(failWith(409, { code: 5 }))).toBeUndefined()
    expect(getApiErrorCode(failWith(409, 'text'))).toBeUndefined()
    expect(getApiErrorCode(failWith(409, null))).toBeUndefined()
    expect(getApiErrorCode(new Error('offline'))).toBeUndefined()
  })
})

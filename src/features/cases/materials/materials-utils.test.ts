import { describe, expect, it } from 'vitest'
import { MAX_MATERIAL_SIZE, validateMaterialFile } from './materials-utils'

const file = (name: string, type: string, size = 10) => {
  const result = new File(['x'], name, { type })
  Object.defineProperty(result, 'size', { value: size })
  return result
}

describe('validateMaterialFile', () => {
  it('accepts pdf, docx and txt', () => {
    expect(validateMaterialFile(file('a.pdf', 'application/pdf'))).toBeNull()
    expect(validateMaterialFile(file('a.TXT', 'text/plain'))).toBeNull()
    expect(
      validateMaterialFile(
        file(
          'a.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ),
    ).toBeNull()
  })

  it('accepts a file without a reported MIME type', () => {
    expect(validateMaterialFile(file('a.pdf', ''))).toBeNull()
  })

  it('rejects unknown extensions and mismatched MIME types', () => {
    expect(
      validateMaterialFile(file('a.exe', 'application/x-msdownload')),
    ).toBe('type')
    expect(validateMaterialFile(file('a.pdf', 'text/plain'))).toBe('type')
    expect(validateMaterialFile(file('noextension', ''))).toBe('type')
  })

  it('rejects empty and oversized files', () => {
    expect(validateMaterialFile(file('a.pdf', 'application/pdf', 0))).toBe(
      'empty',
    )
    expect(
      validateMaterialFile(
        file('a.pdf', 'application/pdf', MAX_MATERIAL_SIZE + 1),
      ),
    ).toBe('size')
  })
})

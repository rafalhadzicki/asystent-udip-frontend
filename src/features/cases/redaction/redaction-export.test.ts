import { describe, expect, it } from 'vitest'
import { buildExportBlob } from './redaction-export'

const readBytes = (blob: Blob) =>
  new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })

describe('buildExportBlob', () => {
  it('builds a plain text file', async () => {
    const blob = await buildExportBlob('a\nb', 'txt')
    expect(blob.type).toBe('text/plain;charset=utf-8')
    expect(new TextDecoder().decode(await readBytes(blob))).toBe('a\nb')
  })

  it('builds a DOCX file (zip container with the text inside)', async () => {
    const blob = await buildExportBlob('pierwsza\ndruga', 'docx')
    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    const bytes = await readBytes(blob)
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK')
  })
})

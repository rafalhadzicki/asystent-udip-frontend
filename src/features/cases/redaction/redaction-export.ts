export const exportFormats = ['txt', 'docx'] as const
export type ExportFormat = (typeof exportFormats)[number]

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const buildDocx = async (text: string): Promise<Blob> => {
  // Loaded on demand: the library is only needed when exporting to DOCX.
  const { Document, Packer, Paragraph, TextRun } = await import('docx')
  const document = new Document({
    sections: [
      {
        children: text
          .split(/\r?\n/)
          .map((line) => new Paragraph({ children: [new TextRun(line)] })),
      },
    ],
  })
  const blob = await Packer.toBlob(document)
  return new Blob([blob], { type: DOCX_MIME })
}

export const buildExportBlob = (
  text: string,
  format: ExportFormat,
): Promise<Blob> =>
  format === 'docx'
    ? buildDocx(text)
    : Promise.resolve(new Blob([text], { type: 'text/plain;charset=utf-8' }))

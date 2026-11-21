export const MAX_MATERIAL_SIZE = 25 * 1024 * 1024

const FILE_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  txt: ['text/plain'],
}

export type MaterialFileError = 'type' | 'size' | 'empty'

// Checks extension, MIME type (when the browser reports one) and size.
export const validateMaterialFile = (file: File): MaterialFileError | null => {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const allowedTypes = FILE_TYPES[extension]
  if (!allowedTypes || (file.type && !allowedTypes.includes(file.type)))
    return 'type'
  if (file.size > MAX_MATERIAL_SIZE) return 'size'
  if (!file.size) return 'empty'
  return null
}

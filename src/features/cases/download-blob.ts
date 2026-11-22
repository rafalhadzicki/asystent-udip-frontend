export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.append(anchor)
    try {
      anchor.click()
    } finally {
      anchor.remove()
    }
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

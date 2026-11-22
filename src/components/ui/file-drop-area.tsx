import { useState, type DragEvent, type ReactNode } from 'react'
import { alpha, styled } from '@mui/material/styles'

const Area = styled('div')(({ theme }) => ({
  '&[data-dragging="true"]': {
    outline: `2px dashed ${theme.palette.primary.main}`,
    outlineOffset: 4,
    backgroundColor: alpha(theme.palette.primary.main, 0.06),
  },
}))

type FileDropAreaProps = {
  onFiles: (files: File[]) => void
  disabled?: boolean
  className?: string
  'aria-busy'?: boolean
  children: ReactNode
}

const hasFiles = (event: DragEvent) =>
  Array.from(event.dataTransfer.types).includes('Files')

// Wraps a region so that files dropped on it are passed to onFiles.
export const FileDropArea = ({
  onFiles,
  disabled = false,
  className,
  'aria-busy': ariaBusy,
  children,
}: FileDropAreaProps) => {
  const [dragging, setDragging] = useState(false)

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(event)) return
    event.preventDefault()
    setDragging(true)
  }
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragging(false)
    }
  }
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(event)) return
    event.preventDefault()
    setDragging(false)
    onFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <Area
      className={className}
      aria-busy={ariaBusy}
      data-dragging={dragging}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
    </Area>
  )
}

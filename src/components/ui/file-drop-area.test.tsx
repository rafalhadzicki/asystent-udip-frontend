import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FileDropArea } from './file-drop-area'

const file = new File(['x'], 'a.txt', { type: 'text/plain' })
const dataTransfer = { types: ['Files'], files: [file] }

describe('FileDropArea', () => {
  it('passes dropped files and highlights while dragging', () => {
    const onFiles = vi.fn()
    render(
      <FileDropArea onFiles={onFiles}>
        <p>strefa</p>
      </FileDropArea>,
    )
    const area = screen.getByText('strefa').parentElement as HTMLElement
    fireEvent.dragOver(area, { dataTransfer })
    expect(area).toHaveAttribute('data-dragging', 'true')
    fireEvent.drop(area, { dataTransfer })
    expect(area).toHaveAttribute('data-dragging', 'false')
    expect(onFiles).toHaveBeenCalledWith([file])
  })

  it('ignores drops when disabled', () => {
    const onFiles = vi.fn()
    render(
      <FileDropArea onFiles={onFiles} disabled>
        <p>strefa</p>
      </FileDropArea>,
    )
    fireEvent.drop(screen.getByText('strefa').parentElement as HTMLElement, {
      dataTransfer,
    })
    expect(onFiles).not.toHaveBeenCalled()
  })
})

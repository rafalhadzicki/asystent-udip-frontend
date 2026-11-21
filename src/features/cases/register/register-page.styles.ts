import { Paper } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import styled from 'styled-components'
import type { CaseStatus } from '@/api/cases/cases.schemas'
type Urgency = 'overdue' | 'today' | 'tomorrow' | 'normal' | 'completed'

const Page = styled.div`
  color: #172b43;
  max-width: 1600px;
  margin: 0 auto;
`

const Surface = styled(Paper)`
  && {
    border: 1px solid #e1e7ee;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(22, 43, 67, 0.035);
  }
`

const Badge = styled.span<{ $tone: Urgency }>`
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  padding: 5px 9px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: ${({ $tone }) =>
    ({
      overdue: '#a51d27',
      today: '#975000',
      tomorrow: '#1755b3',
      normal: '#506174',
      completed: '#657486',
    })[$tone]};
  background: ${({ $tone }) =>
    ({
      overdue: '#fdebec',
      today: '#fff1df',
      tomorrow: '#eaf2ff',
      normal: '#f0f3f6',
      completed: '#f0f3f6',
    })[$tone]};
`

const Status = styled.span<{ $status: CaseStatus }>`
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  line-height: 1.4;
  &::before {
    content: '';
    flex: 0 0 7px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${({ $status }) =>
      ({
        NEW: '#3169cc',
        SENT_TO_DEPARTMENTS: '#d58a21',
        RESPONSE_PREPARED: '#745bc2',
        RESPONSE_SENT: '#7b8794',
      })[$status]};
  }
`

const CaseLink = styled(RouterLink)`
  color: #164b8e;
  font-weight: 700;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid #164b8e;
    outline-offset: 3px;
  }
`

export { Page, Surface, Badge, Status, CaseLink }

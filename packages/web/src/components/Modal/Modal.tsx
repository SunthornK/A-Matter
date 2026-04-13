import type { ReactNode } from 'react'
import styles from './Modal.module.css'

interface ModalProps {
  title: string
  body?: ReactNode
  actions?: ReactNode
  onBackdropClick?: () => void
}

export function Modal({ title, body, actions, onBackdropClick }: ModalProps) {
  return (
    <div className={styles.overlay} onClick={onBackdropClick}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>{title}</h2>
        {body && <div className={styles.body}>{body}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  )
}

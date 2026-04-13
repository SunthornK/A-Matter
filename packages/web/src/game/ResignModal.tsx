import { Modal } from '../components/Modal/Modal'
import { Button } from '../components/Button/Button'

interface ResignModalProps {
  emit: (event: string, data?: unknown) => void
  onClose: () => void
}

export function ResignModal({ emit, onClose }: ResignModalProps) {
  function handleConfirm() {
    emit('game:resign')
    onClose()
  }

  return (
    <Modal
      title="Resign game?"
      body="This will end the game immediately and count as a loss."
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirm}>Resign</Button>
        </>
      }
    />
  )
}

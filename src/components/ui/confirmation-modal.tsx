"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalTrigger,
} from "@/components/ui/modal"
import { AlertTriangle, Trash } from "lucide-react"
import { logger } from "@/lib/logger"

interface ConfirmationModalProps {
  children: React.ReactNode
  title: string
  description: string
  confirmText: string
  confirmationPhrase?: string
  onConfirm: () => void | Promise<void>
  variant?: "default" | "destructive"
  isLoading?: boolean
}

export function ConfirmationModal({
  children,
  title,
  description,
  confirmText,
  confirmationPhrase,
  onConfirm,
  variant = "default",
  isLoading = false,
}: ConfirmationModalProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const isConfirmationRequired = Boolean(confirmationPhrase)
  const canConfirm = isConfirmationRequired 
    ? inputValue.trim().toLowerCase() === confirmationPhrase?.toLowerCase()
    : true

  const handleConfirm = async () => {
    if (!canConfirm) return

    setIsProcessing(true)
    try {
      await onConfirm()
      setOpen(false)
      setInputValue("")
    } catch (error) {
      logger.error("Confirmation action failed:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setInputValue("")
    }
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalTrigger asChild>
        {children}
      </ModalTrigger>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <div className="flex items-center space-x-2">
            {variant === "destructive" ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            <ModalTitle>{title}</ModalTitle>
          </div>
          <ModalDescription className="text-left">
            {description}
          </ModalDescription>
        </ModalHeader>

        <div className="py-4">
          {isConfirmationRequired && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Type <span className="font-mono font-semibold">{confirmationPhrase}</span> to confirm:
              </p>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={confirmationPhrase}
                className={variant === "destructive" ? "border-destructive/50 focus:border-destructive" : ""}
              />
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isProcessing || isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={!canConfirm || isProcessing || isLoading}
          >
            {isProcessing || isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Processing...
              </>
            ) : (
              <>
                {variant === "destructive" && <Trash className="h-4 w-4 mr-2" />}
                {confirmText}
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
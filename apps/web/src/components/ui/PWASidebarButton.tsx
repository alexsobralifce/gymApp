import { useState, useRef, useEffect } from 'react'
import { SmartphoneIcon } from 'lucide-react'
import { usePWAInstall } from '../../hooks/usePWAInstall'

export function PWASidebarButton() {
  const { isStandalone, isInstallable, isIOS, promptInstall } = usePWAInstall()

  const [popoverOpen, setPopoverOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [popoverOpen])

  // Close popover on Escape
  useEffect(() => {
    if (!popoverOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [popoverOpen])

  // Hidden when already installed or not installable
  if (isStandalone || !isInstallable) return null

  const handleClick = () => {
    if (isIOS) {
      setPopoverOpen((prev) => !prev)
    } else {
      promptInstall()
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleClick}
        aria-label="Instalar App"
        className="w-full flex items-center gap-3 px-4 py-3 text-text-muted hover:text-text rounded-xl hover:bg-[var(--color-menu-hover)] transition-all duration-200 text-sm font-medium"
      >
        <SmartphoneIcon className="h-5 w-5 shrink-0" />
        <span className="truncate">Instalar App</span>
      </button>

      {isIOS && popoverOpen && (
        <div
          ref={popoverRef}
          className="absolute bottom-full right-0 mb-2 w-60 bg-surface-card border border-surface-input rounded-xl p-3 shadow-2xl z-50 animate-modal-pop"
          role="dialog"
          aria-label="Instruções de instalação para iOS"
        >
          <p className="text-xs text-text-muted leading-relaxed">
            No Safari, toque em{' '}
            <span className="font-semibold text-text">Compartilhar</span>{' '}
            <span className="inline-block px-1 border border-surface-input rounded bg-surface-input/50">↑</span>{' '}
            e depois em{' '}
            <span className="font-semibold text-text">
              &quot;Adicionar à Tela de Início&quot;
            </span>{' '}
            <span className="inline-block px-1 border border-surface-input rounded bg-surface-input/50">+</span>.
          </p>
        </div>
      )}
    </div>
  )
}

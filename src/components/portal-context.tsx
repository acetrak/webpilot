import React, { createContext, useContext } from "react"

const PortalContext = createContext<HTMLElement | null>(null)

export function PortalProvider({
  container,
  children,
}: {
  container: HTMLElement | null
  children: React.ReactNode
}) {
  return (
    <PortalContext.Provider value={container}>
      {children}
    </PortalContext.Provider>
  )
}

export function usePortalContainer() {
  return useContext(PortalContext)
}

const PanelCloseContext = createContext<(() => void) | null>(null)

export function PanelCloseProvider({
  onClose,
  children,
}: {
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <PanelCloseContext.Provider value={onClose}>
      {children}
    </PanelCloseContext.Provider>
  )
}

export function usePanelClose() {
  return useContext(PanelCloseContext)
}
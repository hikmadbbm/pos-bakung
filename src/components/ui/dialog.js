import * as React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"

import { createPortal } from "react-dom"

const DialogContext = React.createContext({})

const Dialog = ({ open, onOpenChange, children }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogContent = ({ className, children, showCloseButton = true, disableBackdropClick = false }) => {
  const { open, onOpenChange } = React.useContext(DialogContext)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!open || !mounted) return null

  const content = (
    <div className="fixed inset-0 z-[100] flex flex-col items-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in-0 duration-200 overflow-y-auto p-4 sm:p-6">
      <div 
        className="fixed inset-0 cursor-default" 
        onClick={() => !disableBackdropClick && onOpenChange(false)}
      />
      <div className={cn(
        "relative z-[110] w-full sm:max-w-lg my-auto bg-white shadow-2xl rounded-[2rem] border border-slate-100 transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-5 overflow-hidden",
        className
      )}>
        {children}
        {showCloseButton && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-6 top-6 rounded-full bg-slate-50 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-2 z-[120]"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col space-y-2 text-center sm:text-left p-8 pb-0", className)}
    {...props}
  />
)

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 p-8 pt-0 mt-4", className)}
    {...props}
  />
)

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

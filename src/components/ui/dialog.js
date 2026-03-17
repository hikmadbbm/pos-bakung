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

const DialogContent = ({ className, children }) => {
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
        onClick={() => onOpenChange(false)}
      />
      <div className={cn(
        "relative z-[110] w-full sm:max-w-lg my-auto bg-white shadow-2xl rounded-[2rem] border border-slate-100 transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-5",
        className
      )}>
        {children}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
)

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
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

"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

const DropdownMenuContext = React.createContext({});

const DropdownMenu = ({ children }) => {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left" ref={menuRef}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

const DropdownMenuTrigger = ({ asChild, children, className }) => {
  const { open, setOpen } = React.useContext(DropdownMenuContext);
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        setOpen(!open);
        if (children.props.onClick) children.props.onClick(e);
      }
    });
  }
  
  return (
    <button onClick={() => setOpen(!open)} className={className}>
      {children}
    </button>
  );
};

const DropdownMenuContent = ({ className, children }) => {
  const { open } = React.useContext(DropdownMenuContext);
  
  if (!open) return null;
  
  return (
    <div className={cn("absolute right-0 z-[100] mt-2 min-w-[160px] rounded-md border bg-slate-900 shadow-md animate-in fade-in-0 zoom-in-95 overflow-hidden", className)}>
      {children}
    </div>
  );
};

const DropdownMenuItem = ({ className, children, onClick }) => {
  const { setOpen } = React.useContext(DropdownMenuContext);
  return (
    <div 
      className={cn("relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-800", className)}
      onClick={(e) => {
         if (onClick) onClick(e);
         setOpen(false);
      }}
    >
      {children}
    </div>
  );
};

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
};

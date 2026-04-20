"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

const DropdownMenuContext = React.createContext({});

const DropdownMenu = ({ children }) => {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef(null);
  const triggerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        (!document.getElementById("dropdown-portal") || !document.getElementById("dropdown-portal").contains(e.target))
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef, menuRef }}>
      <div className="relative inline-block text-left" ref={menuRef}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

const DropdownMenuTrigger = ({ asChild, children, className }) => {
  const { open, setOpen, triggerRef } = React.useContext(DropdownMenuContext);
  
  const element = asChild && React.isValidElement(children) ? children : <button className={className}>{children}</button>;
  
  return React.cloneElement(element, {
    ref: triggerRef,
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!open);
      if (element.props.onClick) element.props.onClick(e);
    }
  });
};

const DropdownMenuContent = ({ className, children, align = "end" }) => {
  const { open, triggerRef } = React.useContext(DropdownMenuContext);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0, right: 0 });
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        right: rect.right
      });
    }
  }, [open, triggerRef]);

  if (!open || !mounted) return null;

  const isRightAligned = align === "end" || align === "right";

  return createPortal(
    <div 
      id="dropdown-portal"
      className={cn("fixed z-[10000] min-w-[200px] rounded-2xl border border-slate-800 bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in-0 zoom-in-95 overflow-hidden p-1.5", className)}
      style={{
        top: `${coords.top}px`,
        left: !isRightAligned ? `${coords.left}px` : "auto",
        right: isRightAligned ? `${window.innerWidth - coords.right}px` : "auto"
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-0.5">
        {children}
      </div>
    </div>,
    document.body
  );
};

const DropdownMenuItem = ({ className, children, onClick }) => {
  const { setOpen } = React.useContext(DropdownMenuContext);
  return (
    <div 
      className={cn("flex cursor-pointer select-none items-center rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all hover:bg-slate-800 text-slate-400 hover:text-white", className)}
      onClick={(e) => {
         e.preventDefault();
         e.stopPropagation();
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

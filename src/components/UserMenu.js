"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown, Lock } from "lucide-react";
import { api, getAuth, setAuth } from "../lib/api";
import { cn } from "../lib/utils";
import { useToast } from "./ui/use-toast";
import { useTranslation } from "../lib/language-context";

export default function UserMenu() {
  const router = useRouter();
  const { error } = useToast();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    setUser(getAuth());
  }, []);
  const menuRef = useRef(null);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle ESC key
  useEffect(() => {
    function handleEsc(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const handleLogout = async () => {
    // Check for active shift
    if (user) {
      try {
        const shift = await api.get(`/shifts/current/${user.id}`);
        if (shift) {
          error("Active Shift Detected: You must stop your shift and reconcile cash before logging out.");
          setIsOpen(false);
          return;
        }
      } catch (e) {
        console.error("Logout check failed", e);
      }
    }
    
    setAuth(null, null);
    router.push("/login");
  };

  const getInitials = () => {
    if (!user) return "U";
    const name = user.username || user.name || "User";
    return name.charAt(0).toUpperCase();
  };

  const getUserName = () => {
      if (!user) return "Guest";
      return user.username || user.name || "User";
  }

  const getRole = () => {
      if (!user) return "";
      return user.role || "";
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="User menu"
        data-testid="user-menu-button"
      >
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs shrink-0 border border-emerald-200">
          {user?.avatar ? (
             // eslint-disable-next-line @next/next/no-img-element
             <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
             getInitials()
          )}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div 
            className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in zoom-in-95 duration-200"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button"
            data-testid="user-menu-popup"
        >
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium text-gray-900 truncate">{getUserName()}</p>
            <p className="text-xs text-gray-500 truncate capitalize">{getRole()}</p>
          </div>
          
          <div className="py-1" role="none">
            <button
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              role="menuitem"
              onClick={() => {
                  setIsOpen(false);
                  router.push("/settings"); // Assuming there is a profile/settings page
              }}
            >
              <User className="mr-3 h-4 w-4 text-gray-400" />
              {t('profile')}
            </button>
            
            <button
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              role="menuitem"
              onClick={handleLogout}
              data-testid="logout-button"
            >
              <LogOut className="mr-3 h-4 w-4 text-red-500" />
              {t('logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

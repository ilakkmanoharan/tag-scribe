"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export function NavSettingsDropdown() {
  const { user, signOut, isFirebaseEnabled } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
      >
        Settings
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
          <Link
            href="/settings"
            className="block px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--border)]"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <Link
            href="/about"
            className="block px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--border)]"
            onClick={() => setOpen(false)}
          >
            About
          </Link>
          <Link
            href="/support"
            className="block px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--border)]"
            onClick={() => setOpen(false)}
          >
            Support
          </Link>
          {isFirebaseEnabled && user && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="block w-full px-4 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--border)]"
            >
              Sign out
            </button>
          )}
        </div>
      )}
    </div>
  );
}

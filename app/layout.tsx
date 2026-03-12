"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!mobile) {
      setOpen(false);
    }
  }, [mobile]);

  return (
    <html lang="it">
      <body style={{ margin: 0, overflowX: "hidden" }}>
        <div style={layout}>
          {mobile && (
            <div style={mobileHeader}>
              <button style={menuButton} onClick={() => setOpen(!open)}>
                ☰
              </button>

              <img src="/bigalogo.png" alt="Biga" style={{ height: 40 }} />
            </div>
          )}

          {mobile && open && (
            <div
              style={overlay}
              onClick={() => setOpen(false)}
            />
          )}

          {(!mobile || open) && (
            <aside
              style={{
                ...sidebar,
                ...(mobile ? mobileSidebar : null),
              }}
            >
              <div style={logo}>
                <img src="/bigalogo.png" alt="Biga" style={{ width: 120 }} />
              </div>

              <nav style={menu}>
                <NavItem href="/" label="🏠 Dashboard" />
                <NavItem href="/inventory" label="📦 Magazzino" />
                <NavItem href="/movements" label="🔄 Movimenti" />
                <NavItem href="/customers" label="👤 Clienti" />
                <NavItem href="/workorders" label="🔧 Schede officina" />
                <NavItem href="/inventory-bikes" label="🚲 Bici magazzino" />
                <NavItem href="/bike-disassembly" label="🛠 Smonta ricambi" />
                <NavItem href="/install-component" label="🔩 Monta ricambi" />
              </nav>
            </aside>
          )}

          <main
            style={{
              ...page,
              marginLeft: mobile ? 0 : 240,
              marginTop: mobile ? 60 : 0,
            }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavItem({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link href={href} style={menuItem}>
      {label}
    </Link>
  );
}

const layout: React.CSSProperties = {
  display: "flex",
  minHeight: "100vh",
  background: "#f6f8fb",
  width: "100%",
  overflowX: "hidden",
};

const sidebar: React.CSSProperties = {
  width: 240,
  background: "#fff",
  padding: 20,
  borderRight: "1px solid #e5e7eb",
  position: "fixed",
  top: 0,
  bottom: 0,
  left: 0,
  overflowY: "auto",
  zIndex: 20,
  boxSizing: "border-box",
};

const mobileSidebar: React.CSSProperties = {
  width: 240,
  transform: "translateX(0)",
};

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.25)",
  zIndex: 19,
};

const logo: React.CSSProperties = {
  marginBottom: 30,
  textAlign: "center",
};

const menu: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const menuItem: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 8,
  textDecoration: "none",
  color: "#374151",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  fontWeight: 500,
  boxSizing: "border-box",
};

const page: React.CSSProperties = {
  flex: 1,
  width: "100%",
  maxWidth: "100%",
  padding: "20px clamp(14px,4vw,40px)",
  boxSizing: "border-box",
  overflowX: "hidden",
};

const mobileHeader: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: 60,
  background: "#fff",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center",
  gap: 15,
  padding: "0 15px",
  zIndex: 30,
  boxSizing: "border-box",
};

const menuButton: React.CSSProperties = {
  fontSize: 22,
  border: "none",
  background: "none",
  cursor: "pointer",
};
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      setMobile(window.innerWidth < 900);
    };

    check();
    window.addEventListener("resize", check);

    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <html lang="it">
      <body style={{ margin: 0 }}>

        <div style={layout}>

          {/* MOBILE HEADER */}

          {mobile && (
            <div style={mobileHeader}>
              <button
                style={menuButton}
                onClick={() => setOpen(!open)}
              >
                ☰
              </button>

              <img
                src="/bigalogo.png"
                style={{ height: 40 }}
              />
            </div>
          )}

          {/* SIDEBAR */}

          {(!mobile || open) && (
            <aside style={sidebar}>
              <div style={logo}>
                <img src="/bigalogo.png" style={{ width: 120 }} />
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

          {/* CONTENUTO */}

          <main
            style={{
              ...page,
              marginLeft: mobile ? 0 : 240,
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
};

const page: React.CSSProperties = {
  flex: 1,
  padding: "20px clamp(14px,4vw,40px)",
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
};

const menuButton: React.CSSProperties = {
  fontSize: 22,
  border: "none",
  background: "none",
  cursor: "pointer",
};
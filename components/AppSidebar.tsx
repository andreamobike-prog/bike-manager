"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type MenuItem = {
  href: string;
  label: string;
  sub: string;
  icon: string;
};

type MenuGroup = {
  section: string;
  items: MenuItem[];
};

const menu: MenuGroup[] = [
  {
    section: "Generale",
    items: [
      {
        href: "/",
        label: "Dashboard",
        sub: "Panoramica operativa",
        icon: "🏠",
      },
      {
        href: "/customers",
        label: "Clienti",
        sub: "Anagrafiche e bici",
        icon: "👤",
      },
    ],
  },
  {
    section: "Magazzino",
    items: [
      {
        href: "/inventory",
        label: "Magazzino",
        sub: "Prodotti e scorte",
        icon: "📦",
      },
      {
        href: "/movements",
        label: "Movimenti",
        sub: "Carichi e scarichi",
        icon: "🔄",
      },
      {
        href: "/inventory-bikes",
        label: "Bici magazzino",
        sub: "Asset aziendali",
        icon: "🚲",
      },
    ],
  },
  {
    section: "Officina",
    items: [
      {
        href: "/workorders",
        label: "Schede officina",
        sub: "Lavori e interventi",
        icon: "🔧",
      },
      {
        href: "/bike-disassembly",
        label: "Smonta ricambi",
        sub: "Recupero componenti",
        icon: "🛠",
      },
      {
        href: "/install-component",
        label: "Monta ricambi",
        sub: "Installazione parti",
        icon: "🔩",
      },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <Link href="/" className="sidebar-logo">
          <img src="/bigalogo.png" alt="Biga Bike" />
          <div className="sidebar-logo-text">
            <div className="sidebar-brand">Biga Bike</div>
            <div className="sidebar-subbrand">Gestionale officina</div>
          </div>
        </Link>

        {menu.map((group) => (
          <div key={group.section}>
            <div className="sidebar-section-title">{group.section}</div>

            <nav className="sidebar-nav">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${active ? "active" : ""}`}
                  >
                    <span className="sidebar-icon">{item.icon}</span>

                    <span className="sidebar-label-wrap">
                      <span className="sidebar-label">{item.label}</span>
                      <div className="sidebar-sub">{item.sub}</div>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
         

          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-link"
            style={{
              background: "transparent",
              border: "none",
              width: "100%",
              textAlign: "left",
            }}
          >
            <span className="sidebar-icon">🚪</span>
            <span className="sidebar-label-wrap">
              <span className="sidebar-label">Logout</span>
              <div className="sidebar-sub">Esci dal gestionale</div>
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
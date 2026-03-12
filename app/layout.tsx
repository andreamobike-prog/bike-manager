import Link from "next/link";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const layout: React.CSSProperties = {
    display: "flex",
    minHeight: "100vh",
    background: "#f6f8fb",
    color: "#1f2937",
    fontFamily: "Inter, system-ui",
  };

  const sidebar: React.CSSProperties = {
    width: 240,
    background: "#ffffff",
    padding: 20,
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
  };

  const logo: React.CSSProperties = {
    marginBottom: 30,
    textAlign: "center",
  };

  const menu: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };

  const menuButton: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 8,
    textDecoration: "none",
    color: "#374151",
    fontWeight: 500,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    transition: "all 0.15s",
  };

  const page: React.CSSProperties = {
    flex: 1,
    padding: 40,
  };

  return (
    <html lang="it">
      <body style={{ margin: 0 }}>
        <div style={layout}>
          <aside style={sidebar}>
            <div style={logo}>
              <img src="/bigalogo.png" style={{ width: 130 }} />
            </div>

            <nav style={menu}>
              <Link href="/" style={menuButton}>
                🏠 Dashboard
              </Link>

              <Link href="/inventory" style={menuButton}>
                📦 Magazzino
              </Link>

              <Link href="/movements" style={menuButton}>
                🔄 Movimenti
              </Link>

              <Link href="/customers" style={menuButton}>
                👤 Clienti
              </Link>

              <Link href="/workorders" style={menuButton}>
                🔧 Schede officina
              </Link>

              <Link href="/inventory-bikes" style={menuButton}>
                🚲 Bici magazzino
              </Link>

              <Link href="/bike-disassembly" style={menuButton}>
                🛠 Smonta ricambi bici
              </Link>

              <Link href="/install-component" style={menuButton}>
                🔩 Monta ricambi su bici
              </Link>
            </nav>
          </aside>

          <main style={page}>{children}</main>
        </div>
      </body>
    </html>
  );
}
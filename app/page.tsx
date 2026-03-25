"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

type DashboardStats = {
  products: number;
  lowStock: number;
  openOrders: number;
  workingOrders: number;
  todayMovements: number;
  inventoryBikes: number;
  customers: number;
  outOfStock: number;
};

type RecentOrder = {
  id: string;
  status: string | null;
  created_at: string | null;
  customers?: {
    name?: string | null;
  } | null;
  bikes?: {
    brand?: string | null;
    model?: string | null;
  } | null;
};

type RecentMovement = {
  id: string;
  type: string | null;
  quantity: number | null;
  created_at: string | null;
  products?: {
    title?: string | null;
  } | null;
};

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    products: 0,
    lowStock: 0,
    openOrders: 0,
    workingOrders: 0,
    todayMovements: 0,
    inventoryBikes: 0,
    customers: 0,
    outOfStock: 0,
  });

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const today = new Date().toISOString().slice(0, 10);

    const [
      { data: productsData },
      { data: inventoryBikesData },
      { data: ordersData },
      { data: movementsData },
      { data: recentOrdersData },
      { data: recentMovementsData },
      { data: customersData },
    ] = await Promise.all([
      supabase.from("products").select("id,warehouse_qty"),
      supabase.from("inventory_bikes").select("id"),
      supabase.from("work_orders").select("id,status"),
      supabase.from("inventory_movements").select("id,created_at"),
      supabase
        .from("work_orders")
        .select(
          `
          id,
          status,
          created_at,
          customers(name),
          bikes(brand,model)
        `
        )
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("inventory_movements")
        .select(
          `
          id,
          type,
          quantity,
          created_at,
          products(title)
        `
        )
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("customers").select("id"),
    ]);

    const products = (productsData as any[]) || [];
    const inventoryBikes = (inventoryBikesData as any[]) || [];
    const orders = (ordersData as any[]) || [];
    const movements = (movementsData as any[]) || [];
    const customers = (customersData as any[]) || [];

    setStats({
      products: products.length,
      lowStock: products.filter(
        (p) => Number(p.warehouse_qty || 0) > 0 && Number(p.warehouse_qty || 0) <= 2
      ).length,
      outOfStock: products.filter((p) => Number(p.warehouse_qty || 0) <= 0).length,
      openOrders: orders.filter((o) => o.status === "open").length,
      workingOrders: orders.filter((o) => o.status === "working").length,
      todayMovements: movements.filter((m) => {
        if (!m.created_at) return false;
        return new Date(m.created_at).toISOString().slice(0, 10) === today;
      }).length,
      inventoryBikes: inventoryBikes.length,
      customers: customers.length,
    });

    setRecentOrders((recentOrdersData as RecentOrder[]) || []);
    setRecentMovements((recentMovementsData as RecentMovement[]) || []);
    setLoading(false);
  }

  const alerts = useMemo(
    () => [
      {
        label: "Schede in lavorazione",
        value: stats.workingOrders,
        tone: "orange",
        path: "/workorders",
      },
      {
        label: "Prodotti sotto scorta",
        value: stats.lowStock,
        tone: "orange",
        path: "/inventory",
      },
      {
        label: "Prodotti esauriti",
        value: stats.outOfStock,
        tone: "red",
        path: "/inventory",
      },
      {
        label: "Movimenti oggi",
        value: stats.todayMovements,
        tone: "blue",
        path: "/movements",
      },
    ],
    [stats]
  );

  function go(path: string) {
    router.push(path);
  }

  function formatStatus(status: string | null) {
    if (status === "open") return "Aperta";
    if (status === "working") return "In lavorazione";
    if (status === "closed") return "Chiusa";
    return status || "-";
  }

  function statusBadge(status: string | null): React.CSSProperties {
    if (status === "open") {
      return { background: "#e0f2fe", color: "#075985" };
    }
    if (status === "working") {
      return { background: "#fff7ed", color: "#c2410c" };
    }
    if (status === "closed") {
      return { background: "#e5e7eb", color: "#374151" };
    }
    return { background: "#f3f4f6", color: "#374151" };
  }

  function movementBadge(type: string | null): React.CSSProperties {
    if (type === "carico") {
      return { background: "#dbeafe", color: "#1d4ed8" };
    }
    if (type === "officina") {
      return { background: "#ffedd5", color: "#c2410c" };
    }
    if (type === "scarico") {
      return { background: "#fee2e2", color: "#b91c1c" };
    }
    if (type === "recupero_bici") {
      return { background: "#dcfce7", color: "#166534" };
    }
    return { background: "#e5e7eb", color: "#374151" };
  }

  function alertTone(tone: string): React.CSSProperties {
    if (tone === "red") {
      return {
        background: "#fff1f2",
        border: "1px solid #fecdd3",
        valueColor: "#dc2626",
      } as any;
    }
    if (tone === "orange") {
      return {
        background: "#fff7ed",
        border: "1px solid #fed7aa",
        valueColor: "#ea580c",
      } as any;
    }
    return {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      valueColor: "#2563eb",
    } as any;
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Caricamento dashboard...</div>;
  }

  return (
    <div style={page}>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Pannello operativo</div>
          <h1 style={title}>Dashboard</h1>
          <p style={subtitle}>
            Le informazioni essenziali per gestire officina, magazzino e clienti.
          </p>
        </div>

        <div style={heroActions}>
          <button style={primaryBtn} onClick={() => go("/workorders/new")}>
            + Nuova scheda lavoro
          </button>
          <button style={secondaryBtn} onClick={() => go("/inventory/new")}>
            + Nuovo articolo
          </button>
        </div>
      </div>

      <div style={kpiGrid}>
        <button style={kpiCard} onClick={() => go("/workorders")}>
          <div style={kpiLabel}>Schede aperte</div>
          <div style={kpiValue}>{stats.openOrders}</div>
          <div style={kpiSub}>Da prendere in carico</div>
        </button>

        <button style={kpiCard} onClick={() => go("/inventory")}>
          <div style={kpiLabel}>Prodotti</div>
          <div style={kpiValue}>{stats.products}</div>
          <div style={kpiSub}>Articoli presenti a magazzino</div>
        </button>

        <button style={kpiCard} onClick={() => go("/customers")}>
          <div style={kpiLabel}>Clienti</div>
          <div style={kpiValue}>{stats.customers}</div>
          <div style={kpiSub}>Anagrafiche registrate</div>
        </button>

        <button style={kpiCard} onClick={() => go("/inventory-bikes")}>
          <div style={kpiLabel}>Bici magazzino</div>
          <div style={kpiValue}>{stats.inventoryBikes}</div>
          <div style={kpiSub}>Bici aziendali disponibili</div>
        </button>
      </div>

      <div style={alertsGrid}>
        {alerts.map((item) => {
          const tone = alertTone(item.tone) as any;

          return (
            <button
              key={item.label}
              onClick={() => go(item.path)}
              style={{
                ...alertCard,
                background: tone.background,
                border: tone.border,
              }}
            >
              <div style={alertLabel}>{item.label}</div>
              <div style={{ ...alertValue, color: tone.valueColor }}>{item.value}</div>
            </button>
          );
        })}
      </div>

      <div style={quickWrap}>
        <div style={sectionTitle}>Azioni rapide</div>

        <div style={quickGrid}>
          <button style={quickCard} onClick={() => go("/workorders")}>
            <div style={quickIcon}>🔧</div>
            <div style={quickTitle}>Schede officina</div>
          </button>

          <button style={quickCard} onClick={() => go("/inventory")}>
            <div style={quickIcon}>📦</div>
            <div style={quickTitle}>Magazzino</div>
          </button>

          <button style={quickCard} onClick={() => go("/movements")}>
            <div style={quickIcon}>🔄</div>
            <div style={quickTitle}>Movimenti</div>
          </button>

          <button style={quickCard} onClick={() => go("/customers")}>
            <div style={quickIcon}>👤</div>
            <div style={quickTitle}>Clienti</div>
          </button>

          <button style={quickCard} onClick={() => go("/inventory-bikes")}>
            <div style={quickIcon}>🚲</div>
            <div style={quickTitle}>Bici magazzino</div>
          </button>

          <button style={quickCard} onClick={() => go("/bike-disassembly")}>
            <div style={quickIcon}>🛠</div>
            <div style={quickTitle}>Smonta ricambi</div>
          </button>
        </div>
      </div>

      <div style={contentGrid} className="contentGridResponsive">
        <div style={panel}>
          <div style={panelHeader}>
            <div>
              <h2 style={panelTitle}>Ultime schede lavoro</h2>
              <p style={panelSubtitle}>Le lavorazioni più recenti.</p>
            </div>

            <button style={linkBtn} onClick={() => go("/workorders")}>
              Vedi tutte
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div style={emptyState}>Nessuna scheda lavoro disponibile.</div>
          ) : (
            <div style={list}>
              {recentOrders.map((o) => (
                <div key={o.id} style={listRow}>
                  <div style={listLeft}>
                    <div style={rowTitle}>
                      {o.customers?.name || "Cliente non definito"}
                    </div>
                    <div style={rowSub}>
                      {o.bikes?.brand || "-"} {o.bikes?.model || ""}
                    </div>
                    <div style={rowMeta}>
                      {o.created_at
                        ? new Date(o.created_at).toLocaleDateString("it-IT")
                        : "-"}
                    </div>
                  </div>

                  <div style={listRight}>
                    <span style={{ ...badge, ...statusBadge(o.status) }}>
                      {formatStatus(o.status)}
                    </span>

                    <button
                      style={smallBtn}
                      onClick={() => {
                        if (o.status === "closed") {
                          router.push(`/workorders/${o.id}/report`);
                        } else {
                          router.push(`/workorders/${o.id}`);
                        }
                      }}
                    >
                      Apri
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={panel}>
          <div style={panelHeader}>
            <div>
              <h2 style={panelTitle}>Ultimi movimenti</h2>
              <p style={panelSubtitle}>Le ultime attività registrate.</p>
            </div>

            <button style={linkBtn} onClick={() => go("/movements")}>
              Vedi tutti
            </button>
          </div>

          {recentMovements.length === 0 ? (
            <div style={emptyState}>Nessun movimento disponibile.</div>
          ) : (
            <div style={list}>
              {recentMovements.map((m) => (
                <div key={m.id} style={listRow}>
                  <div style={listLeft}>
                    <div style={rowTitle}>
                      {m.products?.title || "Prodotto non trovato"}
                    </div>
                    <div style={rowSub}>Quantità: {m.quantity ?? 0}</div>
                    <div style={rowMeta}>
                      {m.created_at
                        ? new Date(m.created_at).toLocaleDateString("it-IT")
                        : "-"}
                    </div>
                  </div>

                  <div style={listRight}>
                    <span style={{ ...badge, ...movementBadge(m.type) }}>
                      {m.type || "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const page: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 22,
};

const hero: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap",
};

const eyebrow: React.CSSProperties = {
  fontSize: 13,
  color: "#64748b",
  marginBottom: 8,
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: 34,
  fontWeight: 800,
  letterSpacing: "-0.03em",
  color: "#0f172a",
};

const subtitle: React.CSSProperties = {
  marginTop: 8,
  color: "#64748b",
  fontSize: 15,
};

const heroActions: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const primaryBtn: React.CSSProperties = {
  background: "linear-gradient(180deg,#1185ff 0%, #0071e3 100%)",
  color: "#fff",
  border: "none",
  padding: "12px 16px",
  borderRadius: 14,
  fontWeight: 700,
  boxShadow: "0 14px 30px rgba(0,113,227,0.22)",
};

const secondaryBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.86)",
  color: "#111827",
  border: "1px solid rgba(15,23,42,0.08)",
  padding: "12px 16px",
  borderRadius: 14,
  fontWeight: 700,
};

const kpiGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const kpiCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.86)",
  border: "1px solid rgba(15,23,42,0.06)",
  borderRadius: 22,
  padding: 20,
  textAlign: "left",
  boxShadow: "0 10px 28px rgba(15,23,42,0.04)",
};

const kpiLabel: React.CSSProperties = {
  fontSize: 13,
  color: "#64748b",
  marginBottom: 10,
};

const kpiValue: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1,
};

const kpiSub: React.CSSProperties = {
  marginTop: 10,
  fontSize: 13,
  color: "#94a3b8",
};

const alertsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const alertCard: React.CSSProperties = {
  borderRadius: 18,
  padding: 16,
  textAlign: "left",
};

const alertLabel: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#0f172a",
};

const alertValue: React.CSSProperties = {
  marginTop: 10,
  fontSize: 30,
  fontWeight: 800,
};

const quickWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: "#0f172a",
};

const quickGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 14,
};

const quickCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(15,23,42,0.06)",
  borderRadius: 18,
  padding: 18,
  textAlign: "left",
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
};

const quickIcon: React.CSSProperties = {
  fontSize: 22,
  marginBottom: 12,
};

const quickTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 750,
  color: "#0f172a",
};

const contentGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 18,
};

const panel: React.CSSProperties = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(15,23,42,0.06)",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 10px 28px rgba(15,23,42,0.04)",
};

const panelHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
};

const panelTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  color: "#0f172a",
};

const panelSubtitle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  color: "#64748b",
};

const linkBtn: React.CSSProperties = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  padding: "8px 12px",
  borderRadius: 12,
  fontWeight: 700,
};

const list: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const listRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "14px 0",
  borderBottom: "1px solid rgba(15,23,42,0.06)",
};

const listLeft: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const rowTitle: React.CSSProperties = {
  fontWeight: 700,
  color: "#0f172a",
};

const rowSub: React.CSSProperties = {
  fontSize: 13,
  color: "#64748b",
};

const rowMeta: React.CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
};

const listRight: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 8,
};

const badge: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const smallBtn: React.CSSProperties = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "8px 12px",
  borderRadius: 10,
  fontWeight: 700,
};

const emptyState: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: 16,
  padding: 24,
  textAlign: "center",
  color: "#64748b",
};
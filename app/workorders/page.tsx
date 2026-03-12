"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

type WorkOrderRow = {
  id: string;
  status: string | null;
  archived?: boolean | null;
  created_at: string | null;
  customers?: {
    name?: string | null;
  } | null;
  bikes?: {
    brand?: string | null;
    model?: string | null;
  } | null;
};

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrderRow[]>([]);
  const [search, setSearch] = useState("");
  const [screenWidth, setScreenWidth] = useState(1200);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    function handleResize() {
      setScreenWidth(window.innerWidth);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function loadOrders() {
    const { data } = await supabase
      .from("work_orders")
      .select(
        `
        *,
        customers(name),
        bikes(brand,model)
      `
      )
      .eq("archived", false)
      .order("created_at", { ascending: false });

    setOrders((data as WorkOrderRow[]) || []);
  }

  async function updateStatus(id: string, newStatus: string) {
    await supabase
      .from("work_orders")
      .update({
        status: newStatus,
        archived: newStatus === "closed",
      })
      .eq("id", id);

    loadOrders();
  }

  async function archiveOrder(id: string) {
    await supabase
      .from("work_orders")
      .update({
        archived: true,
        status: "closed",
      })
      .eq("id", id);

    loadOrders();
  }

  async function deleteOrder(id: string) {
    const ok = confirm("Eliminare scheda lavoro?");
    if (!ok) return;

    await supabase.from("work_order_parts").delete().eq("work_order_id", id);
    await supabase.from("work_order_services").delete().eq("work_order_id", id);
    await supabase.from("inventory_movements").delete().eq("work_order_id", id);
    await supabase.from("work_orders").delete().eq("id", id);

    loadOrders();
  }

  function onDragEnd(result: any) {
    if (!result.destination) return;

    const id = result.draggableId;
    const newStatus = result.destination.droppableId;

    updateStatus(id, newStatus);
  }

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (!search) return true;
      return (
        o.customers?.name?.toLowerCase().includes(search.toLowerCase()) || false
      );
    });
  }, [orders, search]);

  const open = filtered.filter((o) => o.status === "open");
  const working = filtered.filter((o) => o.status === "working");
  const closed = filtered.filter((o) => o.status === "closed");

  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1100;

  const page: React.CSSProperties = {
    padding: isMobile ? 12 : 24,
    maxWidth: 1300,
    margin: "0 auto",
    background: "#f6f8fb",
    minHeight: "100vh",
    boxSizing: "border-box",
  };

  const header: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: isMobile ? "stretch" : "center",
    marginBottom: 20,
    gap: 14,
    flexWrap: "wrap",
    flexDirection: isMobile ? "column" : "row",
  };

  const title: React.CSSProperties = {
    margin: 0,
    fontSize: isMobile ? 26 : 32,
    fontWeight: 800,
    color: "#0f172a",
  };

  const subtitle: React.CSSProperties = {
    marginTop: 6,
    color: "#64748b",
    fontSize: isMobile ? 14 : 15,
    lineHeight: 1.4,
  };

  const headerActions: React.CSSProperties = {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    width: isMobile ? "100%" : "auto",
  };

  const searchInput: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #ddd",
    marginBottom: 20,
    fontSize: 14,
    boxSizing: "border-box",
  };

  const stats: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : isTablet
      ? "repeat(3, minmax(0, 1fr))"
      : "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 20,
  };

  const board: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : isTablet
      ? "1fr 1fr"
      : "1fr 1fr 1fr",
    gap: 16,
    alignItems: "start",
  };

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <h1 style={title}>Schede officina</h1>
          <p style={subtitle}>
            Gestisci i lavori dell&apos;officina tramite workflow drag & drop.
          </p>
        </div>

        <div style={headerActions}>
          <Link href="/workorders/archive" style={{ width: isMobile ? "100%" : "auto" }}>
            <button
              style={{
                ...archiveBtn,
                width: isMobile ? "100%" : "auto",
              }}
            >
              Archivio
            </button>
          </Link>

          <Link href="/workorders/new" style={{ width: isMobile ? "100%" : "auto" }}>
            <button
              style={{
                ...newBtn,
                width: isMobile ? "100%" : "auto",
              }}
            >
              + Nuova scheda lavoro
            </button>
          </Link>
        </div>
      </div>

      <input
        placeholder="Cerca cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={searchInput}
      />

      <div style={stats}>
        <Stat title="Aperte" value={open.length} color="#3b82f6" />
        <Stat title="In lavorazione" value={working.length} color="#f59e0b" />
        <Stat title="Chiuse" value={closed.length} color="#10b981" />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={board}>
          <Column
            title="Aperte"
            status="open"
            orders={open}
            archiveOrder={archiveOrder}
            deleteOrder={deleteOrder}
            isMobile={isMobile}
          />
          <Column
            title="In lavorazione"
            status="working"
            orders={working}
            archiveOrder={archiveOrder}
            deleteOrder={deleteOrder}
            isMobile={isMobile}
          />
          <Column
            title="Chiuse"
            status="closed"
            orders={closed}
            archiveOrder={archiveOrder}
            deleteOrder={deleteOrder}
            isMobile={isMobile}
          />
        </div>
      </DragDropContext>
    </div>
  );
}

function Column({
  title,
  status,
  orders,
  archiveOrder,
  deleteOrder,
  isMobile,
}: {
  title: string;
  status: string;
  orders: WorkOrderRow[];
  archiveOrder: (id: string) => void;
  deleteOrder: (id: string) => void;
  isMobile: boolean;
}) {
  const column: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
  };

  const columnHeader: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  };

  const count: React.CSSProperties = {
    background: "#eee",
    padding: "4px 10px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  };

  const columnBody: React.CSSProperties = {
    minHeight: isMobile ? 120 : 350,
    background: "#eef2f7",
    padding: isMobile ? 10 : 12,
    borderRadius: 14,
    boxSizing: "border-box",
  };

  return (
    <div style={column}>
      <div style={columnHeader}>
        <h3 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>{title}</h3>
        <span style={count}>{orders.length}</span>
      </div>

      <Droppable droppableId={status}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} style={columnBody}>
            {orders.map((o, index) => (
              <Draggable key={o.id} draggableId={String(o.id)} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <Card
                      order={o}
                      archiveOrder={archiveOrder}
                      deleteOrder={deleteOrder}
                      isMobile={isMobile}
                    />
                  </div>
                )}
              </Draggable>
            ))}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function Card({
  order,
  archiveOrder,
  deleteOrder,
  isMobile,
}: {
  order: WorkOrderRow;
  archiveOrder: (id: string) => void;
  deleteOrder: (id: string) => void;
  isMobile: boolean;
}) {
  const card: React.CSSProperties = {
    background: "#fff",
    padding: isMobile ? 14 : 16,
    borderRadius: 14,
    marginBottom: 10,
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
    width: "100%",
  };

  const cardTop: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
    flexDirection: isMobile ? "column" : "row",
  };

  const client: React.CSSProperties = {
    fontWeight: 800,
    color: "#0f172a",
    fontSize: isMobile ? 16 : 17,
    lineHeight: 1.3,
  };

  const bike: React.CSSProperties = {
    fontSize: isMobile ? 14 : 13,
    color: "#666",
    marginTop: 6,
    lineHeight: 1.4,
  };

  const date: React.CSSProperties = {
    fontSize: 12,
    color: "#888",
    whiteSpace: "nowrap",
  };

  const actions: React.CSSProperties = {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  };

  const baseBtn: React.CSSProperties = {
    border: "none",
    color: "white",
    padding: isMobile ? "10px 14px" : "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: isMobile ? 15 : 14,
  };

  return (
    <div style={card}>
      <div style={cardTop}>
        <div>
          <div style={client}>{order.customers?.name || "Cliente senza nome"}</div>
          <div style={bike}>
            🚲 {order.bikes?.brand || "-"} {order.bikes?.model || ""}
          </div>
        </div>

        <div style={date}>
          {order.created_at
            ? new Date(order.created_at).toLocaleDateString("it-IT")
            : "-"}
        </div>
      </div>

      <div style={actions}>
        <Link href={`/workorders/${order.id}`}>
          <button style={{ ...baseBtn, background: "#22c55e" }}>Apri</button>
        </Link>

        <button
          onClick={() => archiveOrder(order.id)}
          style={{ ...baseBtn, background: "#64748b" }}
        >
          Archivia
        </button>

        <button
          onClick={() => deleteOrder(order.id)}
          style={{ ...baseBtn, background: "#ef4444" }}
        >
          Elimina
        </button>
      </div>
    </div>
  );
}

function Stat({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  const statCard: React.CSSProperties = {
    background: "#fff",
    padding: 16,
    borderRadius: 14,
    boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
    minWidth: 0,
  };

  const statTitle: React.CSSProperties = {
    fontSize: 12,
    color: "#666",
  };

  const statValue: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 800,
    marginTop: 6,
    color,
  };

  return (
    <div style={statCard}>
      <div style={statTitle}>{title}</div>
      <div style={statValue}>{value}</div>
    </div>
  );
}

const archiveBtn: React.CSSProperties = {
  background: "#64748b",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const newBtn: React.CSSProperties = {
  background: "#22c55e",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};
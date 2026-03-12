"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import Link from "next/link"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    const { data } = await supabase
      .from("work_orders")
      .select(`
        *,
        customers(name),
        bikes(brand,model)
      `)
      .eq("archived", false)
      .order("created_at", { ascending: false })

    setOrders(data || [])
  }

  async function updateStatus(id: string, newStatus: string) {
    await supabase
      .from("work_orders")
      .update({
        status: newStatus,
        archived: newStatus === "closed",
      })
      .eq("id", id)

    loadOrders()
  }

  async function archiveOrder(id: string) {
    await supabase
      .from("work_orders")
      .update({
        archived: true,
        status: "closed",
      })
      .eq("id", id)

    loadOrders()
  }

  async function deleteOrder(id: string) {
    const ok = confirm("Eliminare scheda lavoro?")

    if (!ok) return

    await supabase.from("work_order_parts").delete().eq("work_order_id", id)
    await supabase.from("work_order_services").delete().eq("work_order_id", id)
    await supabase.from("inventory_movements").delete().eq("work_order_id", id)
    await supabase.from("work_orders").delete().eq("id", id)

    loadOrders()
  }

  function onDragEnd(result: any) {
    if (!result.destination) return

    const id = result.draggableId
    const newStatus = result.destination.droppableId

    updateStatus(id, newStatus)
  }

  const filtered = orders.filter((o) => {
    if (!search) return true

    return o.customers?.name?.toLowerCase().includes(search.toLowerCase())
  })

  const open = filtered.filter((o) => o.status === "open")
  const working = filtered.filter((o) => o.status === "working")
  const closed = filtered.filter((o) => o.status === "closed")

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <h1 style={title}>Schede officina</h1>
          <p style={subtitle}>
            Gestisci i lavori dell'officina tramite workflow drag & drop.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/workorders/archive">
            <button style={archiveBtn}>Archivio</button>
          </Link>

          <Link href="/workorders/new">
            <button style={newBtn}>+ Nuova scheda lavoro</button>
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
          />
          <Column
            title="In lavorazione"
            status="working"
            orders={working}
            archiveOrder={archiveOrder}
            deleteOrder={deleteOrder}
          />
          <Column
            title="Chiuse"
            status="closed"
            orders={closed}
            archiveOrder={archiveOrder}
            deleteOrder={deleteOrder}
          />
        </div>
      </DragDropContext>
    </div>
  )
}

function Column({ title, status, orders, archiveOrder, deleteOrder }: any) {
  return (
    <div style={column}>
      <div style={columnHeader}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span style={count}>{orders.length}</span>
      </div>

      <Droppable droppableId={status}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} style={columnBody}>
            {orders.map((o: any, index: number) => (
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
  )
}

function Card({ order, archiveOrder, deleteOrder }: any) {
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
          <button style={openBtn}>Apri</button>
        </Link>

        <button onClick={() => archiveOrder(order.id)} style={archiveSmall}>
          Archivia
        </button>

        <button onClick={() => deleteOrder(order.id)} style={deleteBtn}>
          Elimina
        </button>
      </div>
    </div>
  )
}

function Stat({ title, value, color }: any) {
  return (
    <div style={statCard}>
      <div style={statTitle}>{title}</div>
      <div style={{ ...statValue, color }}>{value}</div>
    </div>
  )
}

const page: React.CSSProperties = {
  padding: 40,
  maxWidth: 1300,
  margin: "auto",
  background: "#f6f8fb",
  minHeight: "100vh",
}

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 25,
  gap: 20,
  flexWrap: "wrap",
}

const title: React.CSSProperties = {
  margin: 0,
  fontSize: 32,
  fontWeight: 800,
  color: "#0f172a",
}

const subtitle: React.CSSProperties = {
  marginTop: 6,
  color: "#64748b",
  fontSize: 15,
}

const searchInput: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #ddd",
  marginBottom: 25,
  fontSize: 14,
}

const stats: React.CSSProperties = {
  display: "flex",
  gap: 20,
  marginBottom: 30,
  flexWrap: "wrap",
}

const statCard: React.CSSProperties = {
  background: "#fff",
  padding: 16,
  borderRadius: 10,
  boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
  minWidth: 140,
}

const statTitle: React.CSSProperties = {
  fontSize: 12,
  color: "#666",
}

const statValue: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  marginTop: 6,
}

const board: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 20,
}

const column: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
}

const columnHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}

const count: React.CSSProperties = {
  background: "#eee",
  padding: "2px 8px",
  borderRadius: 6,
  fontSize: 12,
}

const columnBody: React.CSSProperties = {
  minHeight: 350,
  background: "#eef2f7",
  padding: 12,
  borderRadius: 10,
}

const card: React.CSSProperties = {
  background: "#fff",
  padding: 16,
  borderRadius: 10,
  marginBottom: 10,
  boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
}

const cardTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 10,
  gap: 10,
}

const client: React.CSSProperties = {
  fontWeight: 700,
  color: "#0f172a",
}

const bike: React.CSSProperties = {
  fontSize: 13,
  color: "#666",
  marginTop: 4,
}

const date: React.CSSProperties = {
  fontSize: 12,
  color: "#888",
  whiteSpace: "nowrap",
}

const actions: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
}

const openBtn: React.CSSProperties = {
  background: "#22c55e",
  border: "none",
  color: "white",
  padding: "6px 12px",
  borderRadius: 6,
  cursor: "pointer",
}

const archiveSmall: React.CSSProperties = {
  background: "#64748b",
  border: "none",
  color: "white",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
}

const deleteBtn: React.CSSProperties = {
  background: "#ef4444",
  border: "none",
  color: "white",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
}

const archiveBtn: React.CSSProperties = {
  background: "#64748b",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
}

const newBtn: React.CSSProperties = {
  background: "#22c55e",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
}
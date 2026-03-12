"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

type Customer = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
};

type Bike = {
  id: string;
  customer_id: string;
  brand: string | null;
  model: string | null;
  serial: string | null;
  color: string | null;
};

type ToastType = "success" | "error" | "info";

export default function NewWorkOrderPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [bikes, setBikes] = useState<Bike[]>([]);
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);

  const [note, setNote] = useState("");

  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingBikes, setLoadingBikes] = useState(false);
  const [creating, setCreating] = useState(false);

  const [toast, setToast] = useState<{
    type: ToastType;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadCustomers() {
    setLoadingCustomers(true);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("name");

    if (error) {
      console.error("Errore caricamento clienti:", error);
      setToast({
        type: "error",
        message: `Errore caricamento clienti: ${error.message}`,
      });
      setLoadingCustomers(false);
      return;
    }

    setCustomers((data as Customer[]) || []);
    setLoadingCustomers(false);
  }

  async function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setSearch(c.name || "");
    setSelectedBike(null);
    setLoadingBikes(true);

    const { data, error } = await supabase
      .from("bikes")
      .select("*")
      .eq("customer_id", c.id)
      .order("brand");

    if (error) {
      console.error("Errore caricamento bici cliente:", error);
      setToast({
        type: "error",
        message: `Errore caricamento bici: ${error.message}`,
      });
      setBikes([]);
      setLoadingBikes(false);
      return;
    }

    setBikes((data as Bike[]) || []);
    setLoadingBikes(false);
  }

  async function createWorkOrder() {
    if (!selectedCustomer || !selectedBike) {
      setToast({
        type: "error",
        message: "Seleziona cliente e bici prima di creare la scheda.",
      });
      return;
    }

    setCreating(true);

    const { data, error } = await supabase
      .from("work_orders")
      .insert({
        customer_id: selectedCustomer.id,
        bike_id: selectedBike.id,
        notes: note.trim() || null,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("Errore creazione scheda lavoro:", error);
      setToast({
        type: "error",
        message: `Errore creazione scheda: ${error.message}`,
      });
      setCreating(false);
      return;
    }

    setToast({
      type: "success",
      message: "Scheda lavoro creata correttamente.",
    });

    router.push(`/workorders/${data.id}`);
  }

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (q.length < 2) return [];

    return customers.filter((c) => {
      const text = [c.name || "", c.phone || "", c.email || ""]
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [customers, search]);

  return (
    <div style={page}>
      {toast && (
        <div
          style={{
            ...toastStyle,
            ...(toast.type === "success"
              ? toastSuccess
              : toast.type === "error"
              ? toastError
              : toastInfo),
          }}
        >
          {toast.message}
        </div>
      )}

      <div style={container}>
        <div style={topBar}>
          <button style={backBtn} onClick={() => router.push("/workorders")}>
            ← Torna alle schede
          </button>
        </div>

        <div style={hero}>
          <div>
            <div style={eyebrow}>Officina</div>
            <h1 style={title}>Nuova scheda lavoro</h1>
            <p style={subtitle}>
              Cerca il cliente, seleziona la bici corretta e crea una nuova
              lavorazione in pochi passaggi.
            </p>
          </div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>1. Seleziona cliente</div>
          <div style={sectionText}>
            Cerca per nome, telefono o email.
          </div>

          <input
            style={input}
            placeholder="🔍 Cerca cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                setSelectedCustomer(null);
                setSelectedBike(null);
                setBikes([]);
              }
            }}
          />

          {loadingCustomers ? (
            <div style={helperBox}>Caricamento clienti...</div>
          ) : results.length > 0 ? (
            <div style={resultsGrid}>
              {results.map((c) => (
                <button
                  key={c.id}
                  style={customerCard}
                  onClick={() => selectCustomer(c)}
                >
                  <div style={customerName}>{c.name || "-"}</div>
                  <div style={customerInfo}>📞 {c.phone || "-"}</div>
                  <div style={customerInfo}>✉️ {c.email || "-"}</div>
                </button>
              ))}
            </div>
          ) : search.trim().length >= 2 ? (
            <div style={helperBox}>Nessun cliente trovato.</div>
          ) : (
            <div style={helperBox}>Scrivi almeno 2 caratteri per iniziare.</div>
          )}
        </div>

        {selectedCustomer && (
          <div style={selectedCustomerBox}>
            <div style={selectedHeader}>
              <div style={selectedAvatar}>
                {(selectedCustomer.name || "?").charAt(0).toUpperCase()}
              </div>

              <div>
                <div style={selectedTitle}>{selectedCustomer.name}</div>
                <div style={customerInfo}>📞 {selectedCustomer.phone || "-"}</div>
                <div style={customerInfo}>✉️ {selectedCustomer.email || "-"}</div>
              </div>
            </div>

            <button
              style={changeBtn}
              onClick={() => {
                setSelectedCustomer(null);
                setSelectedBike(null);
                setBikes([]);
                setSearch("");
              }}
            >
              Cambia cliente
            </button>
          </div>
        )}

        {selectedCustomer && (
          <div style={section}>
            <div style={sectionTitle}>2. Seleziona bici</div>
            <div style={sectionText}>
              Scegli la bici del cliente da associare alla lavorazione.
            </div>

            {loadingBikes ? (
              <div style={helperBox}>Caricamento bici cliente...</div>
            ) : bikes.length === 0 ? (
              <div style={helperBox}>
                Questo cliente non ha bici registrate.
              </div>
            ) : (
              <div style={bikeGrid}>
                {bikes.map((b) => {
                  const active = selectedBike?.id === b.id;

                  return (
                    <button
                      key={b.id}
                      style={{
                        ...bikeCard,
                        ...(active ? bikeCardActive : {}),
                      }}
                      onClick={() => setSelectedBike(b)}
                    >
                      <div style={bikeTitle}>
                        🚲 {b.brand || "-"} {b.model || ""}
                      </div>

                      <div style={bikeMetaGrid}>
                        <div>
                          <span style={bikeMetaLabel}>Telaio</span>
                          <span style={bikeMetaValue}>{b.serial || "-"}</span>
                        </div>

                        <div>
                          <span style={bikeMetaLabel}>Colore</span>
                          <span style={bikeMetaValue}>{b.color || "-"}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={section}>
          <div style={sectionTitle}>3. Note lavoro</div>
          <div style={sectionText}>
            Inserisci eventuali indicazioni iniziali o richiesta del cliente.
          </div>

          <textarea
            style={textarea}
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Descrivi il problema, gli interventi richiesti o le note iniziali..."
          />
        </div>

        <div style={summaryCard}>
          <div style={summaryTitle}>Riepilogo scheda</div>

          <div style={summaryRow}>
            <span>Cliente</span>
            <strong>{selectedCustomer?.name || "Non selezionato"}</strong>
          </div>

          <div style={summaryRow}>
            <span>Bici</span>
            <strong>
              {selectedBike
                ? `${selectedBike.brand || "-"} ${selectedBike.model || ""}`
                : "Non selezionata"}
            </strong>
          </div>

          <div style={summaryRow}>
            <span>Stato iniziale</span>
            <strong>Aperta</strong>
          </div>
        </div>

        <div style={footer}>
          <button
            className="ghost"
            onClick={() => router.push("/workorders")}
            style={secondaryBtn}
            disabled={creating}
          >
            Annulla
          </button>

          <button
            className="create"
            onClick={createWorkOrder}
            style={{
              ...createBtn,
              opacity:
                !selectedCustomer || !selectedBike || creating ? 0.7 : 1,
              cursor:
                !selectedCustomer || !selectedBike || creating
                  ? "not-allowed"
                  : "pointer",
            }}
            disabled={!selectedCustomer || !selectedBike || creating}
          >
            {creating ? "Creazione..." : "Crea scheda lavoro"}
          </button>
        </div>
      </div>
    </div>
  );
}

const page: React.CSSProperties = {
  background: "#f8fafc",
  minHeight: "100vh",
  padding: 32,
};

const container: React.CSSProperties = {
  background: "white",
  padding: 32,
  borderRadius: 24,
  width: "100%",
  maxWidth: 900,
  margin: "0 auto",
  boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const topBar: React.CSSProperties = {
  marginBottom: -8,
};

const backBtn: React.CSSProperties = {
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #dbe2ea",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const hero: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
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
  color: "#0f172a",
};

const subtitle: React.CSSProperties = {
  marginTop: 8,
  color: "#64748b",
  fontSize: 15,
  lineHeight: 1.5,
};

const section: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#0f172a",
};

const sectionText: React.CSSProperties = {
  fontSize: 14,
  color: "#64748b",
};

const input: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid #dbe2ea",
  fontSize: 14,
  outline: "none",
};

const textarea: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid #dbe2ea",
  fontSize: 14,
  outline: "none",
  resize: "vertical",
};

const resultsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const customerCard: React.CSSProperties = {
  padding: 14,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  cursor: "pointer",
  transition: "all 0.2s",
  background: "#fff",
  textAlign: "left",
};

const helperBox: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: 14,
  padding: 16,
  color: "#64748b",
  fontSize: 14,
};

const selectedCustomerBox: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  background: "#f8fbff",
  border: "1px solid #bfdbfe",
  padding: 18,
  borderRadius: 18,
  flexWrap: "wrap",
};

const selectedHeader: React.CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "center",
};

const selectedAvatar: React.CSSProperties = {
  width: 50,
  height: 50,
  borderRadius: 14,
  background: "#dbeafe",
  color: "#1d4ed8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 20,
};

const selectedTitle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: 4,
};

const changeBtn: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #dbe2ea",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const customerName: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 15,
  color: "#0f172a",
  marginBottom: 6,
};

const customerInfo: React.CSSProperties = {
  fontSize: 13,
  color: "#64748b",
  marginTop: 2,
};

const bikeGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const bikeCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: 16,
  borderRadius: 16,
  cursor: "pointer",
  transition: "all 0.2s",
  background: "#fff",
  textAlign: "left",
};

const bikeCardActive: React.CSSProperties = {
  border: "2px solid #2563eb",
  background: "#eff6ff",
  boxShadow: "0 10px 24px rgba(37,99,235,0.12)",
};

const bikeTitle: React.CSSProperties = {
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: 12,
};

const bikeMetaGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const bikeMetaLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "#64748b",
  marginBottom: 4,
};

const bikeMetaValue: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#0f172a",
  fontWeight: 700,
};

const summaryCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
};

const summaryTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: 14,
};

const summaryRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 0",
  borderBottom: "1px solid #eef2f7",
  color: "#334155",
};

const footer: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 8,
  flexWrap: "wrap",
};

const secondaryBtn: React.CSSProperties = {
  padding: "12px 16px",
  border: "1px solid #d1d5db",
  background: "#f8fafc",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};

const createBtn: React.CSSProperties = {
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "white",
  border: "none",
  padding: "14px 18px",
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 15,
  boxShadow: "0 12px 24px rgba(37,99,235,0.2)",
};

const toastStyle: React.CSSProperties = {
  position: "fixed",
  top: 24,
  right: 24,
  zIndex: 1100,
  padding: "14px 18px",
  borderRadius: 14,
  fontWeight: 700,
  boxShadow: "0 12px 30px rgba(15,23,42,0.16)",
  maxWidth: 420,
};

const toastSuccess: React.CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
};

const toastError: React.CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fca5a5",
};

const toastInfo: React.CSSProperties = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #93c5fd",
};
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type Bike = {
  id: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  type: string | null;
  frame_number: string | null;
  purchase_date: string | null;
  invoice_number: string | null;
  purchase_price: number | null;
  current_value: number | null;
  sale_price: number | null;
  created_at?: string | null;
};

type Movement = {
  id: string;
  product_id: string | null;
  quantity: number | null;
  type: string | null;
  bike_id: string | null;
  created_at: string | null;
};

type ProductLite = {
  id: string;
  title: string | null;
  ean: string | null;
  price_b2b: number | null;
};

type MovementRow = {
  id: string;
  created_at: string | null;
  quantity: number;
  product_id: string | null;
  product_title: string;
  product_ean: string;
  unit_value: number;
  total_value: number;
  type: string;
};

type ToastType = "success" | "error" | "info";

export default function BikePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const id = params.id as string;
  const readOnly = searchParams.get("view") === "true";

  const [bike, setBike] = useState<Bike | null>(null);
  const [originalBike, setOriginalBike] = useState<Bike | null>(null);

  const [mountedItems, setMountedItems] = useState<MovementRow[]>([]);
  const [disassembledItems, setDisassembledItems] = useState<MovementRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  useEffect(() => {
    loadPageData();
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadPageData() {
    setLoading(true);
    await Promise.all([loadBike(), loadHistory()]);
    setLoading(false);
  }

  async function loadBike() {
    const { data, error } = await supabase
      .from("inventory_bikes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      setToast({
        message: `Errore nel caricamento bici: ${error.message}`,
        type: "error",
      });
      return;
    }

    setBike(data as Bike);
    setOriginalBike(data as Bike);
  }

  async function loadHistory() {
    setHistoryLoading(true);

    const { data: movementData, error: movementError } = await supabase
      .from("inventory_movements")
      .select("id, product_id, quantity, type, bike_id, created_at")
      .eq("bike_id", id)
      .in("type", ["recupero_bici", "scarico"])
      .order("created_at", { ascending: false });

    if (movementError) {
      setToast({
        message: `Errore caricamento storico: ${movementError.message}`,
        type: "error",
      });
      setHistoryLoading(false);
      return;
    }

    const movements = (movementData as Movement[]) || [];

    const productIds = [
      ...new Set(
        movements
          .map((m) => m.product_id)
          .filter((productId): productId is string => Boolean(productId))
      ),
    ];

    let productsMap = new Map<string, ProductLite>();

    if (productIds.length > 0) {
      const { data: productsData } = await supabase
        .from("products")
        .select("id, title, ean, price_b2b")
        .in("id", productIds);

      productsMap = new Map(
        (((productsData as ProductLite[]) || []).map((p) => [p.id, p]))
      );
    }

    const rows: MovementRow[] = movements.map((movement) => {
      const product = movement.product_id
        ? productsMap.get(movement.product_id)
        : undefined;

      const quantity = Number(movement.quantity || 0);
      const unitValue = Number(product?.price_b2b || 0);

      return {
        id: movement.id,
        created_at: movement.created_at,
        quantity,
        product_id: movement.product_id,
        product_title: product?.title || "Prodotto non trovato",
        product_ean: product?.ean || "-",
        unit_value: unitValue,
        total_value: unitValue * quantity,
        type: movement.type || "",
      };
    });

    setDisassembledItems(rows.filter((r) => r.type === "recupero_bici"));
    setMountedItems(rows.filter((r) => r.type === "scarico"));
    setHistoryLoading(false);
  }

  const isDirty = useMemo(() => {
    if (!bike || !originalBike) return false;
    return JSON.stringify(bike) !== JSON.stringify(originalBike);
  }, [bike, originalBike]);

  const totalMountedValue = useMemo(
    () => mountedItems.reduce((sum, item) => sum + item.total_value, 0),
    [mountedItems]
  );

  const totalDisassembledValue = useMemo(
    () => disassembledItems.reduce((sum, item) => sum + item.total_value, 0),
    [disassembledItems]
  );

  const mountedQty = useMemo(
    () => mountedItems.reduce((sum, item) => sum + item.quantity, 0),
    [mountedItems]
  );

  const disassembledQty = useMemo(
    () => disassembledItems.reduce((sum, item) => sum + item.quantity, 0),
    [disassembledItems]
  );

  function formatCurrency(value: number | null | undefined) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(Number(value || 0));
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  async function saveBike() {
    if (!bike) return;

    if (!bike.brand?.trim()) {
      setToast({ message: "Il marchio è obbligatorio.", type: "error" });
      return;
    }

    if (!bike.model?.trim()) {
      setToast({ message: "Il modello è obbligatorio.", type: "error" });
      return;
    }

    if (!bike.frame_number?.trim()) {
      setToast({
        message: "Il numero di telaio è obbligatorio.",
        type: "error",
      });
      return;
    }

    setSaving(true);

    const payload = {
      brand: bike.brand?.trim() || null,
      model: bike.model?.trim() || null,
      color: bike.color?.trim() || null,
      type: bike.type?.trim() || null,
      frame_number: bike.frame_number?.trim() || null,
      purchase_date: bike.purchase_date || null,
      invoice_number: bike.invoice_number?.trim() || null,
      purchase_price:
        bike.purchase_price === null || bike.purchase_price === undefined
          ? null
          : Number(bike.purchase_price),
      current_value:
        bike.current_value === null || bike.current_value === undefined
          ? null
          : Number(bike.current_value),
      sale_price:
        bike.sale_price === null || bike.sale_price === undefined
          ? null
          : Number(bike.sale_price),
    };

    const { data, error } = await supabase
      .from("inventory_bikes")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      setToast({
        message: `Errore nel salvataggio: ${error.message}`,
        type: "error",
      });
      setSaving(false);
      return;
    }

    setBike(data as Bike);
    setOriginalBike(data as Bike);
    setToast({
      message: "Modifiche salvate correttamente.",
      type: "success",
    });
    setSaving(false);
  }

  async function deleteBike() {
    if (!bike) return;

    const firstConfirm = window.confirm(
      `Vuoi davvero eliminare la bici "${bike.brand || ""} ${bike.model || ""}"?`
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "Conferma definitiva: questa eliminazione non può essere annullata. Procedere?"
    );
    if (!secondConfirm) return;

    setDeleting(true);

    const { error } = await supabase
      .from("inventory_bikes")
      .delete()
      .eq("id", id);

    if (error) {
      setToast({
        message: `Errore durante l'eliminazione: ${error.message}`,
        type: "error",
      });
      setDeleting(false);
      return;
    }

    alert("Bici eliminata correttamente.");
    router.push("/inventory-bikes");
  }

  if (loading) {
    return <div style={loadingStyle}>Caricamento bici...</div>;
  }

  if (!bike) {
    return <div style={loadingStyle}>Bici non trovata.</div>;
  }

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

      <div style={topNav}>
        <a href="#overview" style={anchorLink}>Overview</a>
        <a href="#details" style={anchorLink}>Dettagli</a>
        <a href="#mounted" style={anchorLink}>Montati</a>
        <a href="#disassembled" style={anchorLink}>Smontati</a>
      </div>

      <section id="overview" style={heroCard}>
        <div style={heroLeft}>
          <div style={heroIcon}>🚲</div>
          <div>
            <div style={breadcrumb}>Inventario bici / Dettaglio asset</div>
            <h1 style={title}>
              {bike.brand || "Brand"} {bike.model || "Modello"}
            </h1>
            <div style={heroMeta}>
              <span style={typeBadge}>{bike.type || "Tipo non definito"}</span>
              <span style={metaText}>Telaio: {bike.frame_number || "-"}</span>
              <span style={metaText}>Colore: {bike.color || "-"}</span>
            </div>
          </div>
        </div>

        <div style={heroRight}>
          <div style={heroValueLabel}>Valore attuale</div>
          <div style={heroValue}>{formatCurrency(bike.current_value)}</div>
        </div>
      </section>

      <div style={quickActions}>
        <button onClick={() => router.push("/inventory-bikes")} style={secondaryBtn}>
          ← Torna elenco
        </button>

        <Link href={`/bike-disassembly?bikeId=${bike.id}`} style={quickLinkBtn}>
          🛠 Smonta componente
        </Link>

        <Link href={`/install-component?bikeId=${bike.id}`} style={quickLinkBtn}>
          🔩 Monta componente
        </Link>

        <Link href={`/movements?bikeId=${bike.id}`} style={quickLinkBtn}>
          🔄 Vedi movimenti collegati
        </Link>

        {!readOnly && (
          <>
            <button
              onClick={deleteBike}
              style={dangerBtn}
              disabled={deleting || saving}
            >
              {deleting ? "Eliminazione..." : "Elimina bici"}
            </button>

            <button
              onClick={saveBike}
              disabled={saving || !isDirty}
              style={{
                ...saveBtn,
                opacity: saving || !isDirty ? 0.7 : 1,
                cursor: saving || !isDirty ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Salvataggio..." : "Salva modifiche"}
            </button>
          </>
        )}
      </div>

      {readOnly && (
        <div style={readOnlyBanner}>
          Questa scheda è in sola lettura perché è stata aperta dalla pagina movimenti.
        </div>
      )}

      <div style={kpiGrid}>
        <KpiCard label="Prezzo acquisto" value={formatCurrency(bike.purchase_price)} />
        <KpiCard label="Prezzo vendita" value={formatCurrency(bike.sale_price)} />
        <KpiCard label="Valore montato" value={formatCurrency(totalMountedValue)} />
        <KpiCard label="Valore recuperato" value={formatCurrency(totalDisassembledValue)} />
        <KpiCard label="Pezzi montati" value={String(mountedQty)} />
        <KpiCard label="Pezzi smontati" value={String(disassembledQty)} />
      </div>

      <section id="details" style={sectionCard}>
        <div style={sectionHead}>
          <h2 style={sectionTitle}>Dettagli bici</h2>
          <span style={sectionHint}>Anagrafica e valori economici</span>
        </div>

        <div style={formGrid}>
          <Field label="Marchio" value={bike.brand} onChange={(v) => setBike({ ...bike, brand: v })} readOnly={readOnly} />
          <Field label="Modello" value={bike.model} onChange={(v) => setBike({ ...bike, model: v })} readOnly={readOnly} />
          <Field label="Colore" value={bike.color} onChange={(v) => setBike({ ...bike, color: v })} readOnly={readOnly} />
          <Field label="Tipo" value={bike.type} onChange={(v) => setBike({ ...bike, type: v })} readOnly={readOnly} />
          <Field label="Numero telaio" value={bike.frame_number} onChange={(v) => setBike({ ...bike, frame_number: v })} readOnly={readOnly} />
          <Field label="Data acquisto" value={bike.purchase_date} onChange={(v) => setBike({ ...bike, purchase_date: v })} readOnly={readOnly} type="date" />
          <Field label="Numero fattura" value={bike.invoice_number} onChange={(v) => setBike({ ...bike, invoice_number: v })} readOnly={readOnly} />
          <Field label="Prezzo acquisto" value={bike.purchase_price} onChange={(v) => setBike({ ...bike, purchase_price: v === "" ? null : Number(v) })} readOnly={readOnly} type="number" />
          <Field label="Valore attuale" value={bike.current_value} onChange={(v) => setBike({ ...bike, current_value: v === "" ? null : Number(v) })} readOnly={readOnly} type="number" />
          <Field label="Prezzo vendita" value={bike.sale_price} onChange={(v) => setBike({ ...bike, sale_price: v === "" ? null : Number(v) })} readOnly={readOnly} type="number" />
        </div>
      </section>

      <section id="mounted" style={sectionCard}>
        <div style={sectionHead}>
          <h2 style={sectionTitle}>Componenti montati</h2>
          <span style={sectionHint}>Ricambi usciti dal magazzino e applicati alla bici</span>
        </div>

        <MovementTable
          rows={mountedItems}
          loading={historyLoading}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          tone="positive"
        />
      </section>

      <section id="disassembled" style={sectionCard}>
        <div style={sectionHead}>
          <h2 style={sectionTitle}>Componenti smontati</h2>
          <span style={sectionHint}>Ricambi recuperati dalla bici e rientrati a magazzino</span>
        </div>

        <MovementTable
          rows={disassembledItems}
          loading={historyLoading}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          tone="negative"
        />
      </section>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={kpiCard}>
      <div style={kpiLabel}>{label}</div>
      <div style={kpiValue}>{value}</div>
    </div>
  );
}

function MovementTable({
  rows,
  loading,
  formatCurrency,
  formatDate,
  tone,
}: {
  rows: MovementRow[];
  loading: boolean;
  formatCurrency: (value: number) => string;
  formatDate: (value: string | null) => string;
  tone: "positive" | "negative";
}) {
  if (loading) {
    return <div style={emptyState}>Caricamento storico...</div>;
  }

  if (rows.length === 0) {
    return <div style={emptyState}>Nessun movimento registrato.</div>;
  }

  return (
    <div style={tableWrap}>
      <div style={tableHead}>
        <div>Data</div>
        <div>Componente</div>
        <div>Riferimento</div>
        <div>Quantità</div>
        <div>Valore unitario</div>
        <div>Totale</div>
      </div>

      {rows.map((item) => (
        <div key={item.id} style={tableRow}>
          <div style={tableCell}>{formatDate(item.created_at)}</div>
          <div style={tableCellStrong}>{item.product_title}</div>
          <div style={tableCellMuted}>{item.product_ean}</div>
          <div style={tableCell}>{item.quantity}</div>
          <div style={tableCell}>{formatCurrency(item.unit_value)}</div>
          <div
            style={{
              ...tableCellStrong,
              color: tone === "positive" ? "#047857" : "#be123c",
            }}
          >
            {tone === "positive" ? "+" : "-"} {formatCurrency(item.total_value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  readOnly: boolean;
  type?: string;
}) {
  return (
    <div style={field}>
      <label style={fieldLabel}>{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        style={{
          ...input,
          ...(readOnly ? inputReadOnly : {}),
        }}
      />
    </div>
  );
}

const page: React.CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: 24,
  background: "#f8fafc",
  minHeight: "100vh",
};

const loadingStyle: React.CSSProperties = {
  padding: 40,
  color: "#475569",
};

const topNav: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 16,
};

const anchorLink: React.CSSProperties = {
  textDecoration: "none",
  color: "#1d4ed8",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
};

const heroCard: React.CSSProperties = {
  background: "linear-gradient(135deg,#ffffff,#f8fbff)",
  border: "1px solid #e2e8f0",
  borderRadius: 24,
  padding: 24,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap",
  boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
};

const heroLeft: React.CSSProperties = {
  display: "flex",
  gap: 16,
  alignItems: "center",
};

const heroIcon: React.CSSProperties = {
  width: 68,
  height: 68,
  borderRadius: 20,
  background: "#dbeafe",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 30,
};

const breadcrumb: React.CSSProperties = {
  fontSize: 13,
  color: "#64748b",
  marginBottom: 8,
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: 32,
  fontWeight: 800,
  color: "#0f172a",
};

const heroMeta: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 10,
};

const typeBadge: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#0f766e",
  fontSize: 13,
  fontWeight: 700,
};

const metaText: React.CSSProperties = {
  color: "#64748b",
  fontSize: 14,
};

const heroRight: React.CSSProperties = {
  textAlign: "right",
};

const heroValueLabel: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  marginBottom: 6,
};

const heroValue: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 800,
  color: "#059669",
};

const quickActions: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 18,
  marginBottom: 20,
};

const quickLinkBtn: React.CSSProperties = {
  textDecoration: "none",
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #dbe2ea",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 700,
};

const saveBtn: React.CSSProperties = {
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "#fff",
  border: "none",
  padding: "12px 18px",
  borderRadius: 12,
  fontWeight: 700,
};

const secondaryBtn: React.CSSProperties = {
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #dbe2ea",
  padding: "12px 18px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 600,
};

const dangerBtn: React.CSSProperties = {
  background: "#fff1f2",
  color: "#be123c",
  border: "1px solid #fecdd3",
  padding: "12px 18px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};

const readOnlyBanner: React.CSSProperties = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  padding: "14px 16px",
  borderRadius: 14,
  marginBottom: 20,
  fontSize: 14,
};

const kpiGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const kpiCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
};

const kpiLabel: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  marginBottom: 8,
};

const kpiValue: React.CSSProperties = {
  color: "#0f172a",
  fontSize: 24,
  fontWeight: 800,
};

const sectionCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  padding: 24,
  boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
  marginBottom: 24,
};

const sectionHead: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 18,
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
  color: "#0f172a",
};

const sectionHint: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
};

const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 18,
};

const field: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const fieldLabel: React.CSSProperties = {
  fontSize: 13,
  color: "#64748b",
  marginBottom: 8,
  fontWeight: 600,
};

const input: React.CSSProperties = {
  padding: "12px 14px",
  border: "1px solid #dbe2ea",
  borderRadius: 12,
  fontSize: 14,
  outline: "none",
  background: "#fff",
};

const inputReadOnly: React.CSSProperties = {
  background: "#f8fafc",
  color: "#475569",
  cursor: "not-allowed",
};

const tableWrap: React.CSSProperties = {
  overflow: "hidden",
  border: "1px solid #edf2f7",
  borderRadius: 18,
};

const tableHead: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.3fr 1.8fr 1.2fr 0.8fr 1fr 1fr",
  gap: 12,
  padding: "14px 16px",
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 12,
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
};

const tableRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.3fr 1.8fr 1.2fr 0.8fr 1fr 1fr",
  gap: 12,
  padding: "16px",
  borderBottom: "1px solid #f1f5f9",
  alignItems: "center",
};

const tableCell: React.CSSProperties = {
  fontSize: 14,
  color: "#0f172a",
};

const tableCellStrong: React.CSSProperties = {
  fontSize: 14,
  color: "#0f172a",
  fontWeight: 700,
};

const tableCellMuted: React.CSSProperties = {
  fontSize: 13,
  color: "#64748b",
};

const emptyState: React.CSSProperties = {
  padding: 28,
  textAlign: "center",
  color: "#64748b",
};

const toastStyle: React.CSSProperties = {
  position: "fixed",
  top: 24,
  right: 24,
  zIndex: 1000,
  padding: "14px 18px",
  borderRadius: 14,
  fontWeight: 700,
  boxShadow: "0 12px 30px rgba(15,23,42,0.16)",
};

const toastSuccess: React.CSSProperties = {
  background: "#ecfdf5",
  color: "#065f46",
  border: "1px solid #a7f3d0",
};

const toastError: React.CSSProperties = {
  background: "#fff1f2",
  color: "#9f1239",
  border: "1px solid #fecdd3",
};

const toastInfo: React.CSSProperties = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
};
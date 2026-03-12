"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Modal from "@/components/Modal";

type Product = {
  id: string;
  title: string;
  description: string | null;
  ean: string | null;
  location: string | null;
  warehouse_qty: number;
  price_b2b: number | null;
  price_b2c: number | null;
};

type ToastType = "success" | "error" | "info";
type StockFilter = "all" | "available" | "low" | "out";
type SortOption =
  | "title_asc"
  | "title_desc"
  | "qty_desc"
  | "qty_asc"
  | "value_desc"
  | "value_asc";

const LOW_STOCK_THRESHOLD = 3;

export default function InventoryPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("title_asc");

  const [toast, setToast] = useState<{
    type: ToastType;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("title");

    if (error) {
      console.error("Errore caricamento prodotti:", error);
      setToast({
        type: "error",
        message: `Errore caricamento prodotti: ${error.message}`,
      });
      setLoading(false);
      return;
    }

    setProducts((data as Product[]) || []);
    setLoading(false);
  }

  function formatCurrency(value: number | null | undefined) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(Number(value || 0));
  }

  function stockValue(product: Product) {
    return Number(product.price_b2b || 0) * Number(product.warehouse_qty || 0);
  }

  function getStockStatus(product: Product) {
    const qty = Number(product.warehouse_qty || 0);

    if (qty <= 0) {
      return {
        label: "Esaurito",
        style: stockBadgeOut,
      };
    }

    if (qty <= LOW_STOCK_THRESHOLD) {
      return {
        label: "Scorta bassa",
        style: stockBadgeLow,
      };
    }

    return {
      label: "Disponibile",
      style: stockBadgeOk,
    };
  }

  const uniqueLocations = useMemo(() => {
    return [...new Set(products.map((p) => (p.location || "").trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
  }, [products]);

  const filtered = useMemo(() => {
    let result = [...products];

    const q = search.trim().toLowerCase();

    if (q) {
      result = result.filter((p) => {
        const text = [
          p.title || "",
          p.ean || "",
          p.description || "",
          p.location || "",
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(q);
      });
    }

    if (stockFilter !== "all") {
      result = result.filter((p) => {
        const qty = Number(p.warehouse_qty || 0);

        if (stockFilter === "available") return qty > LOW_STOCK_THRESHOLD;
        if (stockFilter === "low") return qty > 0 && qty <= LOW_STOCK_THRESHOLD;
        if (stockFilter === "out") return qty <= 0;
        return true;
      });
    }

    if (locationFilter) {
      result = result.filter((p) => (p.location || "") === locationFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "title_desc":
          return (b.title || "").localeCompare(a.title || "");
        case "qty_desc":
          return Number(b.warehouse_qty || 0) - Number(a.warehouse_qty || 0);
        case "qty_asc":
          return Number(a.warehouse_qty || 0) - Number(b.warehouse_qty || 0);
        case "value_desc":
          return stockValue(b) - stockValue(a);
        case "value_asc":
          return stockValue(a) - stockValue(b);
        case "title_asc":
        default:
          return (a.title || "").localeCompare(b.title || "");
      }
    });

    return result;
  }, [products, search, stockFilter, locationFilter, sortBy]);

  async function updateProduct() {
    if (!editProduct) return;

    if (!editProduct.title?.trim()) {
      setToast({
        type: "error",
        message: "Il nome prodotto è obbligatorio.",
      });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("products")
      .update({
        title: editProduct.title.trim(),
        description: editProduct.description?.trim() || null,
        ean: editProduct.ean?.trim() || null,
        location: editProduct.location?.trim() || null,
        warehouse_qty: Number(editProduct.warehouse_qty || 0),
        price_b2b:
          editProduct.price_b2b === null || editProduct.price_b2b === undefined
            ? null
            : Number(editProduct.price_b2b),
        price_b2c:
          editProduct.price_b2c === null || editProduct.price_b2c === undefined
            ? null
            : Number(editProduct.price_b2c),
      })
      .eq("id", editProduct.id);

    if (error) {
      console.error("Errore update prodotto:", error);
      setToast({
        type: "error",
        message: `Errore salvataggio: ${error.message}`,
      });
      setSaving(false);
      return;
    }

    setEditProduct(null);
    await loadProducts();
    setSaving(false);

    setToast({
      type: "success",
      message: "Articolo aggiornato correttamente.",
    });
  }

  async function deleteProduct() {
    if (!editProduct) return;

    const confirmDelete = window.confirm(
      `Eliminare definitivamente l'articolo "${editProduct.title}"?`
    );

    if (!confirmDelete) return;

    setDeleting(true);

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", editProduct.id);

    if (error) {
      console.error("Errore eliminazione prodotto:", error);
      setToast({
        type: "error",
        message: `Errore eliminazione: ${error.message}`,
      });
      setDeleting(false);
      return;
    }

    setEditProduct(null);
    await loadProducts();
    setDeleting(false);

    setToast({
      type: "success",
      message: "Articolo eliminato correttamente.",
    });
  }

  function exportCSV() {
    const rows = filtered.map((p) => ({
      nome: p.title || "",
      descrizione: p.description || "",
      ean: p.ean || "",
      posizione: p.location || "",
      quantita: p.warehouse_qty || 0,
      prezzo_b2b: p.price_b2b || 0,
      prezzo_b2c: p.price_b2c || 0,
      valore: stockValue(p).toFixed(2),
    }));

    const headers = Object.keys(rows[0] || {
      nome: "",
      descrizione: "",
      ean: "",
      posizione: "",
      quantita: "",
      prezzo_b2b: "",
      prezzo_b2c: "",
      valore: "",
    });

    const csv = [
      headers.join(";"),
      ...rows.map((row) =>
        headers
          .map((h) => `"${String((row as any)[h] ?? "").replace(/"/g, '""')}"`)
          .join(";")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "magazzino.csv";
    a.click();
    URL.revokeObjectURL(url);

    setToast({
      type: "success",
      message: "CSV esportato correttamente.",
    });
  }

  const totalItems = products.length;
  const totalFiltered = filtered.length;

  const totalValue = products.reduce((acc, p) => {
    return acc + stockValue(p);
  }, 0);

  const totalQty = products.reduce((acc, p) => {
    return acc + Number(p.warehouse_qty || 0);
  }, 0);

  const outOfStockCount = products.filter((p) => Number(p.warehouse_qty || 0) <= 0).length;
  const lowStockCount = products.filter((p) => {
    const qty = Number(p.warehouse_qty || 0);
    return qty > 0 && qty <= LOW_STOCK_THRESHOLD;
  }).length;

  return (
    <div style={container}>
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

      <div style={header}>
        <div>
          <h1 style={pageTitle}>Magazzino</h1>
          <p style={pageSubtitle}>
            Gestisci prodotti, quantità, prezzi e valore complessivo del magazzino.
          </p>
        </div>

        <div style={headerActions}>
          <button onClick={exportCSV} style={secondaryButton}>
            ⬇ Esporta CSV
          </button>

          <button
            onClick={() => router.push("/inventory/new")}
            style={primaryButton}
          >
            + Nuovo articolo
          </button>
        </div>
      </div>

      <div style={counters}>
        <div style={counterCard}>
          <div style={counterLabel}>Articoli totali</div>
          <div style={counterValue}>{totalItems}</div>
        </div>

        <div style={counterCard}>
          <div style={counterLabel}>Quantità complessiva</div>
          <div style={counterValue}>{totalQty}</div>
        </div>

        <div style={counterCard}>
          <div style={counterLabel}>Valore magazzino</div>
          <div style={counterValue}>{formatCurrency(totalValue)}</div>
        </div>

        <div style={counterCard}>
          <div style={counterLabel}>Scorte basse</div>
          <div style={counterValue}>{lowStockCount}</div>
        </div>

        <div style={counterCard}>
          <div style={counterLabel}>Esauriti</div>
          <div style={counterValue}>{outOfStockCount}</div>
        </div>
      </div>

      <div style={filtersCard}>
        <div style={filtersGrid}>
          <input
            placeholder="Cerca nome, EAN, descrizione o posizione..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchInput}
          />

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            style={select}
          >
            <option value="all">Tutti gli articoli</option>
            <option value="available">Disponibili</option>
            <option value="low">Scorta bassa</option>
            <option value="out">Esauriti</option>
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={select}
          >
            <option value="">Tutte le posizioni</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={select}
          >
            <option value="title_asc">Nome A-Z</option>
            <option value="title_desc">Nome Z-A</option>
            <option value="qty_desc">Quantità maggiore</option>
            <option value="qty_asc">Quantità minore</option>
            <option value="value_desc">Valore maggiore</option>
            <option value="value_asc">Valore minore</option>
          </select>

          <button
            style={clearFiltersButton}
            onClick={() => {
              setSearch("");
              setStockFilter("all");
              setLocationFilter("");
              setSortBy("title_asc");
            }}
          >
            Reset
          </button>
        </div>

        <div style={filterSummary}>
          Risultati visualizzati: <strong>{totalFiltered}</strong>
        </div>
      </div>

      {loading ? (
        <div style={emptyBox}>Caricamento prodotti...</div>
      ) : filtered.length === 0 ? (
        <div style={emptyBox}>
          {search.trim() || stockFilter !== "all" || locationFilter
            ? "Nessun articolo trovato con i filtri attuali."
            : "Nessun articolo presente in magazzino."}
        </div>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr style={theadRow}>
                <th style={th}>Nome</th>
                <th style={th}>Descrizione</th>
                <th style={th}>EAN</th>
                <th style={th}>Posizione</th>
                <th style={th}>Stato</th>
                <th style={thCenter}>Q.tà</th>
                <th style={thRight}>B2B</th>
                <th style={thRight}>B2C</th>
                <th style={thRight}>Valore</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((p) => {
                const status = getStockStatus(p);

                return (
                  <tr
                    key={p.id}
                    onClick={() => setEditProduct(p)}
                    style={{
                      ...tableRow,
                      ...(Number(p.warehouse_qty || 0) <= LOW_STOCK_THRESHOLD
                        ? lowStockRow
                        : {}),
                    }}
                  >
                    <td style={td}>
                      <div style={titleCell}>{p.title}</div>
                    </td>

                    <td style={tdMuted}>{p.description || "-"}</td>
                    <td style={td}>{p.ean || "-"}</td>
                    <td style={td}>{p.location || "-"}</td>

                    <td style={td}>
                      <span style={{ ...stockBadgeBase, ...status.style }}>
                        {status.label}
                      </span>
                    </td>

                    <td style={tdCenter}>{p.warehouse_qty || 0}</td>
                    <td style={tdRight}>{formatCurrency(p.price_b2b)}</td>
                    <td style={tdRight}>{formatCurrency(p.price_b2c)}</td>
                    <td style={tdRightStrong}>{formatCurrency(stockValue(p))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editProduct && (
        <Modal title="Modifica articolo" onClose={() => setEditProduct(null)}>
          <div style={modalHeaderBox}>
            <div style={modalIcon}>📦</div>
            <div>
              <div style={modalTitle}>Scheda articolo</div>
              <div style={modalSubtitle}>
                Aggiorna dati, quantità, posizione e prezzi del prodotto.
              </div>
            </div>
          </div>

          <div style={formGrid2}>
            <div style={field}>
              <label style={label}>Nome prodotto</label>
              <input
                style={input}
                value={editProduct.title || ""}
                onChange={(e) =>
                  setEditProduct({ ...editProduct, title: e.target.value })
                }
              />
            </div>

            <div style={field}>
              <label style={label}>EAN</label>
              <input
                style={input}
                value={editProduct.ean || ""}
                onChange={(e) =>
                  setEditProduct({ ...editProduct, ean: e.target.value })
                }
              />
            </div>
          </div>

          <div style={formGrid2}>
            <div style={field}>
              <label style={label}>Posizione scaffale</label>
              <input
                style={input}
                value={editProduct.location || ""}
                onChange={(e) =>
                  setEditProduct({ ...editProduct, location: e.target.value })
                }
              />
            </div>

            <div style={field}>
              <label style={label}>Quantità magazzino</label>
              <input
                type="number"
                style={input}
                value={editProduct.warehouse_qty ?? 0}
                onChange={(e) =>
                  setEditProduct({
                    ...editProduct,
                    warehouse_qty: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div style={field}>
            <label style={label}>Descrizione</label>
            <textarea
              style={textarea}
              value={editProduct.description || ""}
              onChange={(e) =>
                setEditProduct({
                  ...editProduct,
                  description: e.target.value,
                })
              }
            />
          </div>

          <div style={formGrid2}>
            <div style={field}>
              <label style={label}>Prezzo B2B</label>
              <input
                type="number"
                style={input}
                value={editProduct.price_b2b ?? 0}
                onChange={(e) =>
                  setEditProduct({
                    ...editProduct,
                    price_b2b: Number(e.target.value),
                  })
                }
              />
            </div>

            <div style={field}>
              <label style={label}>Prezzo B2C</label>
              <input
                type="number"
                style={input}
                value={editProduct.price_b2c ?? 0}
                onChange={(e) =>
                  setEditProduct({
                    ...editProduct,
                    price_b2c: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div style={infoBox}>
            <div style={infoRow}>
              <span>Stato scorte</span>
              <span
                style={{
                  ...stockBadgeBase,
                  ...getStockStatus(editProduct).style,
                }}
              >
                {getStockStatus(editProduct).label}
              </span>
            </div>

            <div style={infoRow}>
              <span>Valore prodotto a magazzino</span>
              <strong>{formatCurrency(stockValue(editProduct))}</strong>
            </div>
          </div>

          <div style={footer}>
            <button
              onClick={deleteProduct}
              style={dangerButton}
              disabled={deleting || saving}
            >
              {deleting ? "Eliminazione..." : "Elimina"}
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setEditProduct(null)}
                style={secondaryButton}
                disabled={deleting || saving}
              >
                Annulla
              </button>

              <button
                onClick={updateProduct}
                style={primaryButton}
                disabled={saving || deleting}
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const container: React.CSSProperties = {
  maxWidth: 1280,
  margin: "32px auto",
  padding: "0 20px",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 24,
  flexWrap: "wrap",
};

const headerActions: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const pageTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 34,
  fontWeight: 800,
  color: "#0f172a",
};

const pageSubtitle: React.CSSProperties = {
  marginTop: 8,
  color: "#64748b",
  fontSize: 15,
};

const counters: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const counterCard: React.CSSProperties = {
  background: "#fff",
  padding: 20,
  borderRadius: 18,
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
};

const counterLabel: React.CSSProperties = {
  fontSize: 13,
  color: "#64748b",
  marginBottom: 8,
};

const counterValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  color: "#0f172a",
};

const filtersCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 16,
  marginBottom: 20,
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
};

const filtersGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
  gap: 12,
  alignItems: "center",
};

const filterSummary: React.CSSProperties = {
  marginTop: 12,
  fontSize: 13,
  color: "#64748b",
};

const searchInput: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #dbe2ea",
  borderRadius: 12,
  fontSize: 14,
  outline: "none",
  background: "#fff",
};

const select: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #dbe2ea",
  borderRadius: 12,
  fontSize: 14,
  outline: "none",
  background: "#fff",
};

const clearFiltersButton: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  background: "#f8fafc",
  cursor: "pointer",
  fontWeight: 700,
};

const tableWrap: React.CSSProperties = {
  overflowX: "auto",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 1080,
};

const theadRow: React.CSSProperties = {
  background: "#f8fafc",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 14,
  borderBottom: "1px solid #e5e7eb",
  fontSize: 12,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.3,
};

const thCenter: React.CSSProperties = {
  ...th,
  textAlign: "center",
};

const thRight: React.CSSProperties = {
  ...th,
  textAlign: "right",
};

const tableRow: React.CSSProperties = {
  cursor: "pointer",
  borderBottom: "1px solid #f1f5f9",
};

const lowStockRow: React.CSSProperties = {
  background: "#fffdf7",
};

const td: React.CSSProperties = {
  padding: 14,
  color: "#0f172a",
  fontSize: 14,
};

const tdMuted: React.CSSProperties = {
  ...td,
  color: "#64748b",
};

const tdCenter: React.CSSProperties = {
  ...td,
  textAlign: "center",
  fontWeight: 700,
};

const tdRight: React.CSSProperties = {
  ...td,
  textAlign: "right",
};

const tdRightStrong: React.CSSProperties = {
  ...tdRight,
  fontWeight: 800,
};

const titleCell: React.CSSProperties = {
  fontWeight: 700,
  color: "#0f172a",
};

const stockBadgeBase: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const stockBadgeOk: React.CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
};

const stockBadgeLow: React.CSSProperties = {
  background: "#fef3c7",
  color: "#b45309",
};

const stockBadgeOut: React.CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
};

const modalHeaderBox: React.CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
  marginBottom: 20,
};

const modalIcon: React.CSSProperties = {
  width: 50,
  height: 50,
  borderRadius: 14,
  background: "#dbeafe",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
  flexShrink: 0,
};

const modalTitle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: "#0f172a",
};

const modalSubtitle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 14,
  color: "#64748b",
};

const formGrid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 18,
  marginBottom: 18,
};

const field: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const label: React.CSSProperties = {
  fontSize: 13,
  color: "#475569",
  marginBottom: 8,
  fontWeight: 700,
};

const input: React.CSSProperties = {
  padding: 12,
  border: "1px solid #dbe2ea",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
};

const textarea: React.CSSProperties = {
  padding: 12,
  border: "1px solid #dbe2ea",
  borderRadius: 10,
  height: 120,
  width: "100%",
  marginBottom: 18,
  fontSize: 14,
  resize: "vertical",
  outline: "none",
};

const infoBox: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 16,
  marginBottom: 18,
};

const infoRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  color: "#0f172a",
  marginBottom: 10,
};

const footer: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 20,
  flexWrap: "wrap",
};

const primaryButton: React.CSSProperties = {
  background: "linear-gradient(135deg,#4f7cff,#3b82f6)",
  color: "#fff",
  border: "none",
  padding: "11px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 12px 24px rgba(59,130,246,0.18)",
};

const secondaryButton: React.CSSProperties = {
  padding: "11px 16px",
  border: "1px solid #d1d5db",
  background: "#f8fafc",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
  color: "#0f172a",
};

const dangerButton: React.CSSProperties = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  padding: "11px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const emptyBox: React.CSSProperties = {
  background: "#fff",
  border: "1px dashed #cbd5e1",
  borderRadius: 18,
  padding: 28,
  textAlign: "center",
  color: "#64748b",
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
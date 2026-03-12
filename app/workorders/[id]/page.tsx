"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type WorkOrder = {
  id: string;
  customer_id?: string | null;
  bike_id?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
  customers?: {
    id?: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  bikes?: {
    id?: string;
    brand?: string | null;
    model?: string | null;
    serial?: string | null;
    color?: string | null;
  } | null;
};

type Product = {
  id: string;
  title?: string | null;
  ean?: string | null;
  price_b2c?: number | null;
  warehouse_qty?: number | null;
};

type Part = {
  id: string;
  work_order_id: string;
  product_id: string;
  quantity: number;
  price_snapshot?: number | null;
  custom_price?: number | null;
  billable: boolean;
};

type Service = {
  id: string;
  work_order_id: string;
  title: string;
  hours?: number | null;
  notes?: string | null;
  custom_price?: number | null;
  service_date?: string | null;
};

type Toast = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export default function WorkOrderDetail() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const hourlyRate = 35;

  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingPart, setSavingPart] = useState(false);
  const [savingService, setSavingService] = useState(false);

  const [showPartsModal, setShowPartsModal] = useState(false);
  const [partSearch, setPartSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [partForm, setPartForm] = useState({
    quantity: 1,
    custom_price: "",
  });

  const [showServiceModal, setShowServiceModal] = useState(false);

  const [newService, setNewService] = useState({
    title: "",
    hours: 1,
    notes: "",
    custom_price: "",
    service_date: new Date().toISOString().split("T")[0],
  });

  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadData() {
    setLoading(true);

    const [
      { data: orderData },
      { data: productData },
      { data: partsData },
      { data: servicesData },
    ] = await Promise.all([
      supabase
        .from("work_orders")
        .select(
          `
            *,
            customers(*),
            bikes(*)
          `
        )
        .eq("id", id)
        .single(),
      supabase.from("products").select("*"),
      supabase.from("work_order_parts").select("*").eq("work_order_id", id),
      supabase.from("work_order_services").select("*").eq("work_order_id", id),
    ]);

    setOrder((orderData as WorkOrder) || null);
    setProducts((productData as Product[]) || []);
    setParts((partsData as Part[]) || []);
    setServices((servicesData as Service[]) || []);
    setLoading(false);
  }

  const productsMap = useMemo(() => {
    const map: Record<string, Product> = {};
    products.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  const filteredProducts =
    partSearch.trim().length >= 2
      ? products.filter((p) => {
          const q = partSearch.toLowerCase();
          return (
            p.title?.toLowerCase().includes(q) ||
            p.ean?.toLowerCase().includes(q)
          );
        })
      : [];

  async function savePart() {
    if (!selectedProduct) return;

    const qty = Number(partForm.quantity) || 1;
    if (qty <= 0) {
      setToast({ type: "error", message: "Inserisci una quantità valida." });
      return;
    }

    setSavingPart(true);

    const { error: partError } = await supabase.from("work_order_parts").insert({
      work_order_id: id,
      product_id: selectedProduct.id,
      quantity: qty,
      price_snapshot: selectedProduct.price_b2c,
      custom_price:
        partForm.custom_price !== "" ? Number(partForm.custom_price) : null,
      billable: true,
    });

    if (partError) {
      console.error("Errore inserimento ricambio:", partError);
      setToast({ type: "error", message: "Errore inserimento ricambio." });
      setSavingPart(false);
      return;
    }

    const newQty = (selectedProduct.warehouse_qty || 0) - qty;

    const { error: stockError } = await supabase
      .from("products")
      .update({
        warehouse_qty: newQty,
      })
      .eq("id", selectedProduct.id);

    if (stockError) {
      console.error("Errore update magazzino:", stockError);
    }

    const { error: movementError } = await supabase
      .from("inventory_movements")
      .insert({
        product_id: selectedProduct.id,
        quantity: -qty,
        type: "officina",
        work_order_id: id,
      });

    if (movementError) {
      console.error("Errore movimento:", movementError);
    }

    setShowPartsModal(false);
    setSelectedProduct(null);
    setPartSearch("");
    setPartForm({ quantity: 1, custom_price: "" });
    await loadData();
    setSavingPart(false);

    setToast({
      type: "success",
      message: "Ricambio aggiunto correttamente.",
    });
  }

  async function deletePart(partId: string) {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;

    const product = productsMap[part.product_id];

    await supabase.from("work_order_parts").delete().eq("id", partId);

    const newQty = (product?.warehouse_qty || 0) + part.quantity;

    await supabase
      .from("products")
      .update({
        warehouse_qty: newQty,
      })
      .eq("id", part.product_id);

    await supabase
      .from("inventory_movements")
      .delete()
      .eq("product_id", part.product_id)
      .eq("work_order_id", id)
      .eq("type", "officina");

    await loadData();

    setToast({
      type: "success",
      message: "Ricambio eliminato correttamente.",
    });
  }

  async function updateQty(partId: string, qty: number) {
    await supabase
      .from("work_order_parts")
      .update({ quantity: qty })
      .eq("id", partId);

    loadData();
  }

  async function updateCustomPrice(partId: string, price: number | null) {
    await supabase
      .from("work_order_parts")
      .update({ custom_price: price })
      .eq("id", partId);

    loadData();
  }

  async function toggleBillable(partId: string, current: boolean) {
    await supabase
      .from("work_order_parts")
      .update({ billable: !current })
      .eq("id", partId);

    loadData();
  }

  async function saveService() {
    const hours = Number(newService.hours) || 0;
    const customPrice =
      newService.custom_price !== "" ? Number(newService.custom_price) : null;

    if (!newService.title.trim()) {
      setToast({ type: "error", message: "Inserisci il titolo dell’intervento." });
      return;
    }

    setSavingService(true);

    await supabase.from("work_order_services").insert({
      work_order_id: id,
      title: newService.title,
      hours,
      notes: newService.notes,
      custom_price: customPrice,
      service_date: newService.service_date,
    });

    setShowServiceModal(false);
    setNewService({
      title: "",
      hours: 1,
      notes: "",
      custom_price: "",
      service_date: new Date().toISOString().split("T")[0],
    });

    await loadData();
    setSavingService(false);

    setToast({
      type: "success",
      message: "Intervento aggiunto correttamente.",
    });
  }

  async function deleteService(serviceId: string) {
    await supabase.from("work_order_services").delete().eq("id", serviceId);
    await loadData();

    setToast({
      type: "success",
      message: "Intervento eliminato correttamente.",
    });
  }

  const partsTotal = parts.reduce((acc, p) => {
    const product = productsMap[p.product_id];
    const listino = p.price_snapshot ?? product?.price_b2c ?? 0;
    const price = p.custom_price ?? listino;

    return acc + price * p.quantity;
  }, 0);

  const serviceTotal = services.reduce((acc, s) => {
    const price = s.custom_price ?? ((s.hours || 0) * hourlyRate);
    return acc + price;
  }, 0);

  const total = partsTotal + serviceTotal;

  if (!order || loading) {
    return <div style={{ padding: 40 }}>Caricamento...</div>;
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

      <div style={header}>
        <div>
          <div style={breadcrumb}>Schede officina / Dettaglio</div>
          <h1 style={title}>Scheda lavoro</h1>
          <p style={subtitle}>
            Gestisci ricambi, interventi e totale cliente in modo chiaro e rapido.
          </p>
        </div>

        <button
          onClick={() => router.push(`/workorders/${id}/report`)}
          style={printBtn}
        >
          🖨 Versione stampabile
        </button>
      </div>

      <div style={infoGrid}>
        <div style={infoCardWide}>
          <div style={sectionTitle}>Cliente e bici</div>

          <div style={infoRows}>
            <InfoRow label="Cliente" value={order.customers?.name || "-"} />
            <InfoRow label="Telefono" value={order.customers?.phone || "-"} />
            <InfoRow
              label="Bici"
              value={`${order.bikes?.brand || "-"} ${order.bikes?.model || ""}`}
            />
            <InfoRow label="Telaio" value={order.bikes?.serial || "-"} />
            <InfoRow label="Note" value={order.notes || "-"} />
          </div>
        </div>

        <div style={summaryCard}>
          <div style={sectionTitle}>Riepilogo economico</div>

          <div style={moneyRow}>
            <span>Ricambi</span>
            <strong>{partsTotal.toFixed(2)} €</strong>
          </div>

          <div style={moneyRow}>
            <span>Manodopera</span>
            <strong>{serviceTotal.toFixed(2)} €</strong>
          </div>

          <div style={divider} />

          <div style={totalRow}>
            <span>Totale cliente</span>
            <strong>{total.toFixed(2)} €</strong>
          </div>
        </div>
      </div>

      <section style={sectionCard}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionHeading}>Ricambi utilizzati</h2>
            <p style={sectionText}>
              Aggiungi ricambi alla scheda e gestisci prezzo, quantità e fatturazione.
            </p>
          </div>

          <button onClick={() => setShowPartsModal(true)} style={primaryBtn}>
            + Aggiungi ricambio
          </button>
        </div>

        {parts.length === 0 ? (
          <div style={emptyBox}>Nessun ricambio associato a questa scheda.</div>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Prodotto</th>
                  <th style={th}>Qtà</th>
                  <th style={th}>Prezzo</th>
                  <th style={th}>Fattura</th>
                  <th style={th}>Totale</th>
                  <th style={th}>Azioni</th>
                </tr>
              </thead>

              <tbody>
                {parts.map((p) => {
                  const product = productsMap[p.product_id];
                  const listino = p.price_snapshot ?? product?.price_b2c ?? 0;
                  const price = p.custom_price ?? listino;

                  return (
                    <tr key={p.id} style={row}>
                      <td style={td}>
                        <div style={cellTitle}>{product?.title || "-"}</div>
                        <div style={cellSub}>EAN: {product?.ean || "-"}</div>
                      </td>

                      <td style={td}>
                        <input
                          type="number"
                          value={p.quantity}
                          onChange={(e) => updateQty(p.id, Number(e.target.value))}
                          style={smallInput}
                        />
                      </td>

                      <td style={td}>
                        <div style={priceBox}>
                          <div style={oldPrice}>{listino} €</div>
                          <input
                            type="number"
                            value={p.custom_price ?? ""}
                            placeholder={String(listino)}
                            onChange={(e) =>
                              updateCustomPrice(
                                p.id,
                                e.target.value === "" ? null : Number(e.target.value)
                              )
                            }
                            style={smallInput}
                          />
                        </div>
                      </td>

                      <td style={td}>
                        <label style={checkboxWrap}>
                          <input
                            type="checkbox"
                            checked={p.billable}
                            onChange={() => toggleBillable(p.id, p.billable)}
                          />
                          <span>{p.billable ? "Fatturabile" : "Interno"}</span>
                        </label>
                      </td>

                      <td style={td}>
                        <strong>{(price * p.quantity).toFixed(2)} €</strong>
                      </td>

                      <td style={td}>
                        <button style={dangerGhostBtn} onClick={() => deletePart(p.id)}>
                          Elimina
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={sectionCard}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionHeading}>Interventi</h2>
            <p style={sectionText}>
              Inserisci lavorazioni, ore e prezzo manuale quando necessario.
            </p>
          </div>

          <button onClick={() => setShowServiceModal(true)} style={primaryBtn}>
            + Aggiungi intervento
          </button>
        </div>

        {services.length === 0 ? (
          <div style={emptyBox}>Nessun intervento registrato.</div>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Data</th>
                  <th style={th}>Intervento</th>
                  <th style={th}>Ore</th>
                  <th style={th}>Note</th>
                  <th style={th}>Prezzo</th>
                  <th style={th}>Azioni</th>
                </tr>
              </thead>

              <tbody>
                {services.map((s) => {
                  const price = s.custom_price ?? ((s.hours || 0) * hourlyRate);

                  return (
                    <tr key={s.id} style={row}>
                      <td style={td}>{s.service_date || "-"}</td>
                      <td style={td}>
                        <div style={cellTitle}>{s.title}</div>
                      </td>
                      <td style={td}>{s.hours}</td>
                      <td style={td}>{s.notes || "-"}</td>
                      <td style={td}>
                        <strong>{price.toFixed(2)} €</strong>
                      </td>
                      <td style={td}>
                        <button
                          style={dangerGhostBtn}
                          onClick={() => deleteService(s.id)}
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showPartsModal && (
        <ModalShell
          title="Aggiungi ricambio"
          subtitle="Cerca un prodotto, selezionalo e definisci quantità e prezzo."
          icon="📦"
        >
          <input
            placeholder="Cerca prodotto o EAN..."
            value={partSearch}
            onChange={(e) => setPartSearch(e.target.value)}
            style={modalInput}
          />

          <div style={resultsWrap}>
            {partSearch.trim().length < 2 ? (
              <div style={emptyBoxSmall}>Scrivi almeno 2 caratteri per cercare.</div>
            ) : filteredProducts.length === 0 ? (
              <div style={emptyBoxSmall}>Nessun prodotto trovato.</div>
            ) : (
              filteredProducts.map((p) => (
                <div key={p.id} style={productResultCard}>
                  <div>
                    <div style={cellTitle}>{p.title}</div>
                    <div style={cellSub}>EAN {p.ean || "-"}</div>
                    <div style={productPrice}>{p.price_b2c || 0} €</div>
                  </div>

                  <button
                    onClick={() => setSelectedProduct(p)}
                    style={smallPrimaryBtn}
                  >
                    Seleziona
                  </button>
                </div>
              ))
            )}
          </div>

          {selectedProduct && (
            <div style={selectedBox}>
              <div style={selectedTitle}>{selectedProduct.title}</div>

              <div style={modalGrid}>
                <div>
                  <label style={fieldLabel}>Quantità</label>
                  <input
                    type="number"
                    value={partForm.quantity}
                    onChange={(e) =>
                      setPartForm({
                        ...partForm,
                        quantity: Number(e.target.value),
                      })
                    }
                    style={modalInput}
                  />
                </div>

                <div>
                  <label style={fieldLabel}>Prezzo custom</label>
                  <input
                    type="number"
                    value={partForm.custom_price}
                    placeholder={String(selectedProduct.price_b2c || "")}
                    onChange={(e) =>
                      setPartForm({
                        ...partForm,
                        custom_price: e.target.value,
                      })
                    }
                    style={modalInput}
                  />
                </div>
              </div>

              <div style={modalFooter}>
                <button
                  onClick={() => {
                    setShowPartsModal(false);
                    setSelectedProduct(null);
                    setPartSearch("");
                  }}
                  style={secondaryBtn}
                  disabled={savingPart}
                >
                  Annulla
                </button>

                <button
                  onClick={savePart}
                  style={primaryBtn}
                  disabled={savingPart}
                >
                  {savingPart ? "Salvataggio..." : "Aggiungi ricambio"}
                </button>
              </div>
            </div>
          )}

          {!selectedProduct && (
            <div style={modalFooter}>
              <button
                onClick={() => setShowPartsModal(false)}
                style={secondaryBtn}
              >
                Chiudi
              </button>
            </div>
          )}
        </ModalShell>
      )}

      {showServiceModal && (
        <ModalShell
          title="Nuovo intervento"
          subtitle="Inserisci i dati dell’intervento di officina."
          icon="🔧"
        >
          <div style={modalGridSingle}>
            <div>
              <label style={fieldLabel}>Data</label>
              <input
                type="date"
                value={newService.service_date}
                onChange={(e) =>
                  setNewService({ ...newService, service_date: e.target.value })
                }
                style={modalInput}
              />
            </div>

            <div>
              <label style={fieldLabel}>Intervento</label>
              <input
                value={newService.title}
                onChange={(e) =>
                  setNewService({ ...newService, title: e.target.value })
                }
                placeholder="es. Regolazione cambio"
                style={modalInput}
              />
            </div>

            <div>
              <label style={fieldLabel}>Ore</label>
              <input
                type="number"
                step="0.25"
                value={newService.hours}
                onChange={(e) =>
                  setNewService({
                    ...newService,
                    hours: Number(e.target.value),
                  })
                }
                style={modalInput}
              />
            </div>

            <div>
              <label style={fieldLabel}>Prezzo manuale</label>
              <input
                type="number"
                value={newService.custom_price}
                onChange={(e) =>
                  setNewService({
                    ...newService,
                    custom_price: e.target.value,
                  })
                }
                style={modalInput}
              />
            </div>

            <div>
              <label style={fieldLabel}>Note</label>
              <textarea
                rows={4}
                value={newService.notes}
                onChange={(e) =>
                  setNewService({ ...newService, notes: e.target.value })
                }
                style={modalTextarea}
              />
            </div>
          </div>

          <div style={modalFooter}>
            <button
              onClick={() => setShowServiceModal(false)}
              style={secondaryBtn}
              disabled={savingService}
            >
              Annulla
            </button>

            <button
              onClick={saveService}
              style={primaryBtn}
              disabled={savingService}
            >
              {savingService ? "Salvataggio..." : "Salva intervento"}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRow}>
      <span style={infoLabel}>{label}</span>
      <span style={infoValue}>{value}</span>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={overlay}>
      <div style={modalCard}>
        <div style={modalHeader}>
          <div style={modalIcon}>{icon || "✨"}</div>
          <div>
            <h2 style={modalTitle}>{title}</h2>
            {subtitle ? <p style={modalSubtitle}>{subtitle}</p> : null}
          </div>
        </div>

        <div style={modalContent}>{children}</div>
      </div>
    </div>
  );
}

/* STILI */

const page: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: 28,
  background: "#f8fafc",
  minHeight: "100vh",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 24,
};

const breadcrumb: React.CSSProperties = {
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
};

const printBtn: React.CSSProperties = {
  background: "linear-gradient(135deg,#16a34a,#15803d)",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 12px 24px rgba(22,163,74,0.2)",
};

const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 18,
  marginBottom: 24,
};

const infoCardWide: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
};

const summaryCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: 16,
};

const infoRows: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const infoRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  borderBottom: "1px solid #f1f5f9",
  paddingBottom: 10,
};

const infoLabel: React.CSSProperties = {
  color: "#64748b",
  fontSize: 14,
};

const infoValue: React.CSSProperties = {
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 600,
  textAlign: "right",
};

const moneyRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 12,
  color: "#0f172a",
};

const divider: React.CSSProperties = {
  height: 1,
  background: "#e5e7eb",
  margin: "14px 0",
};

const totalRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 20,
  fontWeight: 800,
  color: "#0f172a",
};

const sectionCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
  marginBottom: 22,
};

const sectionHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  flexWrap: "wrap",
  marginBottom: 18,
};

const sectionHeading: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  color: "#0f172a",
};

const sectionText: React.CSSProperties = {
  marginTop: 6,
  color: "#64748b",
  fontSize: 14,
};

const primaryBtn: React.CSSProperties = {
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryBtn: React.CSSProperties = {
  background: "#eef2f7",
  color: "#0f172a",
  border: "1px solid #dbe2ea",
  padding: "12px 18px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};

const smallPrimaryBtn: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "9px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const dangerGhostBtn: React.CSSProperties = {
  background: "#fff1f2",
  color: "#be123c",
  border: "1px solid #fecdd3",
  padding: "8px 12px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const tableWrap: React.CSSProperties = {
  overflowX: "auto",
  border: "1px solid #edf2f7",
  borderRadius: 16,
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 820,
};

const row: React.CSSProperties = {
  borderTop: "1px solid #eef2f7",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 14,
  background: "#f8fafc",
  color: "#64748b",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.3,
};

const td: React.CSSProperties = {
  padding: 14,
  color: "#0f172a",
  verticalAlign: "top",
};

const cellTitle: React.CSSProperties = {
  fontWeight: 700,
  color: "#0f172a",
};

const cellSub: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  marginTop: 4,
};

const smallInput: React.CSSProperties = {
  width: 86,
  padding: "10px 12px",
  border: "1px solid #dbe2ea",
  borderRadius: 10,
  fontSize: 14,
};

const priceBox: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const oldPrice: React.CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  textDecoration: "line-through",
};

const checkboxWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "#334155",
};

const emptyBox: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: 16,
  padding: 24,
  textAlign: "center",
  color: "#64748b",
};

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 1000,
  backdropFilter: "blur(4px)",
};

const modalCard: React.CSSProperties = {
  width: "100%",
  maxWidth: 620,
  maxHeight: "85vh",
  overflowY: "auto",
  background: "#fff",
  borderRadius: 24,
  padding: 26,
  boxShadow: "0 30px 80px rgba(15,23,42,0.28)",
  border: "1px solid #e2e8f0",
};

const modalHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  marginBottom: 20,
};

const modalIcon: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 16,
  background: "#dbeafe",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
  flexShrink: 0,
};

const modalTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 800,
  color: "#0f172a",
};

const modalSubtitle: React.CSSProperties = {
  margin: "8px 0 0 0",
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.5,
};

const modalContent: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const modalInput: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #dbe2ea",
  fontSize: 14,
  outline: "none",
};

const modalTextarea: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #dbe2ea",
  fontSize: 14,
  outline: "none",
  resize: "vertical",
};

const fieldLabel: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 13,
  color: "#475569",
  fontWeight: 700,
};

const resultsWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const productResultCard: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  padding: 14,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
};

const productPrice: React.CSSProperties = {
  marginTop: 6,
  fontWeight: 700,
  color: "#0f172a",
};

const selectedBox: React.CSSProperties = {
  borderTop: "1px solid #eef2f7",
  paddingTop: 16,
};

const selectedTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: 14,
};

const modalGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const modalGridSingle: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const modalFooter: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 8,
  flexWrap: "wrap",
};

const emptyBoxSmall: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: 14,
  padding: 18,
  textAlign: "center",
  color: "#64748b",
};

const toastStyle: React.CSSProperties = {
  position: "fixed",
  top: 24,
  right: 24,
  zIndex: 1200,
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
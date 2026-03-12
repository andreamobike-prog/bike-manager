"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Modal from "../../components/Modal";

type InventoryBike = {
  id: number | string;
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

type BikeForm = {
  brand: string;
  model: string;
  color: string;
  type: string;
  frame_number: string;
  purchase_date: string;
  invoice_number: string;
  purchase_price: string;
  sale_price: string;
};

const initialForm: BikeForm = {
  brand: "",
  model: "",
  color: "",
  type: "",
  frame_number: "",
  purchase_date: "",
  invoice_number: "",
  purchase_price: "",
  sale_price: "",
};

export default function InventoryBikesPage() {
  const router = useRouter();

  const [bikes, setBikes] = useState<InventoryBike[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<BikeForm>(initialForm);

  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");

  async function loadBikes() {
    setLoading(true);

    const { data, error } = await supabase
      .from("inventory_bikes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Errore caricamento bici:", error);
      alert(`Errore nel caricamento bici: ${error.message}`);
      setLoading(false);
      return;
    }

    setBikes((data as InventoryBike[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadBikes();
  }, []);

  const availableBrands = useMemo(() => {
    const brands = bikes
      .map((bike) => bike.brand?.trim())
      .filter((brand): brand is string => Boolean(brand));

    return [...new Set(brands)].sort((a, b) => a.localeCompare(b));
  }, [bikes]);

  const filteredBikes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bikes.filter((bike) => {
      const matchesBrandFilter = selectedBrand
        ? (bike.brand || "") === selectedBrand
        : true;

      const searchableText = [
        bike.brand,
        bike.model,
        bike.frame_number,
        bike.color,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = query ? searchableText.includes(query) : true;

      return matchesBrandFilter && matchesSearch;
    });
  }, [bikes, search, selectedBrand]);

  function updateForm<K extends keyof BikeForm>(key: K, value: BikeForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(initialForm);
  }

  async function createBike() {
    if (!form.brand.trim()) {
      alert("Inserisci il marchio.");
      return;
    }

    if (!form.model.trim()) {
      alert("Inserisci il modello.");
      return;
    }

    if (!form.frame_number.trim()) {
      alert("Inserisci il numero di telaio.");
      return;
    }

    if (!form.type.trim()) {
      alert("Seleziona il tipo bici.");
      return;
    }

    const purchasePrice = Number(form.purchase_price);
    const salePrice = Number(form.sale_price);

    if (Number.isNaN(purchasePrice) || purchasePrice < 0) {
      alert("Inserisci un prezzo acquisto valido.");
      return;
    }

    if (form.sale_price !== "" && (Number.isNaN(salePrice) || salePrice < 0)) {
      alert("Inserisci un prezzo vendita valido.");
      return;
    }

    setSaving(true);

    const payload = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      color: form.color.trim() || null,
      type: form.type.trim(),
      frame_number: form.frame_number.trim(),
      purchase_date: form.purchase_date || null,
      invoice_number: form.invoice_number.trim() || null,
      purchase_price: purchasePrice,
      current_value: purchasePrice,
      sale_price: form.sale_price === "" ? 0 : salePrice,
    };

    const { error } = await supabase.from("inventory_bikes").insert([payload]);

    if (error) {
      console.error("Errore inserimento bici:", error);
      alert(`Errore nel salvataggio: ${error.message}`);
      setSaving(false);
      return;
    }

    alert("Bici salvata correttamente");
    setShowModal(false);
    resetForm();
    await loadBikes();
    setSaving(false);
  }

  function formatCurrency(value: number | null | undefined) {
    const numericValue = Number(value || 0);

    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(numericValue);
  }

  return (
    <div className="page">
      <div className="topBar">
        <div>
          <h1>🚲 Bici magazzino</h1>
          <p className="subtitle">
            Gestisci l’inventario delle bici aziendali, cerca rapidamente e
            filtra per marchio.
          </p>
        </div>

        <button className="primary" onClick={() => setShowModal(true)}>
          + Nuova bici
        </button>
      </div>

      <div className="toolbar">
        <div className="searchWrap">
          <input
            className="searchInput"
            placeholder="Cerca per marchio, modello, telaio o colore..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filterWrap">
          <select
            className="filterSelect"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            <option value="">Tutti i brand</option>
            {availableBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="statsRow">
        <div className="statCard">
          <span className="statLabel">Totale bici</span>
          <strong className="statValue">{filteredBikes.length}</strong>
        </div>

        <div className="statCard">
          <span className="statLabel">Brand disponibili</span>
          <strong className="statValue">{availableBrands.length}</strong>
        </div>
      </div>

      {loading ? (
        <div className="emptyState">Caricamento bici in corso...</div>
      ) : filteredBikes.length === 0 ? (
        <div className="emptyState">
          Nessuna bici trovata con i filtri attuali.
        </div>
      ) : (
        <div className="grid">
          {filteredBikes.map((bike) => (
            <div
              key={bike.id}
              className="bikeCard"
              onClick={() => router.push(`/inventory-bikes/${bike.id}`)}
            >
              <div className="bikeCardTop">
                <div className="bikeIdentity">
                  <div className="bikeIcon">🚲</div>
                  <div>
                    <div className="bikeName">
                      {bike.brand || "Brand sconosciuto"} {bike.model || ""}
                    </div>
                    <div className="bikeMeta">
                      {bike.type || "Tipo non definito"}
                    </div>
                  </div>
                </div>

                <div className="priceBadge">
                  {formatCurrency(bike.current_value)}
                </div>
              </div>

              <div className="bikeDetails">
                <div className="detailRow">
                  <span className="detailLabel">Colore</span>
                  <span className="detailValue">{bike.color || "-"}</span>
                </div>

                <div className="detailRow">
                  <span className="detailLabel">Telaio</span>
                  <span className="detailValue mono">
                    {bike.frame_number || "-"}
                  </span>
                </div>

                <div className="detailRow">
                  <span className="detailLabel">Acquisto</span>
                  <span className="detailValue">
                    {formatCurrency(bike.purchase_price)}
                  </span>
                </div>

                <div className="detailRow">
                  <span className="detailLabel">Vendita</span>
                  <span className="detailValue">
                    {formatCurrency(bike.sale_price)}
                  </span>
                </div>
              </div>

              <div className="cardFooter">Apri dettaglio →</div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Nuova bici" onClose={() => setShowModal(false)}>
          <div className="modalForm">
            <div className="formGrid">
              <input
                placeholder="Marchio *"
                value={form.brand}
                onChange={(e) => updateForm("brand", e.target.value)}
              />

              <input
                placeholder="Modello *"
                value={form.model}
                onChange={(e) => updateForm("model", e.target.value)}
              />

              <input
                placeholder="Colore"
                value={form.color}
                onChange={(e) => updateForm("color", e.target.value)}
              />

              <select
                value={form.type}
                onChange={(e) => updateForm("type", e.target.value)}
              >
                <option value="">Tipo bici *</option>
                <option value="muscolare">Muscolare</option>
                <option value="elettrica">Elettrica</option>
              </select>

              <input
                placeholder="Numero telaio *"
                value={form.frame_number}
                onChange={(e) => updateForm("frame_number", e.target.value)}
              />

              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => updateForm("purchase_date", e.target.value)}
              />

              <input
                placeholder="Numero fattura"
                value={form.invoice_number}
                onChange={(e) => updateForm("invoice_number", e.target.value)}
              />

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Prezzo acquisto *"
                value={form.purchase_price}
                onChange={(e) => updateForm("purchase_price", e.target.value)}
              />

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Prezzo vendita"
                value={form.sale_price}
                onChange={(e) => updateForm("sale_price", e.target.value)}
              />
            </div>

            <div className="helperText">
              Il valore attuale verrà inizializzato automaticamente uguale al
              prezzo di acquisto.
            </div>

            <div className="buttons">
              <button
                className="primary"
                onClick={createBike}
                disabled={saving}
              >
                {saving ? "Salvataggio..." : "Salva bici"}
              </button>

              <button
                className="secondary"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                disabled={saving}
              >
                Chiudi
              </button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx>{`
        .page {
          max-width: 1280px;
          margin: 0 auto;
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
        }

        .topBar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }

        h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
        }

        .subtitle {
          margin: 8px 0 0 0;
          color: #64748b;
          font-size: 15px;
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1fr 240px;
          gap: 14px;
          margin-bottom: 18px;
        }

        .searchWrap,
        .filterWrap {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 10px 12px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .searchInput,
        .filterSelect {
          width: 100%;
          border: none;
          outline: none;
          font-size: 15px;
          background: transparent;
        }

        .statsRow {
          display: flex;
          gap: 14px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .statCard {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px 18px;
          min-width: 180px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .statLabel {
          display: block;
          font-size: 13px;
          color: #64748b;
          margin-bottom: 6px;
        }

        .statValue {
          font-size: 24px;
          color: #0f172a;
        }

        .primary {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          border: none;
          padding: 12px 18px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          box-shadow: 0 10px 24px rgba(37, 99, 235, 0.25);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(37, 99, 235, 0.3);
        }

        .primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .secondary {
          background: #e2e8f0;
          color: #0f172a;
          border: none;
          padding: 12px 18px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
        }

        .secondary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .bikeCard {
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 18px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
        }

        .bikeCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.1);
          border-color: #cbd5e1;
        }

        .bikeCardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 18px;
        }

        .bikeIdentity {
          display: flex;
          gap: 12px;
          align-items: center;
          min-width: 0;
        }

        .bikeIcon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: #dbeafe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .bikeName {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
        }

        .bikeMeta {
          margin-top: 4px;
          font-size: 13px;
          color: #64748b;
          text-transform: capitalize;
        }

        .priceBadge {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
        }

        .bikeDetails {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px 0;
          border-top: 1px solid #eef2f7;
          border-bottom: 1px solid #eef2f7;
        }

        .detailRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .detailLabel {
          color: #64748b;
          font-size: 13px;
        }

        .detailValue {
          color: #0f172a;
          font-size: 14px;
          font-weight: 600;
          text-align: right;
        }

        .mono {
          font-family: monospace;
          font-size: 13px;
        }

        .cardFooter {
          margin-top: 14px;
          color: #2563eb;
          font-weight: 700;
          font-size: 14px;
        }

        .emptyState {
          background: white;
          border: 1px dashed #cbd5e1;
          border-radius: 18px;
          padding: 40px 24px;
          text-align: center;
          color: #64748b;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .modalForm {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .modalForm input,
        .modalForm select {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #dbe2ea;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          background: white;
        }

        .modalForm input:focus,
        .modalForm select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
        }

        .helperText {
          font-size: 13px;
          color: #64748b;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 12px 14px;
          border-radius: 12px;
        }

        .buttons {
          display: flex;
          gap: 12px;
          margin-top: 4px;
        }

        @media (max-width: 900px) {
          .toolbar {
            grid-template-columns: 1fr;
          }

          .formGrid {
            grid-template-columns: 1fr;
          }

          .topBar {
            flex-direction: column;
            align-items: stretch;
          }

          .primary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
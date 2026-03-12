"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

type Customer = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
};

const initialForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
};

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState<CustomerForm>(initialForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
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
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Errore caricamento clienti:", error);
      setToast({
        type: "error",
        message: `Errore nel caricamento clienti: ${error.message}`,
      });
      setLoading(false);
      return;
    }

    setCustomers((data as Customer[]) || []);
    setLoading(false);
  }

  function resetForm() {
    setForm(initialForm);
  }

  async function createCustomer() {
    if (!form.name.trim()) {
      setToast({
        type: "error",
        message: "Inserisci il nome del cliente.",
      });
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
    };

    const { error } = await supabase.from("customers").insert(payload);

    if (error) {
      console.error("Errore inserimento cliente:", error);
      setToast({
        type: "error",
        message: `Errore nel salvataggio: ${error.message}`,
      });
      setSaving(false);
      return;
    }

    setToast({
      type: "success",
      message: "Cliente creato correttamente.",
    });

    resetForm();
    setShowModal(false);
    await loadCustomers();
    setSaving(false);
  }

  async function deleteCustomer(id: string, name: string | null) {
    const ok = window.confirm(
      `Vuoi davvero eliminare il cliente "${name || "senza nome"}"?`
    );

    if (!ok) return;

    setDeletingId(id);

    const { error } = await supabase.from("customers").delete().eq("id", id);

    if (error) {
      console.error("Errore eliminazione cliente:", error);
      setToast({
        type: "error",
        message: `Errore durante l'eliminazione: ${error.message}`,
      });
      setDeletingId(null);
      return;
    }

    setToast({
      type: "success",
      message: "Cliente eliminato correttamente.",
    });

    await loadCustomers();
    setDeletingId(null);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return customers;

    return customers.filter((c) => {
      const text = [c.name || "", c.phone || "", c.email || ""]
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [customers, search]);

  return (
    <div className="page">
      {toast && (
        <div
          className={`toast ${
            toast.type === "success"
              ? "toastSuccess"
              : toast.type === "error"
              ? "toastError"
              : "toastInfo"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="header">
        <div>
          <h1>Clienti</h1>
          <p className="subtitle">
            Gestisci l’anagrafica clienti, cerca rapidamente e apri la scheda in
            un click.
          </p>
        </div>

        <button className="addBtn" onClick={() => setShowModal(true)}>
          + Nuovo cliente
        </button>
      </div>

      <div className="toolbar">
        <div className="searchWrap">
          <input
            className="search"
            placeholder="Cerca per nome, telefono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="countCard">
          <span className="countLabel">Clienti trovati</span>
          <strong className="countValue">{filtered.length}</strong>
        </div>
      </div>

      {loading ? (
        <div className="emptyState">Caricamento clienti...</div>
      ) : filtered.length === 0 ? (
        <div className="emptyState">
          {search.trim()
            ? "Nessun cliente trovato con questa ricerca."
            : "Non ci sono ancora clienti registrati."}
        </div>
      ) : (
        <div className="grid">
          {filtered.map((c) => (
            <div key={c.id} className="card">
              <div className="cardTop">
                <div className="avatar">{(c.name || "?").charAt(0).toUpperCase()}</div>

                <div className="customerMain">
                  <h3>{c.name || "-"}</h3>
                  <div className="customerMeta">ID: {c.id.slice(0, 8)}</div>
                </div>
              </div>

              <div className="info">
                <div className="infoRow">
                  <span className="infoLabel">Telefono</span>
                  <span className="infoValue">{c.phone || "-"}</span>
                </div>

                <div className="infoRow">
                  <span className="infoLabel">Email</span>
                  <span className="infoValue emailValue">{c.email || "-"}</span>
                </div>
              </div>

              <div className="actions">
                <button
                  className="open"
                  onClick={() => router.push(`/customers/${c.id}`)}
                >
                  Apri scheda
                </button>

                <button
                  className="delete"
                  onClick={() => deleteCustomer(c.id, c.name)}
                  disabled={deletingId === c.id}
                >
                  {deletingId === c.id ? "Eliminazione..." : "Elimina"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="overlay">
          <div className="modal">
            <div className="modalHeader">
              <div>
                <h2>Nuovo cliente</h2>
                <p className="modalSubtitle">
                  Inserisci i dati principali del cliente.
                </p>
              </div>

              <button
                className="closeBtn"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <div className="form">
              <div className="field">
                <label>Nome cliente *</label>
                <input
                  placeholder="Mario Rossi"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label>Telefono</label>
                <input
                  placeholder="+39 333 123456"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label>Email</label>
                <input
                  placeholder="cliente@email.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="buttons">
              <button
                className="cancel"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                disabled={saving}
              >
                Annulla
              </button>

              <button className="save" onClick={createCustomer} disabled={saving}>
                {saving ? "Salvataggio..." : "Salva cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page {
          padding: 32px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: Inter, Arial, sans-serif;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }

        .header h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
        }

        .subtitle {
          margin-top: 8px;
          color: #64748b;
          font-size: 15px;
        }

        .addBtn {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          border: none;
          padding: 12px 18px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          box-shadow: 0 12px 28px rgba(37, 99, 235, 0.22);
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1fr 180px;
          gap: 14px;
          margin-bottom: 28px;
        }

        .searchWrap,
        .countCard {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .searchWrap {
          padding: 10px 14px;
        }

        .search {
          width: 100%;
          border: none;
          outline: none;
          font-size: 15px;
          background: transparent;
        }

        .countCard {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .countLabel {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 6px;
        }

        .countValue {
          font-size: 26px;
          color: #0f172a;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .card {
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 18px;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
        }

        .cardTop {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }

        .avatar {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: #dbeafe;
          color: #1d4ed8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 18px;
          flex-shrink: 0;
        }

        .customerMain h3 {
          margin: 0;
          font-size: 18px;
          color: #0f172a;
        }

        .customerMeta {
          margin-top: 4px;
          font-size: 12px;
          color: #64748b;
        }

        .info {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px 0;
          border-top: 1px solid #eef2f7;
          border-bottom: 1px solid #eef2f7;
        }

        .infoRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .infoLabel {
          color: #64748b;
          font-size: 13px;
        }

        .infoValue {
          color: #0f172a;
          font-size: 14px;
          font-weight: 600;
          text-align: right;
          word-break: break-word;
        }

        .emailValue {
          max-width: 170px;
        }

        .actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }

        .actions button {
          border: none;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 700;
        }

        .open {
          flex: 1;
          background: #2563eb;
          color: white;
        }

        .delete {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3 !important;
        }

        .delete:disabled,
        .save:disabled,
        .cancel:disabled,
        .closeBtn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .emptyState {
          background: white;
          border: 1px dashed #cbd5e1;
          border-radius: 20px;
          padding: 40px 24px;
          text-align: center;
          color: #64748b;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(3px);
          padding: 20px;
        }

        .modal {
          background: white;
          padding: 28px;
          border-radius: 22px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.25);
          animation: modalIn 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .modalHeader h2 {
          margin: 0;
          font-size: 22px;
          color: #0f172a;
        }

        .modalSubtitle {
          margin-top: 6px;
          color: #64748b;
          font-size: 14px;
        }

        .closeBtn {
          background: #f1f5f9;
          border: none;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 16px;
          flex-shrink: 0;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field label {
          font-size: 13px;
          color: #475569;
          font-weight: 700;
        }

        .field input {
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #d1d5db;
          font-size: 14px;
        }

        .field input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
        }

        .buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 4px;
        }

        .cancel {
          background: #e5e7eb;
          border: none;
          padding: 10px 16px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
        }

        .save {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
        }

        .toast {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 1100;
          padding: 14px 18px;
          border-radius: 14px;
          font-weight: 800;
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.16);
          max-width: 420px;
        }

        .toastSuccess {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }

        .toastError {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .toastInfo {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #93c5fd;
        }

        @media (max-width: 900px) {
          .page {
            padding: 20px;
          }

          .header {
            flex-direction: column;
            align-items: stretch;
          }

          .toolbar {
            grid-template-columns: 1fr;
          }

          .addBtn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
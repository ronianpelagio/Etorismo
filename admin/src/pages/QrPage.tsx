import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Artifact } from '../types';

const PAGE_SIZE = 8;

function Modal({
  title,
  onClose,
  onConfirm,
  confirmLabel,
  children,
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel modal-sm">
        <div className="modal-header">
          <div>
            <div className="modal-eyebrow">— QR / NFC</div>
            <h3>{title}</h3>
            <div className="modal-goldline" />
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {children}

          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-danger" onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QrPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchArtifacts(page);
  }, [page]);

  const fetchArtifacts = async (currentPage: number) => {
    setLoading(true);
    setError(null);

    try {
      const offset = (currentPage - 1) * PAGE_SIZE;

      const [{ count }, { data, error }] = await Promise.all([
        supabase.from('artifacts').select('id', { count: 'exact', head: true }),
        supabase
          .from('artifacts')
          .select('id, name, qr_code, created_at')
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1),
      ]);

      if (error) throw error;

      setTotal(count ?? 0);
      setArtifacts((data || []) as Artifact[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (artifact: Artifact) => {
    setSelectedArtifact(artifact);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedArtifact) return;

    await supabase
      .from('artifacts')
      .update({ qr_code: null })
      .eq('id', selectedArtifact.id);

    setSelectedArtifact(null);
    setShowModal(false);
    fetchArtifacts(page);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="page-shell">
      {/* TOP BAR */}
      <div className="top-bar">
        <div>
          <div className="page-eyebrow">— Smart Tagging</div>
          <h1 className="page-title">QR Codes / NFC</h1>
          <div className="page-gold-line" />
          <p className="page-subtitle">
            Assign and manage QR or NFC codes for artifacts.
          </p>
        </div>

        <button className="btn btn-primary">
          + Add QR/NFC
        </button>
      </div>

      {/* TABLE PANEL */}
      <div className="panel">
        {error && (
          <div className="alert-box">
            <span className="alert-ico">!</span>
            <span>{error}</span>
          </div>
        )}

        <div className="table-wrap">
          {loading ? (
            <div className="skeleton-table">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="skeleton-row">
                  <span className="skeleton skeleton-row-index" />
                  <span className="skeleton skeleton-row-line" />
                  <span className="skeleton skeleton-row-line short" />
                  <span className="skeleton skeleton-row-actions" />
                </div>
              ))}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Artifact</th>
                  <th>QR / NFC Code</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {artifacts.map((artifact, index) => (
                  <tr key={artifact.id}>
                    <td className="td-muted">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </td>

                    <td>
                      <strong>{artifact.name}</strong>
                    </td>

                    <td className="td-muted td-truncate">
                      {artifact.qr_code || '—'}
                    </td>

                    <td>
                      <div className="action-row">
                        <button className="btn btn-ghost btn-sm">
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(artifact)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {artifacts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-cell">
                      No QR/NFC records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION */}
        <div className="pagination-row">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            ← Previous
          </button>

          <span className="td-muted">
            Page {page} of {totalPages}
          </span>

          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </div>
      </div>

      {/* DELETE MODAL */}
      {showModal && selectedArtifact && (
        <Modal
          title="Remove QR/NFC Code"
          onClose={() => setShowModal(false)}
          onConfirm={confirmDelete}
          confirmLabel="Remove"
        >
          <p style={{ color: 'var(--ink-mid)' }}>
            Remove QR/NFC for{' '}
            <strong style={{ color: 'var(--ink)' }}>
              "{selectedArtifact.name}"
            </strong>
            ?
          </p>
        </Modal>
      )}
    </div>
  );
}
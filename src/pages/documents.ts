// ============================================================
// DOCUMENTS PAGE
// ============================================================

import { store } from '@/store';
import type { ShippingDocument, DocumentType, DocumentStatus } from '@/types/document';

const TYPE_LABEL: Record<DocumentType, string> = {
  bill_of_lading: 'Bill of Lading', commercial_invoice: 'Commercial Invoice',
  packing_list: 'Packing List', customs_declaration: 'Customs Declaration',
  certificate_of_origin: 'Certificate of Origin', insurance: 'Insurance Certificate',
};
const TYPE_EMOJI: Record<DocumentType, string> = {
  bill_of_lading: '📋', commercial_invoice: '💰', packing_list: '📦',
  customs_declaration: '🛃', certificate_of_origin: '📜', insurance: '🛡️',
};
const STATUS_BADGE: Record<DocumentStatus, string> = {
  draft: 'badge-neutral', submitted: 'badge-blue', approved: 'badge-green', rejected: 'badge-red',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function renderDocuments(): void {
  const content = document.getElementById('page-content');
  if (!content) return;

  const { documents } = store.getState();

  content.innerHTML = `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2 class="page-heading">Documents</h2>
          <p class="page-subheading">${documents.length} documents across ${Object.keys(TYPE_LABEL).length} categories</p>
        </div>
        <div class="page-actions">
          <select class="filter-select" id="doc-type-filter">
            <option value="all">All Types</option>
            ${Object.entries(TYPE_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
          <select class="filter-select" id="doc-status-filter">
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <!-- Drop zone -->
      <div class="drop-zone" id="drop-zone">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto var(--space-3)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <div style="font-size:var(--text-sm);font-weight:var(--weight-medium);margin-bottom:4px">Drop files here or click to upload</div>
        <div style="font-size:var(--text-xs)">PDF, XLSX, DOCX up to 10 MB</div>
        <input type="file" id="file-input" style="display:none" multiple accept=".pdf,.xlsx,.docx" />
      </div>

      <!-- Stats row -->
      <div class="grid-4" style="margin-bottom:var(--space-5)">
        ${(['approved', 'submitted', 'draft', 'rejected'] as DocumentStatus[]).map(s => {
          const count = documents.filter(d => d.status === s).length;
          const cls = { approved: 'green', submitted: 'blue', draft: '', rejected: 'red' }[s];
          return `
            <div class="kpi-card ${cls}">
              <div class="kpi-header"><span class="kpi-label">${s.charAt(0).toUpperCase() + s.slice(1)}</span></div>
              <div class="kpi-value">${count}</div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Document grid -->
      <div class="doc-grid" id="doc-grid">
        ${renderDocCards(documents)}
      </div>
    </div>
  `;

  // Drop zone
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  dropZone?.addEventListener('click', () => fileInput?.click());
  dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone?.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); });

  // Filters
  let typeFilter = 'all';
  let statusFilter = 'all';

  function applyFilter(): void {
    const filtered = documents.filter(d =>
      (typeFilter === 'all' || d.type === typeFilter) &&
      (statusFilter === 'all' || d.status === statusFilter)
    );
    const grid = document.getElementById('doc-grid');
    if (grid) grid.innerHTML = renderDocCards(filtered);
  }

  document.getElementById('doc-type-filter')?.addEventListener('change', e => {
    typeFilter = (e.target as HTMLSelectElement).value;
    applyFilter();
  });
  document.getElementById('doc-status-filter')?.addEventListener('change', e => {
    statusFilter = (e.target as HTMLSelectElement).value;
    applyFilter();
  });
}

function renderDocCards(docs: ShippingDocument[]): string {
  if (!docs.length) {
    return `<div class="empty-state" style="grid-column:1/-1">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
      <h3>No documents found</h3><p>Upload or adjust filters</p>
    </div>`;
  }
  return docs.map((d, i) => `
    <div class="doc-card stagger-${Math.min(i + 1, 6)}">
      <div class="doc-icon">${TYPE_EMOJI[d.type]}</div>
      <div class="doc-name">${TYPE_LABEL[d.type]}</div>
      <div class="doc-meta" style="margin-bottom:var(--space-2)">${d.shipmentId ?? 'Not linked'}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="badge ${STATUS_BADGE[d.status]}">${d.status}</span>
        <span style="font-size:11px;color:var(--text-muted)">${formatBytes(d.fileSize)}</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:var(--space-2)">
        ${new Date(d.uploadedAt).toLocaleDateString()} · ${d.uploadedBy}
      </div>
    </div>
  `).join('');
}

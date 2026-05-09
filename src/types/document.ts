// ============================================================
// DOCUMENT TYPES
// ============================================================

export type DocumentType =
  | 'bill_of_lading'
  | 'commercial_invoice'
  | 'packing_list'
  | 'customs_declaration'
  | 'certificate_of_origin'
  | 'insurance';

export type DocumentStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface ShippingDocument {
  id: string;
  type: DocumentType;
  name: string;
  shipmentId: string | null;
  status: DocumentStatus;
  uploadedAt: string;
  uploadedBy: string;
  fileSize: number;   // bytes
  fileType: string;   // 'pdf', 'xlsx', etc.
}

import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Receipt, CheckCircle2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReceiptItem {
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

interface ReceiptData {
  id: string;
  items: ReceiptItem[];
  totalAmount: number;
  paymentMethod: 'CASH' | 'POS' | 'TRANSFER' | 'MIXED';
  splitPayments?: {
    cashAmount: number;
    otherMethod: 'POS' | 'TRANSFER';
    otherAmount: number;
  };
  timestamp: string;
  branchName: string;
  branchLocation?: string;
  cashierName: string;
  discountApplied?: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    discountAmount: number;
  };
  originalAmount?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  prescriptionId?: string;
  doctorName?: string;
  dosageInstructions?: string;
  billingNotes?: string;
}

interface ReceiptModalProps {
  receiptData: ReceiptData | null;
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a number as Nigerian Naira */
const formatNaira = (amount: number): string => `₦${amount.toLocaleString('en-NG')}`;

/** Return a human-readable date + time string */
const formatTimestamp = (iso: string): { date: string; time: string } => {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-NG', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
  const time = d.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return { date, time };
};

/** Colour + label map for payment method badges */
const PAYMENT_BADGE: Record<
  ReceiptData['paymentMethod'],
  { label: string; className: string }
> = {
  CASH: {
    label: 'Cash',
    className:
      'bg-emerald-100 text-emerald-800 border border-emerald-300',
  },
  POS: {
    label: 'POS / Card',
    className: 'bg-blue-100 text-blue-800 border border-blue-300',
  },
  TRANSFER: {
    label: 'Bank Transfer',
    className:
      'bg-purple-100 text-purple-800 border border-purple-300',
  },
  MIXED: {
    label: 'Mixed Payment',
    className:
      'bg-amber-100 text-amber-800 border border-amber-300',
  },
};

// ---------------------------------------------------------------------------
// Sub-component: Dashed divider
// ---------------------------------------------------------------------------

const DashedDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`w-full border-t border-dashed border-gray-400 my-3 ${className}`}
    aria-hidden="true"
  />
);

// ---------------------------------------------------------------------------
// Sub-component: The receipt itself (used in both screen + print contexts)
// ---------------------------------------------------------------------------

interface ReceiptBodyProps {
  data: ReceiptData;
  /** When true the component renders in print-receipt mode (monospace, no colours) */
  printMode?: boolean;
}

const ReceiptBody: React.FC<ReceiptBodyProps> = ({ data, printMode = false }) => {
  const { date, time } = formatTimestamp(data.timestamp);
  const badge = PAYMENT_BADGE[data.paymentMethod];
  const hasDiscount = Boolean(data.discountApplied && data.originalAmount != null);
  const subtotal = data.originalAmount ?? data.totalAmount;

  return (
    <div
      className={
        printMode
          ? 'font-mono text-xs text-black w-full'
          : 'font-mono text-[13px] text-gray-800 w-full'
      }
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="text-center mb-3">
        <div
          className={
            printMode
              ? 'text-base font-bold leading-tight'
              : 'text-lg font-bold text-gray-900 leading-tight'
          }
        >
          🏥 PharmCare Pro Enterprise
        </div>
        <div className={printMode ? 'text-sm font-semibold mt-1' : 'text-sm font-semibold text-gray-700 mt-1'}>
          {data.branchName}
        </div>
        {data.branchLocation && (
          <div className={printMode ? 'text-xs mt-0.5' : 'text-xs text-gray-500 mt-0.5'}>
            {data.branchLocation}
          </div>
        )}
      </div>

      <DashedDivider />

      {/* ── Reference / Date / Time ─────────────────────────────────────────── */}
      <div className="mb-2 space-y-0.5">
        <div className="flex justify-between">
          <span className={printMode ? 'font-bold' : 'font-semibold text-gray-600'}>REF:</span>
          <span className={printMode ? '' : 'text-gray-900'}>REF-{data.id}</span>
        </div>
        <div className="flex justify-between">
          <span className={printMode ? 'font-bold' : 'font-semibold text-gray-600'}>Date:</span>
          <span>{date}</span>
        </div>
        <div className="flex justify-between">
          <span className={printMode ? 'font-bold' : 'font-semibold text-gray-600'}>Time:</span>
          <span>{time}</span>
        </div>
        <div className="flex justify-between">
          <span className={printMode ? 'font-bold' : 'font-semibold text-gray-600'}>Cashier:</span>
          <span>{data.cashierName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className={printMode ? 'font-bold' : 'font-semibold text-gray-600'}>Payment:</span>
          {printMode ? (
            <span>{badge.label}</span>
          ) : (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
        </div>
        {data.paymentMethod === 'MIXED' && data.splitPayments && (
          <div className="pl-4 text-[11px] leading-tight space-y-0.5 mt-1 border-l border-amber-300/40">
            <div className="flex justify-between text-gray-600">
              <span>Cash Portion:</span>
              <span className="font-mono">{formatNaira(data.splitPayments.cashAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{data.splitPayments.otherMethod} Portion:</span>
              <span className="font-mono">{formatNaira(data.splitPayments.otherAmount)}</span>
            </div>
          </div>
        )}
        {data.customerName && (
          <div className="flex justify-between">
            <span className={printMode ? 'font-bold' : 'font-semibold text-gray-600'}>Customer:</span>
            <span>{data.customerName}{data.customerPhone ? ` (${data.customerPhone})` : ''}</span>
          </div>
        )}
        {data.prescriptionId && (
          <div className="flex justify-between">
            <span className={printMode ? 'font-bold' : 'font-semibold text-gray-600'}>Rx ID:</span>
            <span>{data.prescriptionId}{data.doctorName ? ` (Dr. ${data.doctorName.replace(/^Dr\.\s+/i, '')})` : ''}</span>
          </div>
        )}
        {data.dosageInstructions && (
          <div className="text-left mt-1 text-[11px] leading-tight">
            <span className={printMode ? 'font-bold' : 'font-semibold text-gray-600'}>Dosage:</span>{' '}
            <span className="italic text-gray-600">{data.dosageInstructions}</span>
          </div>
        )}
        {data.billingNotes && (
          <div className="text-left mt-1 text-[11px] leading-tight">
            <span className={printMode ? 'font-bold' : 'font-semibold text-gray-600'}>Billing Note:</span>{' '}
            <span className="text-gray-600">{data.billingNotes}</span>
          </div>
        )}
      </div>

      <DashedDivider />

      {/* ── Items Table ─────────────────────────────────────────────────────── */}
      <table className="w-full text-xs border-collapse mb-1">
        <thead>
          <tr
            className={
              printMode
                ? 'border-b border-dashed border-black'
                : 'border-b border-dashed border-gray-400'
            }
          >
            <th className="text-left py-1 font-bold">Item</th>
            <th className="text-center py-1 font-bold w-8">Qty</th>
            <th className="text-right py-1 font-bold">Unit</th>
            <th className="text-right py-1 font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr
              key={idx}
              className={
                printMode
                  ? 'border-b border-dotted border-black/40 last:border-0'
                  : 'border-b border-dotted border-gray-200 last:border-0'
              }
            >
              <td className="py-1.5 pr-1 leading-tight">
                <div className={printMode ? 'font-semibold' : 'font-semibold text-gray-900'}>
                  {item.productName}
                </div>
                <div className={printMode ? 'text-[10px]' : 'text-[10px] text-gray-500'}>
                  SKU: {item.sku}
                </div>
              </td>
              <td className="py-1.5 text-center">{item.quantity}</td>
              <td className="py-1.5 text-right whitespace-nowrap font-mono">
                {formatNaira(item.unitPrice)}
              </td>
              <td className="py-1.5 text-right whitespace-nowrap font-semibold font-mono">
                {formatNaira(item.unitPrice * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <DashedDivider />

      {/* ── Discount + Totals ────────────────────────────────────────────────── */}
      <div className="space-y-1 mb-2">
        {hasDiscount && data.discountApplied ? (
          <>
            {/* Subtotal (struck-through) */}
            <div className="flex justify-between">
              <span className={printMode ? '' : 'text-gray-500'}>Subtotal</span>
              <span className={printMode ? '' : 'line-through text-gray-400'}>
                {formatNaira(subtotal)}
              </span>
            </div>

            {/* Discount line */}
            <div className="flex justify-between">
              <span className={printMode ? '' : 'text-red-600 font-medium'}>
                Discount ({data.discountApplied.code}
                {data.discountApplied.type === 'percentage'
                  ? ` ${data.discountApplied.value}%`
                  : ''}
                )
              </span>
              <span className={printMode ? '' : 'text-red-600 font-medium'}>
                -{formatNaira(data.discountApplied.discountAmount)}
              </span>
            </div>

            {/* Final total */}
            <div
              className={`flex justify-between pt-1 border-t border-dashed ${
                printMode ? 'border-black' : 'border-gray-400'
              }`}
            >
              <span
                className={
                  printMode ? 'text-sm font-bold' : 'text-sm font-bold text-emerald-700'
                }
              >
                TOTAL
              </span>
              <span
                className={
                  printMode
                    ? 'text-sm font-bold'
                    : 'text-sm font-bold text-emerald-700'
                }
              >
                {formatNaira(data.totalAmount)}
              </span>
            </div>
          </>
        ) : (
          /* Simple total — no discount */
          <div className="flex justify-between">
            <span
              className={printMode ? 'text-sm font-bold' : 'text-sm font-bold text-gray-900'}
            >
              TOTAL
            </span>
            <span
              className={printMode ? 'text-sm font-bold' : 'text-sm font-bold text-gray-900'}
            >
              {formatNaira(data.totalAmount)}
            </span>
          </div>
        )}
      </div>

      <DashedDivider />

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="text-center mt-2 space-y-1">
        <p className={printMode ? 'font-semibold' : 'font-semibold text-gray-700'}>
          Thank you for your patronage!
        </p>
        <p className={printMode ? 'text-[10px]' : 'text-[10px] text-gray-400'}>
          Powered by PharmCare Pro Enterprise
        </p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receiptData,
  isOpen,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    // Temporarily show the portal-mounted print div so window.print() picks it up.
    // Without this, the element's inline display:none would override the @media print rule
    // in some browsers.
    el.style.display = 'block';
    window.print();
    el.style.display = 'none';
  };

  return (
    <>
      {/* ── Print-only styles ────────────────────────────────────────────── */}
      {/* The print div is portalled directly onto <body> so it becomes a    */}
      {/* direct body child. The CSS rule hides all other body children      */}
      {/* (including #root) and shows only #pharmcare-print-receipt.         */}
      <style>{`
        @media print {
          body > *:not(#pharmcare-print-receipt) {
            display: none !important;
          }
          #pharmcare-print-receipt {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 80mm;
            padding: 8px;
            background: white;
            font-family: monospace;
          }
        }
      `}</style>

      {/* ── Print-only receipt — portalled to <body> (hidden on screen) ──── */}
      {createPortal(
        <div
          id="pharmcare-print-receipt"
          ref={printRef}
          style={{ display: 'none' }}
          aria-hidden="true"
        >
          <ReceiptBody data={receiptData} printMode />
        </div>,
        document.body
      )}

      {/* ── Screen overlay + modal ────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Receipt"
        onClick={(e) => {
          // Close when clicking the backdrop
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

        {/* Card */}
        <div className="relative z-10 w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* ── Card header bar ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-600">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-white" aria-hidden="true" />
              <span className="text-white font-semibold text-sm tracking-wide">
                Sale Receipt
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Close receipt modal"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* ── Success banner ──────────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border-b border-emerald-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="text-emerald-700 text-xs font-medium">
              Sale registered successfully
            </span>
          </div>

          {/* ── Receipt body (screen rendering) ─────────────────────────── */}
          <div className="px-5 py-4 bg-gray-50 max-h-[60vh] overflow-y-auto">
            {/* Thermal-paper feel: slight warm bg, mono font, tight layout */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-inner px-4 py-4">
              <ReceiptBody data={receiptData} />
            </div>
          </div>

          {/* ── Action buttons (screen only, not printed) ────────────────── */}
          <div className="flex gap-3 px-5 py-4 bg-white border-t border-gray-100 print:hidden">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export type { ReceiptData, ReceiptModalProps };

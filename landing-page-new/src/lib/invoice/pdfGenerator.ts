'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  hsnCode?: string;
}

export interface ClientDetails {
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  billingAddress?: string;
  gstin?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  companyDetails: {
    name: string;
    address: string;
    email: string;
    phone: string;
    gstin?: string;
    website?: string;
    logoUrl?: string;
  };
  clientDetails: ClientDetails;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount?: number;
  discountAmount?: number;
  total: number;
  currency: 'INR' | 'USD';
  notes?: string;
  paymentTerms?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode?: string;
    accountHolderName: string;
  };
  razorpayDetails?: {
    keyId: string;
    paymentLink?: string;
  };
}

export interface PaymentData {
  paymentId: string;
  orderId: string;
  signature?: string;
  amount: number;
  currency: 'INR' | 'USD';
  paymentDate: string;
  clientDetails: ClientDetails;
  invoiceNumber?: string;
  invoiceAmount?: number;
  paymentMethod?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode?: string;
    accountHolderName: string;
  };
}

const MOTIONIFY_BRAND_COLOR = '#7C3AED';
const MOTIONIFY_TEXT_COLOR = '#1F2937';
const MOTIONIFY_LIGHT_COLOR = '#F5F3FF';

export function formatCurrency(amount: number, currency: 'INR' | 'USD'): string {
  const formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  doc.setFillColor(...(hexToRgb(MOTIONIFY_BRAND_COLOR) as [number, number, number]));
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(data.companyDetails.name || 'Motionify', margin, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.companyDetails.address || '123 Business Park, Tech City', margin, 33);
  doc.text(`Email: ${data.companyDetails.email}`, margin, 39);
  if (data.companyDetails.phone) {
    doc.text(`Phone: ${data.companyDetails.phone}`, pageWidth - margin - 50, 33);
  }
  if (data.companyDetails.gstin) {
    doc.text(`GSTIN: ${data.companyDetails.gstin}`, pageWidth - margin - 50, 39);
  }

  yPosition = 55;

  doc.setTextColor(...(hexToRgb(MOTIONIFY_TEXT_COLOR) as [number, number, number]));
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', margin, yPosition);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPosition += 6;
  doc.text(data.clientDetails.name, margin, yPosition);

  if (data.clientDetails.companyName) {
    yPosition += 5;
    doc.text(data.clientDetails.companyName, margin, yPosition);
  }

  if (data.clientDetails.billingAddress) {
    yPosition += 5;
    doc.text(data.clientDetails.billingAddress, margin, yPosition);
  }

  if (data.clientDetails.email) {
    yPosition += 5;
    doc.text(`Email: ${data.clientDetails.email}`, margin, yPosition);
  }

  if (data.clientDetails.phone) {
    yPosition += 5;
    doc.text(`Phone: ${data.clientDetails.phone}`, margin, yPosition);
  }

  if (data.clientDetails.gstin) {
    yPosition += 5;
    doc.text(`GSTIN: ${data.clientDetails.gstin}`, margin, yPosition);
  }

  yPosition = 55;
  const rightColumnX = pageWidth - margin - 60;

  doc.setFillColor(...(hexToRgb(MOTIONIFY_LIGHT_COLOR) as [number, number, number]));
  doc.roundedRect(rightColumnX, yPosition - 5, 65, 35, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Invoice Number', rightColumnX + 5, yPosition);
  doc.text('Invoice Date', rightColumnX + 5, yPosition + 12);
  doc.text('Due Date', rightColumnX + 5, yPosition + 24);

  doc.setTextColor(...(hexToRgb(MOTIONIFY_TEXT_COLOR) as [number, number, number]));
  doc.setFont('helvetica', 'bold');
  doc.text(data.invoiceNumber, rightColumnX + 35, yPosition);
  doc.text(formatShortDate(data.invoiceDate), rightColumnX + 35, yPosition + 12);
  doc.text(formatShortDate(data.dueDate), rightColumnX + 35, yPosition + 24);

  yPosition = 100;

  const tableData = data.lineItems.map((item) => [
    item.description + (item.hsnCode ? `\nHSN: ${item.hsnCode}` : ''),
    item.quantity.toString(),
    formatCurrency(item.rate, data.currency),
    formatCurrency(item.amount, data.currency),
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: MOTIONIFY_BRAND_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: { top: 5, bottom: 5, left: 8, right: 8 },
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  const tableEndY = (doc as any).lastAutoTable.finalY + 10;

  const totalsX = pageWidth - margin - 70;
  const totalsValueX = pageWidth - margin;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  doc.text('Subtotal', totalsX, tableEndY);
  doc.setTextColor(...(hexToRgb(MOTIONIFY_TEXT_COLOR) as [number, number, number]));
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(data.subtotal, data.currency), totalsValueX, tableEndY, { align: 'right' });

  if (data.taxRate > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Tax (${data.taxRate}%)`, totalsX, tableEndY + 8);
    doc.setTextColor(...(hexToRgb(MOTIONIFY_TEXT_COLOR) as [number, number, number]));
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(data.taxAmount, data.currency), totalsValueX, tableEndY + 8, { align: 'right' });
  }

  if (data.discount && data.discountAmount && data.discountAmount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Discount (${data.discount}%)`, totalsX, tableEndY + (data.taxRate > 0 ? 16 : 8));
    doc.setTextColor(...(hexToRgb('#16A34A') as [number, number, number]));
    doc.setFont('helvetica', 'bold');
    doc.text(`-${formatCurrency(data.discountAmount, data.currency)}`, totalsValueX, tableEndY + (data.taxRate > 0 ? 16 : 8), { align: 'right' });
  }

  doc.setFillColor(...(hexToRgb(MOTIONIFY_LIGHT_COLOR) as [number, number, number]));
  doc.roundedRect(totalsX - 5, tableEndY + (data.taxRate > 0 ? 22 : 14), 75, 12, 2, 2, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(hexToRgb(MOTIONIFY_BRAND_COLOR) as [number, number, number]));
  doc.text('TOTAL', totalsX, tableEndY + (data.taxRate > 0 ? 30 : 22));
  doc.text(formatCurrency(data.total, data.currency), totalsValueX, tableEndY + (data.taxRate > 0 ? 30 : 22), { align: 'right' });

  let footerY = tableEndY + (data.taxRate > 0 ? 45 : 37);

  if (data.paymentTerms || data.notes) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);

    if (data.paymentTerms) {
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Terms', margin, footerY);
      doc.setFont('helvetica', 'normal');
      doc.text(data.paymentTerms, margin, footerY + 5);
      footerY += 15;
    }

    if (data.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Notes', margin, footerY);
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 2 * margin);
      doc.text(splitNotes, margin, footerY + 5);
      footerY += splitNotes.length * 4 + 10;
    }
  }

  const bankDetailsY = pageHeight - 55;
  doc.setFillColor(...(hexToRgb(MOTIONIFY_LIGHT_COLOR) as [number, number, number]));
  doc.rect(margin, bankDetailsY, pageWidth - 2 * margin, 40, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(hexToRgb(MOTIONIFY_BRAND_COLOR) as [number, number, number]));
  doc.text('Payment Information', margin + 5, bankDetailsY + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  if (data.bankDetails) {
    doc.text(`Bank: ${data.bankDetails.bankName}`, margin + 5, bankDetailsY + 15);
    doc.text(`A/C No: ${data.bankDetails.accountNumber}`, margin + 5, bankDetailsY + 21);
    if (data.bankDetails.ifscCode) {
      doc.text(`IFSC: ${data.bankDetails.ifscCode}`, margin + 5, bankDetailsY + 27);
    }
    doc.text(`Name: ${data.bankDetails.accountHolderName}`, margin + 5, bankDetailsY + 33);
  }

  if (data.razorpayDetails) {
    doc.setFontSize(8);
    doc.setTextColor(...(hexToRgb(MOTIONIFY_TEXT_COLOR) as [number, number, number]));
    const razorpayX = pageWidth / 2 + 10;
    doc.text('Pay via Razorpay', razorpayX, bankDetailsY + 8);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`Key ID: ${data.razorpayDetails.keyId}`, razorpayX, bankDetailsY + 15);
    if (data.razorpayDetails.paymentLink) {
      doc.text(`Link: ${data.razorpayDetails.paymentLink}`, razorpayX, bankDetailsY + 21);
    }
  }

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  const footerText = `This is a computer-generated invoice. Generated on ${formatDate(new Date().toISOString())}`;
  doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: 'center' });

  return doc.output('blob');
}

export async function generateReceiptPDF(paymentData: PaymentData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  doc.setFillColor(...(hexToRgb(MOTIONIFY_BRAND_COLOR) as [number, number, number]));
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Receipt', margin, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Motionify', margin, 33);
  doc.text('Thank you for your payment!', pageWidth - margin - 60, 25);

  yPosition = 55;

  doc.setFillColor(...(hexToRgb(MOTIONIFY_LIGHT_COLOR) as [number, number, number]));
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 50, 3, 3, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(hexToRgb(MOTIONIFY_TEXT_COLOR) as [number, number, number]));
  doc.text('Payment Confirmation', margin + 8, yPosition + 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Amount Paid: ${formatCurrency(paymentData.amount, paymentData.currency)}`, margin + 8, yPosition + 24);
  doc.text(`Date: ${formatDate(paymentData.paymentDate)}`, margin + 8, yPosition + 32);
  doc.text(`Status: COMPLETED`, margin + 8, yPosition + 40);

  doc.setTextColor(...(hexToRgb('#16A34A') as [number, number, number]));
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('✓', pageWidth - margin - 15, yPosition + 15);

  yPosition = 115;

  doc.setFontSize(10);
  doc.setTextColor(...(hexToRgb(MOTIONIFY_TEXT_COLOR) as [number, number, number]));
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Details', margin, yPosition);

  yPosition += 8;
  doc.setFillColor(...(hexToRgb(MOTIONIFY_LIGHT_COLOR) as [number, number, number]));
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 45, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  doc.text('Payment ID', margin + 8, yPosition + 10);
  doc.text('Order ID', margin + 8, yPosition + 20);
  if (paymentData.signature) {
    doc.text('Signature', margin + 8, yPosition + 30);
  }
  doc.text('Date & Time', margin + 8, yPosition + (paymentData.signature ? 40 : 30));
  if (paymentData.paymentMethod) {
    doc.text('Payment Method', margin + 8, yPosition + (paymentData.signature ? 50 : 40));
  }

  doc.setTextColor(...(hexToRgb(MOTIONIFY_TEXT_COLOR) as [number, number, number]));
  doc.setFont('helvetica', 'bold');
  const valueX = pageWidth / 2;
  doc.text(paymentData.paymentId, valueX, yPosition + 10);
  doc.text(paymentData.orderId, valueX, yPosition + 20);
  if (paymentData.signature) {
    const signaturePrefix = paymentData.signature.substring(0, 20) + '...';
    doc.text(signaturePrefix, valueX, yPosition + 30);
  }
  doc.text(formatDate(paymentData.paymentDate), valueX, yPosition + (paymentData.signature ? 40 : 30));
  if (paymentData.paymentMethod) {
    doc.text(paymentData.paymentMethod, valueX, yPosition + (paymentData.signature ? 50 : 40));
  }

  if (paymentData.invoiceNumber || paymentData.invoiceAmount) {
    yPosition += 55;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(hexToRgb(MOTIONIFY_TEXT_COLOR) as [number, number, number]));
    doc.text('Invoice Reference', margin, yPosition);

    yPosition += 8;
    doc.setFillColor(...(hexToRgb(MOTIONIFY_LIGHT_COLOR) as [number, number, number]));
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 25, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Invoice Number', margin + 8, yPosition + 10);
    doc.text('Invoice Amount', margin + 8, yPosition + 18);

    doc.setTextColor(...(hexToRgb(MOTIONIFY_TEXT_COLOR) as [number, number, number]));
    doc.setFont('helvetica', 'bold');
    doc.text(paymentData.invoiceNumber || 'N/A', valueX, yPosition + 10);
    doc.text(paymentData.invoiceAmount ? formatCurrency(paymentData.invoiceAmount, paymentData.currency) : 'N/A', valueX, yPosition + 18);
  }

  yPosition += 40;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(hexToRgb(MOTIONIFY_TEXT_COLOR) as [number, number, number]));
  doc.text('Bill To', margin, yPosition);

  yPosition += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(paymentData.clientDetails.name, margin, yPosition);

  if (paymentData.clientDetails.companyName) {
    yPosition += 5;
    doc.text(paymentData.clientDetails.companyName, margin, yPosition);
  }

  if (paymentData.clientDetails.email) {
    yPosition += 5;
    doc.text(paymentData.clientDetails.email, margin, yPosition);
  }

  if (paymentData.bankDetails) {
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(hexToRgb(MOTIONIFY_TEXT_COLOR) as [number, number, number]));
    doc.text('Payment Received In', margin, yPosition);

    yPosition += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Bank: ${paymentData.bankDetails.bankName}`, margin, yPosition);
    doc.text(`Account: ${paymentData.bankDetails.accountNumber}`, margin + 50, yPosition);
  }

  doc.setFillColor(...(hexToRgb(MOTIONIFY_LIGHT_COLOR) as [number, number, number]));
  doc.rect(margin, pageHeight - 45, pageWidth - 2 * margin, 35, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(hexToRgb(MOTIONIFY_BRAND_COLOR) as [number, number, number]));
  doc.text('Need Help?', margin + 5, pageHeight - 38);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Contact us at billing@motionify.ai for any queries.', margin + 5, pageHeight - 30);
  doc.text('This receipt is computer-generated and does not require a signature.', margin + 5, pageHeight - 22);

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated on ${formatDate(new Date().toISOString())}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

  return doc.output('blob');
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

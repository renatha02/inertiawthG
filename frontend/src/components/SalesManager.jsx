// SalesManager.jsx - Handles sales recording, stock deductions, and transactions list.
// Integrates with inventory state and remote backend sale creation when available.

import React, { useState } from 'react';

export default function SalesManager({ inventory, sales, triggerSmsAlert, onCreateSale }) {
  const [selectedMedId, setSelectedMedId] = useState('');
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const currentDate = new Date();
  const inStockMeds = inventory.filter((item) => item.quantity > 0);
  const selectedMed = inventory.find((item) => item.id === selectedMedId);
  const totalCost = selectedMed ? selectedMed.unitPrice * saleQuantity : 0;

  const handleLogSale = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedMedId) {
      setError('Please select a medication from the list.');
      return;
    }
    if (saleQuantity <= 0) {
      setError('Quantity must be at least 1.');
      return;
    }
    if (!selectedMed || saleQuantity > selectedMed.quantity) {
      setError(`Insufficient stock! Only ${selectedMed?.quantity ?? 0} units are available.`);
      return;
    }

    setSubmitting(true);
    try {
      await onCreateSale(selectedMed.drugId ?? selectedMed.id, saleQuantity);
      triggerSmsAlert(
        'Point-of-Sale',
        `Sale of ${saleQuantity} ${selectedMed.name} recorded successfully.`
      );
      setSelectedMedId('');
      setSaleQuantity(1);
      setPaymentMethod('Cash');
    } catch (err) {
      setError(err.message || 'Sale creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontFamily: 'Outfit, sans-serif' }}>
          Sales Management
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Log counter sales, select payment types, and review historical receipts.
        </p>
      </div>

      {error && (
        <div className="alert-banner" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="sales-layout">
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif', marginBottom: '20px' }}>
            Record New counter Sale
          </h3>
          <form onSubmit={handleLogSale} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="form-group">
              <label>Select Medication *</label>
              <select
                value={selectedMedId}
                onChange={(e) => {
                  setSelectedMedId(e.target.value);
                  setSaleQuantity(1);
                }}
                required
              >
                <option value="">-- Choose drug in stock --</option>
                {inStockMeds.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Qty: {item.quantity} available | TSh {item.unitPrice.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label>Quantity *</label>
                {selectedMed && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    Max: {selectedMed.quantity} units
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                max={selectedMed ? selectedMed.quantity : undefined}
                value={saleQuantity}
                onChange={(e) => setSaleQuantity(parseInt(e.target.value, 10) || 1)}
                required
              />
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="Cash">Cash</option>
                <option value="M-Pesa">M-Pesa (Vodacom)</option>
                <option value="Tigo Pesa">Tigo Pesa (Tigo)</option>
                <option value="Airtel Money">Airtel Money (Airtel)</option>
                <option value="HaloPesa">HaloPesa (Halotel)</option>
                <option value="Invoice">Invoice / Credit</option>
              </select>
            </div>

            {selectedMed && (
              <div className="glass-panel" style={{ padding: '15px', background: 'var(--bg-tertiary)', borderLeft: '3px solid var(--accent-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Price per unit:</span>
                  <span>TSh {selectedMed.unitPrice.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '5px' }}>
                  <span>Grand Total:</span>
                  <span style={{ color: 'var(--accent-primary)' }}>TSh {totalCost.toLocaleString()}</span>
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ marginTop: '10px' }} disabled={submitting}>
              {submitting ? 'Recording Sale...' : '💰 Register Transaction'}
            </button>
          </form>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif', marginBottom: '20px' }}>
            Recent Transactions History
          </h3>

          {sales.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No transactions logged today.
            </div>
          ) : (
            <div className="receipt-log">
              {sales.map((sale) => (
                <div key={sale.saleId} className="glass-panel receipt-card hover-scale">
                  <div className="receipt-header">
                    <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{sale.saleId}</span>
                    <span>{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="receipt-body">
                    <h3>{sale.medicineName}</h3>
                    <p>Quantity Sold: {sale.quantity} units x TSh {sale.unitPrice.toLocaleString()}</p>
                  </div>
                  <div className="receipt-footer">
                    <span className="badge healthy" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                      💳 {sale.paymentMethod}
                    </span>
                    <span className="price-tag">
                      TSh {sale.totalCost.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

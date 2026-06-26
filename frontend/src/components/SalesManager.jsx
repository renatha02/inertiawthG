// SalesManager.jsx - Handles sales recording, stock deductions, and transactions list.
// Integrates with inventory state to perform deductions and warning notifications.

import React, { useState } from 'react'; // Import React library and useState hook.

// Props:
// - inventory: state array containing the drug records
// - setInventory: function to update inventory state
// - sales: state array containing logged transactions
// - setSales: function to update sales history
// - triggerSmsAlert: function to dispatch SMS notification
export default function SalesManager({ inventory, setInventory, sales, setSales, triggerSmsAlert }) {
  
  // 1. STATE VARIABLES
  // Form input field state.
  const [selectedMedId, setSelectedMedId] = useState('');
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Benchmark reference date for transactions (2026-06-23).
  const currentDate = new Date('2026-06-23');

  // Filter inventory to list only medications that have active stock (qty > 0).
  const inStockMeds = inventory.filter(item => item.quantity > 0);

  // Retrieve current selected medication object to inspect unit price and stock.
  const selectedMed = inventory.find(item => item.id === selectedMedId);

  // Calculate transaction total cost based on quantity and item price.
  const totalCost = selectedMed ? selectedMed.unitPrice * saleQuantity : 0;

  // 2. SUBMIT TRANSACTION HANDLER
  const handleLogSale = (e) => {
    e.preventDefault(); // Stop default browser refresh on form submit.

    // Validate if a medication has been selected.
    if (!selectedMedId) {
      alert("Please select a medication from the list.");
      return;
    }

    // Validate quantity is valid.
    if (saleQuantity <= 0) {
      alert("Quantity must be at least 1.");
      return;
    }

    // Check if enough stock exists.
    if (saleQuantity > selectedMed.quantity) {
      alert(`Insufficient stock! Only ${selectedMed.quantity} units of ${selectedMed.name} are available.`);
      return;
    }

    // A. Create new transaction log object.
    const newSaleId = `SAL-90${sales.length + 1}`;
    const newSale = {
      saleId: newSaleId,
      // Record transaction with local benchmark ISO timestamp.
      timestamp: currentDate.toISOString(),
      medicineId: selectedMed.id,
      medicineName: selectedMed.name,
      quantity: parseInt(saleQuantity),
      unitPrice: selectedMed.unitPrice,
      totalCost: totalCost,
      paymentMethod: paymentMethod
    };

    // B. Deduct quantity from target item in the inventory state list.
    const updatedInventory = inventory.map(item => {
      if (item.id === selectedMed.id) {
        const newQty = item.quantity - parseInt(saleQuantity);
        
        // C. Trigger SMS Alert if stock drops below threshold.
        if (newQty <= item.lowStockThreshold) {
          triggerSmsAlert(
            "Store Manager", 
            `WARNING: ${item.name} stock level has dropped to ${newQty} units (Threshold: ${item.lowStockThreshold}). Please reorder.`
          );
        }

        return {
          ...item,
          quantity: newQty
        };
      }
      return item;
    });

    // Write updates back to global state.
    setInventory(updatedInventory);
    setSales([newSale, ...sales]); // Prepend new transaction to display at top of list.

    // Reset input fields.
    setSelectedMedId('');
    setSaleQuantity(1);
    setPaymentMethod('Cash');
    
    alert(`Sale recorded successfully! Total: TSh ${totalCost.toLocaleString()}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header section */}
      <div>
        <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontFamily: 'Outfit, sans-serif' }}>
          Sales Management
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Log counter sales, select payment types, and review historical receipts.
        </p>
      </div>

      {/* Two-Column Layout */}
      <div className="sales-layout">
        
        {/* Left Column: Form panel to input new transactions */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif', marginBottom: '20px' }}>
            Record New counter Sale
          </h3>
          
          <form onSubmit={handleLogSale} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* Medication dropdown */}
            <div className="form-group">
              <label>Select Medication *</label>
              <select 
                value={selectedMedId} 
                onChange={(e) => {
                  setSelectedMedId(e.target.value);
                  setSaleQuantity(1); // Reset qty.
                }}
                required
              >
                <option value="">-- Choose drug in stock --</option>
                {inStockMeds.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Qty: {item.quantity} available | TSh {item.unitPrice.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity field & stock info label */}
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
                onChange={(e) => setSaleQuantity(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            {/* Payment Method selectors */}
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

            {/* Valuation display */}
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

            {/* Form submit button */}
            <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
              💰 Register Transaction
            </button>

          </form>
        </div>

        {/* Right Column: Historical Sales Receipts log list */}
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
                  
                  {/* Receipt Header details */}
                  <div className="receipt-header">
                    <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{sale.saleId}</span>
                    <span>{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {/* Body containing drug title and pricing breakdown */}
                  <div className="receipt-body">
                    <h3>{sale.medicineName}</h3>
                    <p>Quantity Sold: {sale.quantity} units x TSh {sale.unitPrice.toLocaleString()}</p>
                  </div>

                  {/* Footer summarizing pay method and total cost */}
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

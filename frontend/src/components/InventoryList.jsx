// InventoryList.jsx - Manages drug records, search filters, and batch CRUD operations.
// Allows pharmacists to review, add, edit, or remove medication batches.

import React, { useState } from 'react';

// Props:
// - inventory: state array containing the drug records
// - drugs: array of drug master records
// - suppliers: array of supplier records
// - setInventory: function to update inventory state
// - triggerSmsAlert: function to dispatch SMS notification
// - onCreateBatch: remote batch creation handler
// - onUpdateBatch: remote batch update handler
// - onDeleteBatch: remote batch delete handler
export default function InventoryList({
  inventory,
  drugs,
  suppliers,
  setInventory,
  triggerSmsAlert,
  onCreateBatch,
  onUpdateBatch,
  onDeleteBatch,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('Add');
  const [formData, setFormData] = useState({
    batchId: null,
    drugId: '',
    supplierId: '',
    batchNumber: '',
    quantity: 0,
    buyingPrice: 0,
    sellingPrice: 0,
    expiryDate: '',
    manufactureDate: '',
  });
  const [error, setError] = useState(null);
  const currentDate = new Date();

  const getItemStatus = (item) => {
    const expDate = new Date(item.expiryDate);
    if (expDate < currentDate) {
      return { label: 'Expired', class: 'expired', code: 'EXPIRED' };
    }
    const diffDays = Math.ceil((expDate - currentDate) / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 60) {
      return { label: 'Near Expiry', class: 'near-expiry', code: 'NEAR' };
    }
    if (item.quantity <= item.lowStockThreshold) {
      return { label: 'Low Stock', class: 'low-stock', code: 'LOW' };
    }
    return { label: 'Healthy', class: 'healthy', code: 'SAFE' };
  };

  const uniqueCategories = ['All', ...new Set(inventory.map((item) => item.category))];

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const statusInfo = getItemStatus(item);
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Expired' && statusInfo.code === 'EXPIRED') ||
      (statusFilter === 'Near Expiry' && statusInfo.code === 'NEAR') ||
      (statusFilter === 'Low Stock' && statusInfo.code === 'LOW') ||
      (statusFilter === 'Healthy' && statusInfo.code === 'SAFE');
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenAddModal = () => {
    setModalMode('Add');
    setError(null);
    setFormData({
      batchId: null,
      drugId: drugs?.[0]?.id ?? '',
      supplierId: suppliers?.[0]?.id ?? '',
      batchNumber: '',
      quantity: 0,
      buyingPrice: 0,
      sellingPrice: 0,
      expiryDate: '',
      manufactureDate: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setModalMode('Edit');
    setError(null);
    setFormData({
      batchId: item.id,
      drugId: item.drugId,
      supplierId: item.supplierId,
      batchNumber: item.batchNumber,
      quantity: item.quantity,
      buyingPrice: item.buyingPrice,
      sellingPrice: item.sellingPrice,
      expiryDate: item.expiryDate,
      manufactureDate: item.manufactureDate || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.drugId || !formData.batchNumber || !formData.expiryDate) {
      setError('Please complete the required fields.');
      return;
    }

    const batchPayload = {
      drug_id: Number(formData.drugId),
      supplier_id: formData.supplierId ? Number(formData.supplierId) : null,
      batch_number: formData.batchNumber,
      quantity: Number(formData.quantity),
      buying_price: Number(formData.buyingPrice),
      selling_price: Number(formData.sellingPrice),
      expiry_date: formData.expiryDate,
      manufacture_date: formData.manufactureDate || null,
    };

    try {
      if (modalMode === 'Add') {
        if (!onCreateBatch) {
          throw new Error('Batch creation is not available in this environment.');
        }
        await onCreateBatch(batchPayload);
        triggerSmsAlert('Inventory', `Batch ${formData.batchNumber} created for ${drugs.find((d) => d.id === Number(formData.drugId))?.name || 'drug'}.`);
      } else {
        if (!onUpdateBatch) {
          throw new Error('Batch update is not available in this environment.');
        }
        await onUpdateBatch(formData.batchId, batchPayload);
        triggerSmsAlert('Inventory', `Batch ${formData.batchNumber} updated successfully.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Unable to save batch.');
    }
  };

  const handleDeleteItem = async (item) => {
    if (!item) return;
    if (!window.confirm(`Delete batch ${item.batchNumber} for ${item.name}? This cannot be undone.`)) {
      return;
    }

    try {
      if (!onDeleteBatch) {
        throw new Error('Batch delete is not available in this environment.');
      }
      await onDeleteBatch(item.id);
      setInventory((prev) => prev.filter((row) => row.id !== item.id));
    } catch (err) {
      setError(err.message || 'Unable to delete batch.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontFamily: 'Outfit, sans-serif' }}>
            Inventory Management
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Review batches, update stock, and add new entries backed by the API.
          </p>
        </div>
        <button className="btn-primary" onClick={handleOpenAddModal} disabled={!drugs.length || !suppliers.length}>
          ✚ Register New Batch
        </button>
      </div>

      {error && <div className="alert-banner">{error}</div>}

      <div className="glass-panel" style={{ padding: '20px' }}>
        <div className="controls-row">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by drug, batch, or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filters-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Category:</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status:</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All</option>
                <option value="Expired">Expired</option>
                <option value="Near Expiry">Near Expiry</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Healthy">Healthy</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel table-responsive">
        {filteredInventory.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No batches found matching the active filters.
          </div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Drug</th>
                <th>Batch</th>
                <th>Supplier</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => {
                const status = getItemStatus(item);
                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.batchNumber}</td>
                    <td>{item.supplier}</td>
                    <td>{item.quantity}</td>
                    <td>TSh {item.unitPrice}</td>
                    <td>{item.expiryDate}</td>
                    <td>
                      <span className={`badge ${status.class}`}>
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn-secondary" onClick={() => handleOpenEditModal(item)}>
                          Edit
                        </button>
                        <button className="btn-danger" onClick={() => handleDeleteItem(item)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '15px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif' }}>
                {modalMode === 'Add' ? 'Register New Batch' : `Edit Batch ${formData.batchNumber}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="form-grid" style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label>Drug *</label>
                <select name="drugId" value={formData.drugId} onChange={handleInputChange} required>
                  {drugs.map((drug) => (
                    <option key={drug.id} value={drug.id}>
                      {drug.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Supplier</label>
                <select name="supplierId" value={formData.supplierId ?? ''} onChange={handleInputChange}>
                  <option value="">None</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Batch Number *</label>
                <input name="batchNumber" value={formData.batchNumber} onChange={handleInputChange} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  Quantity
                  <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} min="0" required />
                </label>
                <label>
                  Buying Price
                  <input type="number" name="buyingPrice" value={formData.buyingPrice} onChange={handleInputChange} min="0" step="0.01" required />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  Selling Price
                  <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleInputChange} min="0" step="0.01" required />
                </label>
                <label>
                  Expiry Date *
                  <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} required />
                </label>
              </div>

              <label>
                Manufacturing Date
                <input type="date" name="manufactureDate" value={formData.manufactureDate} onChange={handleInputChange} />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {modalMode === 'Add' ? 'Create Batch' : 'Save Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

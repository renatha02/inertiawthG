// InventoryList.jsx - Manages drug records, search filters, and CRUD operations.
// Allows pharmacists to review, add, edit, or remove medication batches.

import React, { useState } from 'react'; // Import React core and useState hook.

// Props:
// - inventory: state array containing the drug records
// - setInventory: function to update inventory state
// - triggerSmsAlert: function to dispatch SMS notification
export default function InventoryList({ inventory, setInventory, triggerSmsAlert }) {
  
  // 1. STATE INITIALIZATION
  // Search text state.
  const [searchTerm, setSearchTerm] = useState('');
  // Category filter state.
  const [categoryFilter, setCategoryFilter] = useState('All');
  // Alert status filter state.
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modal visibility states.
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Track if current modal action is 'Add' or 'Edit'.
  const [modalMode, setModalMode] = useState('Add');
  
  // State backing the form input fields.
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    batchNumber: '',
    category: 'Antibiotics',
    quantity: '',
    lowStockThreshold: '',
    unitPrice: '',
    expiryDate: '',
    supplier: '',
    description: ''
  });

  // Benchmark reference date for checks (2026-06-23).
  const currentDate = new Date('2026-06-23');

  // 2. HELPER LOGIC FOR DETERMINING ITEM STATUS
  // Evaluates state properties and returns corresponding badge text/class.
  const getItemStatus = (item) => {
    const expDate = new Date(item.expiryDate);
    // 1. Expired check:
    if (expDate < currentDate) {
      return { label: 'Expired', class: 'expired', code: 'EXPIRED' };
    }
    // 2. Near Expiry check (expiring within 60 days):
    const diffDays = Math.ceil((expDate - currentDate) / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 60) {
      return { label: 'Near Expiry', class: 'near-expiry', code: 'NEAR' };
    }
    // 3. Low stock check:
    if (item.quantity <= item.lowStockThreshold) {
      return { label: 'Low Stock', class: 'low-stock', code: 'LOW' };
    }
    // 4. Healthy standard check:
    return { label: 'Healthy', class: 'healthy', code: 'SAFE' };
  };

  // 3. FILTERING LOGIC
  // Extracts unique categories from the current inventory to build select filters.
  const uniqueCategories = ['All', ...new Set(inventory.map(item => item.category))];

  // Filters the inventory items matching search text, category select, and status badges.
  const filteredInventory = inventory.filter(item => {
    // Check if item details match search text (case-insensitive).
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Check if category matches select value.
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    
    // Check status badge matching.
    const statusInfo = getItemStatus(item);
    const matchesStatus = statusFilter === 'All' ||
                          (statusFilter === 'Expired' && statusInfo.code === 'EXPIRED') ||
                          (statusFilter === 'Near Expiry' && statusInfo.code === 'NEAR') ||
                          (statusFilter === 'Low Stock' && statusInfo.code === 'LOW') ||
                          (statusFilter === 'Healthy' && statusInfo.code === 'SAFE');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // 4. FORM AND MODAL ACTIONS
  // Handles text/number inputs writing into formData.
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Opens the modal form to register a new medicine batch.
  const handleOpenAddModal = () => {
    setModalMode('Add');
    // Reset form fields.
    setFormData({
      id: '',
      name: '',
      batchNumber: '',
      category: 'Antibiotics',
      quantity: 100, // Reasonable start value.
      lowStockThreshold: 20,
      unitPrice: 100,
      expiryDate: '2027-01-01',
      supplier: '',
      description: ''
    });
    setIsModalOpen(true);
  };

  // Opens modal form in Edit mode, pre-filling input fields with selected drug details.
  const handleOpenEditModal = (item) => {
    setModalMode('Edit');
    setFormData({
      ...item
    });
    setIsModalOpen(true);
  };

  // Saves the form data (either creating a new medicine object or modifying an existing one).
  const handleSaveForm = (e) => {
    e.preventDefault(); // Stop default browser refresh.
    
    // Basic verification.
    if (!formData.name || !formData.batchNumber || !formData.expiryDate) {
      alert("Please fill in Medicine Name, Batch Number, and Expiry Date.");
      return;
    }

    const updatedQty = parseInt(formData.quantity) || 0;
    const threshold = parseInt(formData.lowStockThreshold) || 0;
    const price = parseFloat(formData.unitPrice) || 0;

    if (modalMode === 'Add') {
      // 1. CREATE ACTION
      // Auto-generate a unique ID.
      const newId = `MED-00${inventory.length + 1}`;
      const newItem = {
        ...formData,
        id: newId,
        quantity: updatedQty,
        lowStockThreshold: threshold,
        unitPrice: price
      };
      
      // Update central state list.
      const updatedInventory = [...inventory, newItem];
      setInventory(updatedInventory);

      // Check if added item immediately triggers low stock or expiry warning.
      const statusInfo = getItemStatus(newItem);
      if (statusInfo.code === 'LOW') {
        triggerSmsAlert("Store Manager", `WARNING: New drug ${newItem.name} registered is low in stock (${newItem.quantity} units left).`);
      } else if (statusInfo.code === 'EXPIRED') {
        triggerSmsAlert("Pharmacist-in-Charge", `CRITICAL: Expired drug batch registered (${newItem.name}, Batch: ${newItem.batchNumber}, Expired: ${newItem.expiryDate}). Please dispose.`);
      }
    } else {
      // 2. UPDATE ACTION
      const updatedInventory = inventory.map(item => {
        if (item.id === formData.id) {
          const updatedItem = {
            ...formData,
            quantity: updatedQty,
            lowStockThreshold: threshold,
            unitPrice: price
          };

          // SMS alerts triggered on status change during edit save.
          const statusInfo = getItemStatus(updatedItem);
          const oldStatusInfo = getItemStatus(item);
          if (statusInfo.code === 'LOW' && oldStatusInfo.code !== 'LOW') {
            triggerSmsAlert("Store Manager", `WARNING: Edited stock levels. ${updatedItem.name} has fallen below threshold (${updatedItem.quantity} units remaining).`);
          } else if (statusInfo.code === 'EXPIRED' && oldStatusInfo.code !== 'EXPIRED') {
            triggerSmsAlert("Pharmacist-in-Charge", `CRITICAL: Batch ${updatedItem.batchNumber} of ${updatedItem.name} is now expired. Please remove from shelves.`);
          }

          return updatedItem;
        }
        return item;
      });
      setInventory(updatedInventory);
    }
    
    setIsModalOpen(false); // Close Modal popup.
  };

  // Deletes an item from inventory after user confirmation.
  const handleDeleteItem = (id) => {
    const targetItem = inventory.find(item => item.id === id);
    if (window.confirm(`Are you sure you want to delete ${targetItem ? targetItem.name : "this item"} from inventory?`)) {
      setInventory(prev => prev.filter(item => item.id !== id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Page Title Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontFamily: 'Outfit, sans-serif' }}>
            Inventory Management
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Register new medicine batches, search records, and verify expiry dates.
          </p>
        </div>
        
        {/* Trigger to open registration form */}
        <button className="btn-primary" onClick={handleOpenAddModal}>
          ✚ Register New Batch
        </button>
      </div>

      {/* Row containing search input and dropdown selectors */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div className="controls-row">
          
          {/* Text Input Search Box */}
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search by medicine name, batch, or supplier..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Selector group for filtering categories and statuses */}
          <div className="filters-group">
            
            {/* Category selection list */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Category:</span>
              <select 
                className="filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {uniqueCategories.map((cat, index) => (
                  <option key={index} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Status selection list (Normal, Expired, Near Expiry, etc.) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status:</span>
              <select 
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Healthy">Healthy</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Near Expiry">Near Expiry</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

          </div>

        </div>
      </div>

      {/* Table representing filtered data */}
      <div className="glass-panel table-responsive">
        {filteredInventory.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No medicine records found matching the active filters.
          </div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Drug Code</th>
                <th>Medicine Name</th>
                <th>Category</th>
                <th>Batch No</th>
                <th>Stock Qty</th>
                <th>Unit Price</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => {
                const status = getItemStatus(item);
                return (
                  <tr key={item.id}>
                    {/* Unique Identifier column */}
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.id}</td>
                    
                    {/* Item Name */}
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.supplier}</div>
                    </td>
                    
                    {/* Category Label */}
                    <td>{item.category}</td>
                    
                    {/* Batch Number */}
                    <td style={{ fontFamily: 'monospace' }}>{item.batchNumber}</td>
                    
                    {/* Physical Stock level */}
                    <td style={{ fontWeight: 600 }}>
                      <span style={{ color: item.quantity <= item.lowStockThreshold ? 'var(--status-warning)' : 'inherit' }}>
                        {item.quantity} units
                      </span>
                    </td>
                    
                    {/* Selling price */}
                    <td>TSh {item.unitPrice}</td>
                    
                    {/* Expiry Date string */}
                    <td style={{ fontWeight: 500 }}>
                      <span style={{ color: status.code === 'EXPIRED' ? 'var(--status-expired)' : status.code === 'NEAR' ? 'var(--status-near)' : 'inherit' }}>
                        {item.expiryDate}
                      </span>
                    </td>
                    
                    {/* Status Badge cell */}
                    <td>
                      <span className={`badge ${status.class}`}>
                        {status.label}
                      </span>
                    </td>
                    
                    {/* CRUD Actions cell */}
                    <td>
                      <div className="actions-cell">
                        {/* Edit Button */}
                        <button 
                          className="btn-icon" 
                          title="Edit Details"
                          onClick={() => handleOpenEditModal(item)}
                        >
                          ✏️
                        </button>
                        
                        {/* Delete Button */}
                        <button 
                          className="btn-icon delete" 
                          title="Delete Batch"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          🗑️
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

      {/* 5. ADD/EDIT POPUP MODAL DIALOG */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            
            {/* Modal Heading Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif' }}>
                {modalMode === 'Add' ? 'Register New Medication Batch' : `Modify Batch: ${formData.id}`}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Input Form */}
            <form onSubmit={handleSaveForm} className="form-grid">
              
              {/* Medicine Name Input */}
              <div className="form-group full-width">
                <label>Medicine Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  placeholder="e.g. Coartem 20/120mg"
                  required
                />
              </div>

              {/* Batch Number */}
              <div className="form-group">
                <label>Batch Number *</label>
                <input 
                  type="text" 
                  name="batchNumber" 
                  value={formData.batchNumber} 
                  onChange={handleInputChange} 
                  placeholder="e.g. CRT-2601"
                  required
                />
              </div>

              {/* Category selector */}
              <div className="form-group">
                <label>Therapeutic Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange}>
                  <option value="Antimalarials">Antimalarials</option>
                  <option value="Antibiotics">Antibiotics</option>
                  <option value="Analgesics">Analgesics</option>
                  <option value="Antiprotozoal">Antiprotozoal</option>
                  <option value="Respiratory">Respiratory</option>
                  <option value="Gastrointestinal">Gastrointestinal</option>
                  <option value="Diabetes Management">Diabetes Management</option>
                </select>
              </div>

              {/* Current Quantity */}
              <div className="form-group">
                <label>Quantity in Stock (units)</label>
                <input 
                  type="number" 
                  name="quantity" 
                  value={formData.quantity} 
                  onChange={handleInputChange} 
                  min="0"
                />
              </div>

              {/* Low Stock Warning limit */}
              <div className="form-group">
                <label>Low-Stock Threshold</label>
                <input 
                  type="number" 
                  name="lowStockThreshold" 
                  value={formData.lowStockThreshold} 
                  onChange={handleInputChange} 
                  min="0"
                />
              </div>

              {/* Price per unit */}
              <div className="form-group">
                <label>Unit Selling Price (TSh)</label>
                <input 
                  type="number" 
                  name="unitPrice" 
                  value={formData.unitPrice} 
                  onChange={handleInputChange} 
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Expiry Date */}
              <div className="form-group">
                <label>Expiry Date *</label>
                <input 
                  type="date" 
                  name="expiryDate" 
                  value={formData.expiryDate} 
                  onChange={handleInputChange} 
                  required
                />
              </div>

              {/* Supplier info */}
              <div className="form-group full-width">
                <label>Supplier Name</label>
                <input 
                  type="text" 
                  name="supplier" 
                  value={formData.supplier} 
                  onChange={handleInputChange} 
                  placeholder="e.g. KEMSA"
                />
              </div>

              {/* Description context info */}
              <div className="form-group full-width">
                <label>Usage Description</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  placeholder="Usage indications, warnings, storage temperature..."
                  rows="2"
                />
              </div>

              {/* Action Buttons */}
              <div className="modal-actions full-width">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

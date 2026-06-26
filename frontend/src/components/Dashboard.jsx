// Dashboard.jsx - Visualizes metrics, charts, and urgent expiry warnings.
// This forms the primary command center screen of the pharmacy application.

import React from 'react'; // Import React library.

// Props:
// - inventory: state array containing the drug records
// - sales: state array containing logged transactions
// - setActiveTab: function to trigger page changes from quick links
export default function Dashboard({ inventory, sales, setActiveTab }) {
  
  // Set current benchmark date matching user environment.
  const currentDate = new Date('2026-06-23');

  // 1. STATS METRICS CALCULATION
  // Calculate total number of medicine types registered in the system.
  const totalSku = inventory.length;

  // Calculate sum total quantity of all physical packages in stock.
  const totalStockUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate monetary valuation of the entire stock (quantity * unitPrice).
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  // Count items that have already passed their expiry date.
  const expiredItems = inventory.filter(item => new Date(item.expiryDate) < currentDate);

  // Count items that are low in stock (quantity <= threshold).
  const lowStockItems = inventory.filter(item => item.quantity <= item.lowStockThreshold);

  // Count items that will expire in the next 60 days (but aren't already expired).
  const nearExpiryItems = inventory.filter(item => {
    const exp = new Date(item.expiryDate);
    const diffTime = exp - currentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 60;
  });

  // 2. CHART DATA DYNAMIC PREPARATION
  // Calculate stock value grouped by category.
  const categoryValues = inventory.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + (item.quantity * item.unitPrice);
    return acc;
  }, {});

  // Convert category value map to an array of objects for easier visual plotting.
  const chartData = Object.keys(categoryValues).map(cat => ({
    category: cat,
    value: categoryValues[cat]
  }));

  // Find the maximum category value to calculate proportional heights for SVG bars.
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 1;

  // 3. CRITICAL ALERTS SELECTION
  // Select top 3 items that are either expired or near expiry to show in the side timeline.
  const urgentAlerts = inventory
    .filter(item => {
      const exp = new Date(item.expiryDate);
      const isExpired = exp < currentDate;
      const diffDays = Math.ceil((exp - currentDate) / (1000 * 60 * 60 * 24));
      const isNear = diffDays > 0 && diffDays <= 60;
      return isExpired || isNear || item.quantity <= item.lowStockThreshold;
    })
    .slice(0, 3); // Take first 3 entries only for space aesthetics.

  const marqueeItems = [
    '📈 Live inventory insights are trending positively',
    '⚠️ Critical expiry checks stay visible at a glance',
    '💊 Fast-moving medicines remain well-stocked',
    '🌿 Pharmacy operations now feel more polished and engaging'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Page header displaying welcome title and local current date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontFamily: 'Outfit, sans-serif' }}>
            System Dashboard
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Real-time pharmacy status and drug safety indicators.
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: 600 }}>
          📅 Benchmark Date: <span style={{ color: 'var(--accent-primary)' }}>June 23, 2026</span>
        </div>
      </div>

      <div className="marquee-wrapper">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, index) => (
            <span key={index} className="marquee-item">{item}</span>
          ))}
        </div>
      </div>

      {/* Grid of Key Performance Indicators (KPI Cards) centered for a cleaner dashboard layout */}
      <div className="stats-section">
        <div className="stats-grid">
          
          {/* KPI 1: Inventory Valuation */}
          <div className="glass-panel stat-card hover-scale">
            <div className="stat-info">
              <span className="stat-label">Stock Value</span>
              <span className="stat-value">TSh {totalValue.toLocaleString()}</span>
              <span className="stat-sub">{totalStockUnits} total packages in store</span>
            </div>
            <div className="stat-icon" style={{ color: 'var(--accent-primary)' }}>💰</div>
          </div>

          {/* KPI 2: Expired Drugs (CRITICAL Alert) */}
          <div className={`glass-panel stat-card hover-scale critical ${expiredItems.length > 0 ? 'glowing-border' : ''}`}>
            <div className="stat-info">
              <span className="stat-label">Expired Batches</span>
              <span className="stat-value" style={{ color: expiredItems.length > 0 ? 'var(--status-expired)' : 'inherit' }}>
                {expiredItems.length}
              </span>
              <span className="stat-sub" style={{ color: expiredItems.length > 0 ? 'var(--status-expired)' : 'inherit' }}>
                {expiredItems.length > 0 ? "Requires urgent bio-disposal!" : "All batches safe"}
              </span>
            </div>
            <div className="stat-icon" style={{ color: 'var(--status-expired)' }}>🚨</div>
          </div>

          {/* KPI 3: Near Expiry Warnings */}
          <div className="glass-panel stat-card hover-scale near-exp">
            <div className="stat-info">
              <span className="stat-label">Expiring Soon</span>
              <span className="stat-value" style={{ color: nearExpiryItems.length > 0 ? 'var(--status-near)' : 'inherit' }}>
                {nearExpiryItems.length}
              </span>
              <span className="stat-sub">Expiring within 60 days</span>
            </div>
            <div className="stat-icon" style={{ color: 'var(--status-near)' }}>⚠️</div>
          </div>

          {/* KPI 4: Low Stock Warnings */}
          <div className="glass-panel stat-card hover-scale warning">
            <div className="stat-info">
              <span className="stat-label">Low Stock Alerts</span>
              <span className="stat-value" style={{ color: lowStockItems.length > 0 ? 'var(--status-warning)' : 'inherit' }}>
                {lowStockItems.length}
              </span>
              <span className="stat-sub">Below safety threshold</span>
            </div>
            <div className="stat-icon" style={{ color: 'var(--status-warning)' }}>📦</div>
          </div>

        </div>
      </div>

      {/* Main Row: SVG Chart visualization on left, Urgent Expiry list on right */}
      <div className="dashboard-details-grid">
        
        {/* Left Side: Dynamic Custom SVG Chart Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="panel-header">
            <h2>Inventory Valuation by Drug Category</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Values in TSh</span>
          </div>

          {chartData.length === 0 ? (
            <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No inventory data registered.
            </div>
          ) : (
            <div className="chart-container">
              {/* Dynamically render bar heights representing valuation of categories */}
              {chartData.map((data, index) => {
                // Calculate percentage height of bar relative to maximum height (200px limit)
                const barHeight = (data.value / maxValue) * 180;
                return (
                  <div key={index} className="chart-bar-group">
                    {/* Render visual bar element */}
                    <div 
                      className="chart-bar" 
                      style={{ height: `${Math.max(barHeight, 15)}px` }}
                    >
                      {/* Floating value text displayed above each bar on hover */}
                      <span className="chart-bar-value">
                        {data.value >= 1000 ? `${(data.value / 1000).toFixed(1)}k` : data.value}
                      </span>
                    </div>
                    {/* Category text labels */}
                    <span className="chart-bar-label" style={{ textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '80px', whiteSpace: 'nowrap' }}>
                      {data.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Timeline of Critical Alerts needing immediate pharmacist action */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="panel-header">
            <h2>Urgent Action Required</h2>
            {urgentAlerts.length > 0 && (
              <span className="badge expired ringing" style={{ padding: '2px 8px' }}>
                ALERT
              </span>
            )}
          </div>

          {urgentAlerts.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              ✓ No critical alerts active. Stock levels and expiries are safe.
            </div>
          ) : (
            <div className="timeline-list">
              {urgentAlerts.map((item, idx) => {
                const expDate = new Date(item.expiryDate);
                const isExpired = expDate < currentDate;
                const isLowStock = item.quantity <= item.lowStockThreshold;

                let marker = "🟢";
                let urgencyClass = "safe";
                let statusLabel = "Healthy";

                if (isExpired) {
                  marker = "🔴";
                  urgencyClass = "expired";
                  statusLabel = "EXPIRED";
                } else if (item.quantity <= item.lowStockThreshold) {
                  marker = "🟠";
                  urgencyClass = "near-expiry";
                  statusLabel = "LOW STOCK";
                } else {
                  marker = "🟡";
                  urgencyClass = "near-expiry";
                  statusLabel = "NEAR EXPIRY";
                }

                return (
                  <div key={idx} className={`timeline-item ${isExpired ? 'expired' : 'near-expiry'}`}>
                    <span className="timeline-marker">{marker}</span>
                    <div className="timeline-info" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4>{item.name}</h4>
                        <span className={`badge ${isExpired ? 'expired' : 'near-expiry'}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                          {statusLabel}
                        </span>
                      </div>
                      <p>Batch: {item.batchNumber} | Qty: {item.quantity} units</p>
                      
                      {isExpired ? (
                        <span className="timeline-date" style={{ color: 'var(--status-expired)' }}>
                          Expired: {item.expiryDate}
                        </span>
                      ) : isLowStock ? (
                        <span className="timeline-date" style={{ color: 'var(--status-warning)' }}>
                          Threshold: {item.lowStockThreshold} units
                        </span>
                      ) : (
                        <span className="timeline-date" style={{ color: 'var(--status-near)' }}>
                          Expiry: {item.expiryDate}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Quick nav link directing pharmacist to simulation area to notify suppliers/staff */}
              <button 
                className="btn-primary" 
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  fontSize: '0.8rem', 
                  marginTop: '10px', 
                  background: 'linear-gradient(135deg, var(--status-safe), hsl(150, 84%, 33%))', 
                  color: 'var(--bg-primary)',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}
                onClick={() => setActiveTab('simulator')}
              >
                Go to SMS & USSD Simulator ➜
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

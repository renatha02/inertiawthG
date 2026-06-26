// Dashboard.jsx - Visualizes metrics, charts, and urgent expiry warnings.
// This forms the primary command center screen of the pharmacy application.

import React from 'react';

// Props:
// - inventory: state array containing the drug records
// - sales: state array containing logged transactions
// - dashboardStats: optional remote dashboard counters
// - setActiveTab: function to trigger page changes from quick links
export default function Dashboard({ inventory, sales, dashboardStats, setActiveTab }) {
  const currentDate = new Date();

  const totalSku = dashboardStats?.total_active_drugs ?? inventory.length;
  const totalBatches = dashboardStats?.total_batches ?? inventory.length;
  const lowStockCount = dashboardStats?.total_low_stock_drugs ?? inventory.filter((item) => item.quantity <= item.lowStockThreshold).length;
  const salesToday = dashboardStats?.total_sales_today ?? sales.length;
  const unreadAlerts = dashboardStats?.unread_alerts ?? 0;

  const categoryValues = inventory.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.quantity * item.unitPrice;
    return acc;
  }, {});

  const chartData = Object.keys(categoryValues).map((cat) => ({ category: cat, value: categoryValues[cat] }));
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map((d) => d.value)) : 1;

  const urgentAlerts = inventory
    .filter((item) => {
      const exp = new Date(item.expiryDate);
      const isExpired = exp < currentDate;
      const diffDays = Math.ceil((exp - currentDate) / (1000 * 60 * 60 * 24));
      const isNear = diffDays > 0 && diffDays <= 60;
      return isExpired || isNear || item.quantity <= item.lowStockThreshold;
    })
    .slice(0, 3);

  const marqueeItems = [
    '📈 Live inventory insights are trending positively',
    '⚠️ Critical expiry checks stay visible at a glance',
    '💊 Fast-moving medicines remain well-stocked',
    '🌿 Pharmacy operations now feel more polished and engaging',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontFamily: 'Outfit, sans-serif' }}>
            System Dashboard
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Real-time insights on stock, alerts, and sales performance.
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: 600 }}>
          📅 {currentDate.toLocaleDateString()}
        </div>
      </div>

      <div className="marquee-wrapper">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, index) => (
            <span key={index} className="marquee-item">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="stats-section">
        <div className="stats-grid">
          <div className="glass-panel stat-card hover-scale">
            <div className="stat-info">
              <span className="stat-label">Active Drug SKUs</span>
              <span className="stat-value">{totalSku}</span>
              <span className="stat-sub">Active medicine types in inventory</span>
            </div>
            <div className="stat-icon" style={{ color: 'var(--accent-primary)' }}>🧾</div>
          </div>

          <div className="glass-panel stat-card hover-scale">
            <div className="stat-info">
              <span className="stat-label">Active Batches</span>
              <span className="stat-value">{totalBatches}</span>
              <span className="stat-sub">Current stocked batches</span>
            </div>
            <div className="stat-icon" style={{ color: 'var(--status-safe)' }}>📦</div>
          </div>

          <div className="glass-panel stat-card hover-scale warning">
            <div className="stat-info">
              <span className="stat-label">Low Stock Alerts</span>
              <span className="stat-value">{lowStockCount}</span>
              <span className="stat-sub">Items at or below reorder threshold</span>
            </div>
            <div className="stat-icon" style={{ color: 'var(--status-warning)' }}>⚠️</div>
          </div>

          <div className="glass-panel stat-card hover-scale near-exp">
            <div className="stat-info">
              <span className="stat-label">Sales Today</span>
              <span className="stat-value">{salesToday}</span>
              <span className="stat-sub">Transactions recorded today</span>
            </div>
            <div className="stat-icon" style={{ color: 'var(--status-near)' }}>💳</div>
          </div>
        </div>
      </div>

      <div className="dashboard-details-grid">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="panel-header">
            <h2>Inventory Valuation by Category</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Values in TSh</span>
          </div>

          {chartData.length === 0 ? (
            <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No inventory data available.
            </div>
          ) : (
            <div className="chart-container">
              {chartData.map((data, index) => {
                const barHeight = (data.value / maxValue) * 180;
                return (
                  <div key={index} className="chart-bar-group">
                    <div className="chart-bar" style={{ height: `${Math.max(barHeight, 15)}px` }}>
                      <span className="chart-bar-value">
                        {data.value >= 1000 ? `${(data.value / 1000).toFixed(1)}k` : data.value}
                      </span>
                    </div>
                    <span className="chart-bar-label" style={{ textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '80px', whiteSpace: 'nowrap' }}>
                      {data.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
              ✓ No critical alerts are active.
            </div>
          ) : (
            <div className="timeline-list">
              {urgentAlerts.map((item, idx) => {
                const expDate = new Date(item.expiryDate);
                const isExpired = expDate < currentDate;
                const isLowStock = item.quantity <= item.lowStockThreshold;
                const statusLabel = isExpired ? 'EXPIRED' : isLowStock ? 'LOW STOCK' : 'NEAR EXPIRY';

                return (
                  <div key={idx} className={`timeline-item ${isExpired ? 'expired' : 'near-expiry'}`}>
                    <span className="timeline-marker">{isExpired ? '🔴' : isLowStock ? '🟠' : '🟡'}</span>
                    <div className="timeline-info" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4>{item.name}</h4>
                        <span className={`badge ${isExpired ? 'expired' : 'near-expiry'}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                          {statusLabel}
                        </span>
                      </div>
                      <p>Batch: {item.batchNumber} | Qty: {item.quantity} units</p>
                      <span className="timeline-date" style={{ color: isExpired ? 'var(--status-expired)' : isLowStock ? 'var(--status-warning)' : 'var(--status-near)' }}>
                        {isExpired ? `Expired: ${item.expiryDate}` : `Expiry: ${item.expiryDate}`}
                      </span>
                    </div>
                  </div>
                );
              })}

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
                  fontWeight: 'bold',
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

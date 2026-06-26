// SmsLog.jsx - Displays logs of automated SMS alerts sent out via Africa's Talking APIs.
// Simulates real-time system broadcasts to pharmacist staff and store managers.

import React from 'react'; // Import React core library.

// Props:
// - smsAlerts: state array containing SMS notification objects
// - setSmsAlerts: state setter to manage message logs (e.g. clearing lists)
export default function SmsLog({ smsAlerts, setSmsAlerts }) {
  
  // 1. ACTION HANDLER
  // Clears the history of simulated broadcasts.
  const handleClearLogs = () => {
    if (window.confirm("Are you sure you want to clear all SMS history log feeds?")) {
      setSmsAlerts([]); // Reset array back to empty state.
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header section with Clear actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit, sans-serif', marginBottom: '8px' }}>
            Africa's Talking SMS Broadcast Log
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Feed of automated warnings sent to clinic staff. Runs in parallel to inventory stock level checks.
          </p>
        </div>
        
        {/* Clear log history button */}
        {smsAlerts.length > 0 && (
          <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={handleClearLogs}>
            🗑️ Clear Feed
          </button>
        )}
      </div>

      {/* Message Feed Display container */}
      <div className="glass-panel" style={{ padding: '20px', minHeight: '300px' }}>
        {smsAlerts.length === 0 ? (
          // Display placeholder when no notifications exist
          <div style={{ display: 'flex', height: '250px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No SMS broadcasts dispatched yet today. Expiry triggers will log here.
          </div>
        ) : (
          // Grid layout displaying rows of custom SMS bubbles
          <div className="sms-feed">
            {smsAlerts.map((sms) => (
              <div key={sms.id} className="sms-bubble hover-scale">
                
                {/* Header row of SMS bubble containing receiver contact details and status indicator */}
                <div className="sms-meta">
                  <span className="sms-recipient">
                    📲 To: {sms.recipient}
                  </span>
                  
                  {/* Show delivery status and formatted local timestamp */}
                  <span>
                    {new Date(sms.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} | 
                    <span 
                      style={{ 
                        marginLeft: '5px', 
                        color: 'var(--status-safe)', 
                        fontWeight: 'bold' 
                      }}
                    >
                      ✓ {sms.status}
                    </span>
                  </span>
                </div>

                {/* Main text content of the SMS alert message */}
                <div className="sms-message">
                  {sms.message}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

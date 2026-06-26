// Navbar.jsx - Sidebar navigation component for the Pharmacy System.
// Displays branding, navigation options, and active warnings indicators.

import React from 'react'; // Import the standard React library.

// Functional component defining the Sidebar navigation panel.
// Props:
// - activeTab: current tab selected by the user (string)
// - setActiveTab: state setter function to change the active tab
// - alertCount: total number of active warnings/expiries (number)
export default function Navbar({ activeTab, setActiveTab, alertCount }) {
  
  // List of navigation menu items. Each item represents a screen tab.
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'sales', label: 'Sales Logger', icon: '💰' },
    { id: 'simulator', label: 'USSD & SMS Sim', icon: '📱' }
  ];

  return (
    <aside className="sidebar"> {/* Container styled as sidebar panel */}
      <div> {/* Group top branding and menu navigation */}
        
        {/* Brand/Logo header representing the application identity */}
        <div className="sidebar-brand">
          {/* Neon green/cyan gradient box logo containing pharmacy cross icon */}
          <div className="brand-icon">✚</div>
          
          <div className="brand-text">
            {/* Main title of final year project */}
            <h1>PHARMASTAT</h1>
            {/* System type badge */}
            <span>Inventory & SMS</span>
          </div>
        </div>

        {/* Dynamic navigation list items rendered from array config */}
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li
              // Unique key for efficient React Virtual DOM diffing.
              key={item.id}
              // Active class applied dynamically if current item ID matches state.
              className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              // Click handler to update state in the parent App.jsx.
              onClick={() => setActiveTab(item.id)}
            >
              {/* Unicode character or emoji acting as icon placeholder */}
              <span className="menu-icon" style={{ fontSize: '1.2rem' }}>
                {item.icon}
              </span>
              
              {/* Text label of the page link */}
              <span className="menu-label">{item.label}</span>
              
              {/* If this is the dashboard or simulator page, and alerts exist, show count badge */}
              {item.id === 'simulator' && alertCount > 0 && (
                <span 
                  className="badge expired ringing" 
                  style={{ 
                    marginLeft: 'auto', 
                    padding: '2px 8px', 
                    fontSize: '0.65rem' 
                  }}
                >
                  {alertCount}
                </span>
              )}
            </li>
          ))}
        </ul>

      </div>

      {/* Footer item representing user info for East African Pharmacist */}
      <div className="sidebar-footer">
        {/* Visual profile avatar container */}
        <div className="profile-avatar">
          RX
        </div>
        
        {/* Profile metadata text */}
        <div className="profile-info">
          <h3>Dr. J. Ndambuki</h3>
          <p>Pharmacist-in-Charge</p>
        </div>
      </div>
    </aside>
  );
}

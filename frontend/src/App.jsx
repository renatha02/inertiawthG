// App.jsx - Main entry component coordinating tab states and core data variables.
// Orchestrates reactivity between the inventory list, sales manager, and USSD simulators.

import React, { useState } from 'react'; // Import React library and useState hook.
import Navbar from './components/Navbar'; // Import Sidebar navigation component.
import Dashboard from './components/Dashboard'; // Import Dashboard component.
import InventoryList from './components/InventoryList'; // Import Inventory list component.
import SalesManager from './components/SalesManager'; // Import Sales logs manager component.
import UssdSimulator from './components/UssdSimulator'; // Import mobile USSD terminal component.
import SmsLog from './components/SmsLog'; // Import Africa's Talking SMS log console component.

// Import initial database seeds from mock data file.
import { initialInventory, initialSales, initialSmsAlerts } from './data/mockData';

export default function App() {
  
  // 1. STATE INITIALIZATION
  // Tracks active sidebar panel selection ('dashboard', 'inventory', 'sales', 'simulator').
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Array representing the database of pharmaceutical stock batches.
  const [inventory, setInventory] = useState(initialInventory);
  
  // Array representing logged pharmacy counter transaction receipts.
  const [sales, setSales] = useState(initialSales);
  
  // Array representing sent SMS logs via simulated Africa's Talking API.
  const [smsAlerts, setSmsAlerts] = useState(initialSmsAlerts);

  // System benchmark date (2026-06-23).
  const currentDate = new Date('2026-06-23');

  // 2. HELPER FUNCTIONS AND SYSTEM BROADCASTS
  // Triggered from subcomponents when warning states or quick sales occur.
  const triggerSmsAlert = (recipient, message) => {
    // Generate unique SMS message code.
    const newSmsId = `SMS-${Math.floor(100 + Math.random() * 900)}`;
    
    const newSms = {
      id: newSmsId,
      recipient: recipient,
      message: message,
      timestamp: new Date().toISOString(), // Log dispatch time.
      status: "Delivered" // Simulating SMS success dispatch.
    };

    // Prepend new SMS alert to the SMS state list.
    setSmsAlerts(prev => [newSms, ...prev]);
  };

  // 3. NAVBAR BADGE ALERTS CALCULATION
  // Counts total active warning conditions across the entire pharmacy inventory:
  // - Already expired items.
  // - Low stock levels.
  // - Items expiring within 60 days.
  const calculateTotalAlerts = () => {
    return inventory.filter(item => {
      const expDate = new Date(item.expiryDate);
      const isExpired = expDate < currentDate;
      
      const diffTime = expDate - currentDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isNearExpiry = diffDays > 0 && diffDays <= 60;
      
      const isLowStock = item.quantity <= item.lowStockThreshold;
      
      return isExpired || isNearExpiry || isLowStock;
    }).length;
  };

  // 4. ROUTER LAYOUT CONTROLLER
  // Selects correct layout view depending on activeTab state.
  const renderTabContent = () => {
    switch (activeTab) {
      
      case 'dashboard':
        return (
          <Dashboard 
            inventory={inventory} 
            sales={sales} 
            setActiveTab={setActiveTab} 
          />
        );
      
      case 'inventory':
        return (
          <InventoryList 
            inventory={inventory} 
            setInventory={setInventory} 
            triggerSmsAlert={triggerSmsAlert} 
          />
        );
      
      case 'sales':
        return (
          <SalesManager 
            inventory={inventory} 
            setInventory={setInventory} 
            sales={sales} 
            setSales={setSales} 
            triggerSmsAlert={triggerSmsAlert} 
          />
        );
      
      case 'simulator':
        return (
          // Simulated split grid containing the USSD mobile chassis alongside the live SMS broadcast log feed.
          <div className="simulators-grid">
            
            {/* Nokia simulator chassis panel */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <UssdSimulator 
                inventory={inventory} 
                setInventory={setInventory} 
                sales={sales} 
                setSales={setSales} 
                triggerSmsAlert={triggerSmsAlert} 
              />
            </div>
            
            {/* Africa's Talking API console output display */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <SmsLog 
                smsAlerts={smsAlerts} 
                setSmsAlerts={setSmsAlerts} 
              />
            </div>

          </div>
        );
      
      default:
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>404 Screen Not Found</h2>
          </div>
        );
    }
  };

  return (
    // Top-level container grid aligning sidebar Navbar and main display content.
    <div className="app-container">
      
      {/* Navigation panel sidebar passing state and warning badges */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        alertCount={calculateTotalAlerts()} 
      />

      {/* Main scrolling viewport showing active subpage layouts */}
      <main className="main-content">
        {renderTabContent()}
      </main>

    </div>
  );
}

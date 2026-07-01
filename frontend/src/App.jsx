// App.jsx - Main entry component coordinating API state, authentication, and UI views.
import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import SalesManager from './components/SalesManager';
import UssdSimulator from './components/UssdSimulator';
import SmsLog from './components/SmsLog';
import Login from './components/Login';
import {
  login as apiLogin,
  getMe,
  fetchDrugs,
  fetchBatches,
  fetchSales,
  fetchSuppliers,
  fetchAlerts,
  fetchDashboardStats,
  setStoredAccessToken,
  clearStoredAccessToken,
  createSale,
  createBatch,
  createDrug,
  createSupplier,
  updateBatch,
  deleteBatch,
} from './api';

const ACCESS_TOKEN_KEY = 'renatha_access_token';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [smsAlerts, setSmsAlerts] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const unwrapItems = (response) => {
    if (Array.isArray(response)) {
      return response;
    }
    return response?.items ?? [];
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const hasToken = Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
        if (!hasToken) {
          setLoading(false);
          return;
        }
        const profile = await getMe();
        setUser(profile);
        await loadAllData();
      } catch (err) {
        clearStoredAccessToken();
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  const buildInventory = (batches, drugs, suppliers) => {
    const drugMap = Object.fromEntries(drugs.map((drug) => [drug.id, drug]));
    const supplierMap = Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier]));
    return batches.map((batch) => {
      const drug = drugMap[batch.drug_id] || {};
      const supplier = supplierMap[batch.supplier_id] || {};
      return {
        id: batch.id,
        drugId: batch.drug_id,
        supplierId: batch.supplier_id,
        name: drug.name || 'Unknown Drug',
        category: drug.category || 'General',
        batchNumber: batch.batch_number,
        quantity: batch.quantity,
        lowStockThreshold: drug.reorder_level ?? 0,
        unitPrice: Number(batch.selling_price ?? 0),
        expiryDate: batch.expiry_date,
        supplier: supplier.name || 'Unknown Supplier',
        description: drug.category ? `Category: ${drug.category}` : '',
      };
    });
  };

  const buildSales = (salesList, drugs) => {
    const drugMap = Object.fromEntries(drugs.map((drug) => [drug.id, drug]));
    return salesList.map((sale) => {
      const drug = drugMap[sale.drug_id] || {};
      const totalPrice = Number(sale.total_price ?? 0);
      const quantity = sale.total_quantity ?? 0;
      return {
        saleId: String(sale.id),
        timestamp: sale.created_at,
        medicineId: sale.drug_id,
        medicineName: drug.name || `Drug #${sale.drug_id}`,
        quantity,
        unitPrice: quantity > 0 ? totalPrice / quantity : 0,
        totalCost: totalPrice,
        paymentMethod: 'POS',
      };
    });
  };

  const buildSmsAlerts = (alertsData) => {
    return unwrapItems(alertsData).map((alert) => ({
      id: String(alert.id),
      recipient: 'Pharmacy Staff',
      message: alert.message,
      timestamp: alert.created_at,
      status: alert.status === 'unread' ? 'Delivered' : 'Read',
    }));
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [drugsRes, batchesRes, suppliersRes, salesRes, alertsRes, statsRes] = await Promise.all([
        fetchDrugs(),
        fetchBatches(),
        fetchSuppliers(),
        fetchSales(),
        fetchAlerts('unread'),
        fetchDashboardStats(),
      ]);
      const drugsList = unwrapItems(drugsRes);
      const batchesList = unwrapItems(batchesRes);
      const suppliersList = unwrapItems(suppliersRes);
      const salesList = unwrapItems(salesRes);
      setDrugs(drugsList);
      setSuppliers(suppliersList);
      setInventory(buildInventory(batchesList, drugsList, suppliersList));
      setSales(buildSales(salesList, drugsList));
      setSmsAlerts(buildSmsAlerts(alertsRes));
      setDashboardStats(statsRes);
    } catch (err) {
      setError(err.message ?? 'Unable to load data from backend');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiLogin(email, password);
      setStoredAccessToken(response.access_token);
      setUser(response.user);
      await loadAllData();
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredAccessToken();
    setUser(null);
    setInventory([]);
    setSales([]);
    setSmsAlerts([]);
    setDashboardStats(null);
    setActiveTab('dashboard');
  };

  const handleCreateSale = async (drugId, totalQuantity) => {
    setLoading(true);
    try {
      const sale = await createSale(drugId, totalQuantity);
      await loadAllData();
      return sale;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (batchData) => {
    setLoading(true);
    try {
      await createBatch(batchData);
      await loadAllData();
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDrug = async (drugData) => {
    setLoading(true);
    try {
      await createDrug(drugData);
      await loadAllData();
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (supplierData) => {
    setLoading(true);
    try {
      await createSupplier(supplierData);
      await loadAllData();
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBatch = async (batchId, batchData) => {
    setLoading(true);
    try {
      await updateBatch(batchId, batchData);
      await loadAllData();
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    setLoading(true);
    try {
      await deleteBatch(batchId);
      await loadAllData();
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const triggerSmsAlert = (recipient, message) => {
    const newSms = {
      id: `SMS-${Math.floor(100 + Math.random() * 900)}`,
      recipient,
      message,
      timestamp: new Date().toISOString(),
      status: 'Delivered',
    };
    setSmsAlerts((prev) => [newSms, ...prev]);
  };

  const calculateTotalAlerts = () => {
    const currentDate = new Date();
    return inventory.filter((item) => {
      const expDate = new Date(item.expiryDate);
      const isExpired = expDate < currentDate;
      const diffDays = Math.ceil((expDate - currentDate) / (1000 * 60 * 60 * 24));
      const isNearExpiry = diffDays > 0 && diffDays <= 60;
      const isLowStock = item.quantity <= item.lowStockThreshold;
      return isExpired || isNearExpiry || isLowStock;
    }).length;
  };

  if (loading && !user) {
    return (
      <div className="app-container">
        <div className="loading-shell">Connecting to RENATHA backend...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-container">
        <Login onLogin={handleLogin} error={error} />
      </div>
    );
  }

  const renderTabContent = () => {
    if (loading && user) {
      return <div className="loading-shell">Refreshing backend data...</div>;
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            inventory={inventory}
            sales={sales}
            dashboardStats={dashboardStats}
            setActiveTab={setActiveTab}
          />
        );
      case 'inventory':
        return (
          <InventoryList
            inventory={inventory}
            setInventory={setInventory}
            triggerSmsAlert={triggerSmsAlert}
            drugs={drugs}
            suppliers={suppliers}
            onCreateBatch={handleCreateBatch}
            onCreateDrug={handleCreateDrug}
            onCreateSupplier={handleCreateSupplier}
            onUpdateBatch={handleUpdateBatch}
            onDeleteBatch={handleDeleteBatch}
          />
        );
      case 'sales':
        return (
          <SalesManager
            inventory={inventory}
            sales={sales}
            triggerSmsAlert={triggerSmsAlert}
            onCreateSale={handleCreateSale}
          />
        );
      case 'simulator':
        return (
          <div className="simulators-grid">
            <div className="glass-panel" style={{ padding: '24px' }}>
              <UssdSimulator
                inventory={inventory}
                setInventory={setInventory}
                sales={sales}
                setSales={setSales}
                triggerSmsAlert={triggerSmsAlert}
              />
            </div>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <SmsLog smsAlerts={smsAlerts} setSmsAlerts={setSmsAlerts} />
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
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} alertCount={calculateTotalAlerts()} />
      <main className="main-content">
        <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div>
            <strong>Signed in as:</strong> {user.name} ({user.role})
          </div>
          <button className="btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
        {error && (
          <div className="alert-banner" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}
        {renderTabContent()}
      </main>
    </div>
  );
}

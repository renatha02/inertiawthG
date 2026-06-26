const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";
const ACCESS_TOKEN_KEY = "renatha_access_token";

function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredAccessToken(token) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearStoredAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function getAuthHeaders() {
  const token = getStoredAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const url = `${API_BASE_URL}${path}`;
  const init = {
    method,
    headers: {
      ...headers,
      ...getAuthHeaders(),
    },
  };

  if (body) {
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, init);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(data?.detail || data?.message || response.statusText || "Request failed");
    error.status = response.status;
    error.response = data;
    throw error;
  }

  return data;
}

export function login(email, password) {
  return request("/auth/login", { method: "POST", body: { email, password } });
}

export function getMe() {
  return request("/auth/me");
}

export function fetchDrugs() {
  return request("/drugs");
}

export function fetchBatches() {
  return request("/batches");
}

export function fetchSales() {
  return request("/sales");
}

export function fetchSuppliers() {
  return request("/suppliers");
}

export function fetchAlerts(status = null) {
  const query = status ? `?status=${status}` : "";
  return request(`/alerts${query}`);
}

export function createSale(drug_id, total_quantity) {
  return request("/sales", { method: "POST", body: { drug_id, total_quantity } });
}

export function createBatch(batchData) {
  return request("/batches", { method: "POST", body: batchData });
}

export function updateBatch(batchId, batchData) {
  return request(`/batches/${batchId}`, { method: "PUT", body: batchData });
}

export function deleteBatch(batchId) {
  return request(`/batches/${batchId}`, { method: "DELETE" });
}

export function fetchDashboardStats() {
  return request("/dashboard/stats");
}

// mockData.js - This file defines seed data for the pharmacy inventory.
// Customized for Tanzania (TSh currency, +255 phone codes, and local mobile money networks).

// Array of initial inventory items.
// Each object represents a batch of medication in the pharmacy.
export const initialInventory = [
  {
    // Unique identifier for the medicine batch.
    id: "MED-001",
    // Brand name combined with generic/chemical composition.
    name: "Coartem (Artemether/Lumefantrine)",
    // Specific manufacturing batch number for tracking and recalls.
    batchNumber: "CRT-26A09",
    // Therapeutic category of the drug.
    category: "Antimalarials",
    // Number of unit packs currently in stock.
    quantity: 12,
    // Minimum quantity before triggering a reorder alert.
    lowStockThreshold: 30,
    // Unit selling price in Tanzanian Shillings (TSh).
    unitPrice: 15000, // Realistic cost of Coartem in Tanzania (~15,000 TSh).
    // Date of drug expiration. Near current date (2026-06-23) to show alert.
    expiryDate: "2026-07-05", // Expiring in less than 2 weeks.
    // Medical supplier operating in East Africa.
    supplier: "MSD Tanzania (Medical Stores Dept)",
    // Actionable usage info.
    description: "First-line treatment for uncomplicated Malaria."
  },
  {
    id: "MED-002",
    name: "Amoxicillin Trihydrate 500mg",
    batchNumber: "AMX-25L12",
    category: "Antibiotics",
    // Stock is healthy, but near expiry.
    quantity: 150,
    lowStockThreshold: 40,
    unitPrice: 3000, // Price in TSh.
    // Date set to already expired relative to current date (2026-06-23).
    expiryDate: "2026-05-10", // Already expired.
    supplier: "Keko Pharmaceutical Industries (TZ)",
    description: "Broad-spectrum penicillin antibiotic."
  },
  {
    id: "MED-003",
    name: "Panadol Extra (Paracetamol/Caffeine)",
    batchNumber: "PAN-26B01",
    category: "Analgesics",
    // Quantity is very low (low-stock warning).
    quantity: 8,
    lowStockThreshold: 50,
    unitPrice: 200, // Price in TSh per tablet.
    // Expiring far in the future.
    expiryDate: "2028-02-18", // Long shelf-life.
    supplier: "Shelys Pharmaceuticals Ltd (TZ)",
    description: "Fast relief for pain and fever."
  },
  {
    id: "MED-004",
    name: "Flagyl 400mg (Metronidazole)",
    batchNumber: "FLG-25K03",
    category: "Antiprotozoal",
    quantity: 95,
    lowStockThreshold: 20,
    unitPrice: 4500, // Price in TSh.
    // Expiring within 2 months.
    expiryDate: "2026-08-15", // Near Expiry Warning.
    supplier: "Astra Pharma Tanzania",
    description: "Treatment for anaerobic bacterial and protozoal infections."
  },
  {
    id: "MED-005",
    name: "Salbutamol Inhaler 100mcg",
    batchNumber: "SAL-26C04",
    category: "Respiratory",
    quantity: 4,
    lowStockThreshold: 15,
    unitPrice: 10000, // Price in TSh.
    expiryDate: "2027-11-30", // Healthy shelf life.
    supplier: "MSD Tanzania (Medical Stores Dept)",
    description: "Bronchodilator for asthma relief."
  },
  {
    id: "MED-006",
    name: "Actal Antacid Tablets",
    batchNumber: "ACT-26F02",
    category: "Gastrointestinal",
    quantity: 300,
    lowStockThreshold: 100,
    unitPrice: 500, // Price in TSh.
    expiryDate: "2027-04-10", // Safe shelf-life.
    supplier: "Shelys Pharmaceuticals Ltd (TZ)",
    description: "Fast relief for heartburn and acid indigestion."
  },
  {
    id: "MED-007",
    name: "Insulin Glargine 100 U/mL",
    batchNumber: "INS-25H08",
    category: "Diabetes Management",
    quantity: 0, // Out of stock.
    lowStockThreshold: 10,
    unitPrice: 55000, // Price in TSh.
    expiryDate: "2026-06-15", // Already expired & out of stock.
    supplier: "Zenufa Laboratories (TZ)",
    description: "Long-acting basal insulin analogue."
  }
];

// Array of initial sales logs to populate the sales history page immediately.
export const initialSales = [
  {
    // Unique sale ID.
    saleId: "SAL-9001",
    // Date and time the transaction occurred.
    timestamp: "2026-06-22T14:30:00Z",
    // ID of the drug sold.
    medicineId: "MED-003",
    // Name of the drug.
    medicineName: "Panadol Extra (Paracetamol/Caffeine)",
    // Number of items purchased.
    quantity: 40,
    // Price per unit when sold.
    unitPrice: 200,
    // Total cost of the sale (quantity * unitPrice).
    totalCost: 8000,
    // Tanzanian Mobile money network networks: Tigo Pesa, M-Pesa, Airtel Money, HaloPesa.
    paymentMethod: "Tigo Pesa"
  },
  {
    saleId: "SAL-9002",
    timestamp: "2026-06-23T09:15:00Z",
    medicineId: "MED-001",
    medicineName: "Coartem (Artemether/Lumefantrine)",
    quantity: 2,
    unitPrice: 15000,
    totalCost: 30000,
    paymentMethod: "M-Pesa"
  },
  {
    saleId: "SAL-9003",
    timestamp: "2026-06-23T11:45:00Z",
    medicineId: "MED-006",
    medicineName: "Actal Antacid Tablets",
    quantity: 50,
    unitPrice: 500,
    totalCost: 25000,
    paymentMethod: "Airtel Money"
  }
];

// Pre-logged mock SMS notifications simulating messages sent out via Africa's Talking API.
export const initialSmsAlerts = [
  {
    // Unique ID for the message.
    id: "SMS-101",
    // Recipient role/phone - updated with Tanzanian phone prefix (+255).
    recipient: "Pharmacist-in-Charge (+255 754 123 456)",
    // Text content of the SMS.
    message: "ALERT: Batch CRT-26A09 of Coartem expires in 12 days (2026-07-05). Adjust sales priority.",
    // Dispatch timestamp.
    timestamp: "2026-06-23T08:00:00Z",
    // Delivery status.
    status: "Delivered"
  },
  {
    id: "SMS-102",
    recipient: "Store Manager (+255 784 987 654)",
    message: "WARNING: Salbutamol Inhaler stock level has dropped to 4 units (Threshold: 15). Reorder required.",
    timestamp: "2026-06-23T09:30:00Z",
    status: "Delivered"
  },
  {
    id: "SMS-103",
    recipient: "Pharmacist-in-Charge (+255 754 123 456)",
    message: "CRITICAL: Batch AMX-25L12 of Amoxicillin Trihydrate 500mg has expired (2026-05-10). Withdraw batch immediately.",
    timestamp: "2026-06-23T10:00:00Z",
    status: "Delivered"
  }
];

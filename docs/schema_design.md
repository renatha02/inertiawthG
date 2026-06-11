# RENATHA Database Schema Design
*Updated with Suppliers and FIFO Batch Deduction*

Here is the comprehensive database schema designed based on your requirements. 

## 1. `users`
Stores all staff members who can log in.
*   **id**: BIGINT (Primary Key)
*   **name**: VARCHAR (Full name)
*   **email**: VARCHAR (Unique login)
*   **password**: VARCHAR (Hashed)
*   **role**: ENUM ('admin', 'pharmacist', 'cashier')
*   **phone**: VARCHAR (Used for Africa's Talking SMS alerts)
*   **created_at**, **updated_at**: TIMESTAMP

## 2. `suppliers` (NEW)
Tracks manufacturers or distributors for batch traceability.
*   **id**: BIGINT (Primary Key)
*   **name**: VARCHAR (e.g., "MedSource Kenya")
*   **contact_person**: VARCHAR (Optional)
*   **phone**: VARCHAR
*   **email**: VARCHAR (Optional)
*   **address**: TEXT (Optional)
*   **created_at**, **updated_at**: TIMESTAMP

## 3. `drugs`
Master list of all pharmaceutical products.
*   **id**: BIGINT (Primary Key)
*   **name**: VARCHAR (e.g., "Paracetamol 500mg")
*   **category**: VARCHAR (e.g., "Analgesic")
*   **unit**: VARCHAR (e.g., "tablet", "bottle")
*   **reorder_level**: INT (Triggers low-stock alerts)
*   **is_active**: BOOLEAN (Soft delete flag, default: true)
*   **created_at**, **updated_at**: TIMESTAMP

## 4. `batches`
Tracks specific deliveries of drugs. Vital for expiry tracking.
*   **id**: BIGINT (Primary Key)
*   **drug_id**: BIGINT (Foreign Key -> `drugs`)
*   **supplier_id**: BIGINT (Foreign Key -> `suppliers`, Nullable)
*   **batch_number**: VARCHAR (Manufacturer's code)
*   **quantity**: INT (Current remaining stock in this specific batch)
*   **buying_price**: DECIMAL(10,2)
*   **selling_price**: DECIMAL(10,2)
*   **expiry_date**: DATE (Critical for alerts & FIFO)
*   **manufacture_date**: DATE (Nullable)
*   **created_at**, **updated_at**: TIMESTAMP

## 5. `sales`
Top-level record of a single drug sale transaction.
*   **id**: BIGINT (Primary Key)
*   **user_id**: BIGINT (Foreign Key -> `users`)
*   **drug_id**: BIGINT (Foreign Key -> `drugs`)
*   **total_quantity**: INT (Total units requested by customer)
*   **total_price**: DECIMAL(10,2)
*   **created_at**, **updated_at**: TIMESTAMP

## 6. `sale_batch_allocations` (NEW - For FIFO Logic)
Since a single `sale` might pull stock from two different batches (e.g., finishing an old batch and starting a new one), this table maps exactly which batches were deducted.
*   **id**: BIGINT (Primary Key)
*   **sale_id**: BIGINT (Foreign Key -> `sales`)
*   **batch_id**: BIGINT (Foreign Key -> `batches`)
*   **quantity_deducted**: INT (Amount taken from this specific batch)
*   **created_at**, **updated_at**: TIMESTAMP

## 7. `alerts`
Stores system-generated warnings.
*   **id**: BIGINT (Primary Key)
*   **drug_id**: BIGINT (Foreign Key -> `drugs`)
*   **batch_id**: BIGINT (Foreign Key -> `batches`, Nullable)
*   **type**: ENUM ('expiry', 'low_stock')
*   **message**: TEXT
*   **status**: ENUM ('unread', 'read')
*   **created_at**, **updated_at**: TIMESTAMP

---

### FIFO Logic Explanation:
When a cashier sells **50 Paracetamol**:
1. The system queries `batches` for Paracetamol, ordered by `expiry_date` ascending (oldest first).
2. **Batch A** (Expires in 2 months) has 20 left. The system takes 20, dropping Batch A's `quantity` to 0.
3. **Batch B** (Expires in 1 year) has 100 left. The system takes the remaining 30, dropping Batch B's `quantity` to 70.
4. It creates ONE record in `sales` (total 50).
5. It creates TWO records in `sale_batch_allocations` (20 from Batch A, 30 from Batch B).

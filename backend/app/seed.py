from datetime import date

from sqlalchemy.orm import Session

from . import models
from .auth import hash_password


DEFAULT_USERS = [
    {
        "name": "Renatha Admin",
        "email": "admin@renatha.com",
        "password": "Admin123!",
        "role": models.RoleEnum.admin,
        "phone": "+255700000001",
    },
    {
        "name": "Renatha Pharmacist",
        "email": "pharmacist@renatha.com",
        "password": "Pharm123!",
        "role": models.RoleEnum.pharmacist,
        "phone": "+255700000002",
    },
]

DEFAULT_SUPPLIERS = [
    {
        "name": "MSD Tanzania",
        "contact_person": "Supply Desk",
        "phone": "+255222111000",
        "email": "orders@msd.go.tz",
        "address": "Dar es Salaam, Tanzania",
    },
    {
        "name": "Shelys Pharmaceuticals",
        "contact_person": "Sales Team",
        "phone": "+255222222333",
        "email": "sales@shelys.co.tz",
        "address": "Dar es Salaam, Tanzania",
    },
]

DEFAULT_DRUGS = [
    {"name": "Coartem (Artemether/Lumefantrine)", "category": "Antimalarials", "unit": "tabs", "reorder_level": 30},
    {"name": "Amoxicillin Trihydrate 500mg", "category": "Antibiotics", "unit": "capsules", "reorder_level": 40},
    {"name": "Panadol Extra (Paracetamol/Caffeine)", "category": "Analgesics", "unit": "tabs", "reorder_level": 50},
]

DEFAULT_BATCHES = [
    {
        "drug_name": "Coartem (Artemether/Lumefantrine)",
        "supplier_name": "MSD Tanzania",
        "batch_number": "CRT-26A09",
        "quantity": 12,
        "buying_price": 12000,
        "selling_price": 15000,
        "expiry_date": date(2026, 7, 5),
        "manufacture_date": date(2025, 7, 5),
    },
    {
        "drug_name": "Amoxicillin Trihydrate 500mg",
        "supplier_name": "Shelys Pharmaceuticals",
        "batch_number": "AMX-25L12",
        "quantity": 150,
        "buying_price": 2200,
        "selling_price": 3000,
        "expiry_date": date(2027, 5, 10),
        "manufacture_date": date(2025, 5, 10),
    },
    {
        "drug_name": "Panadol Extra (Paracetamol/Caffeine)",
        "supplier_name": "Shelys Pharmaceuticals",
        "batch_number": "PAN-26B01",
        "quantity": 80,
        "buying_price": 120,
        "selling_price": 200,
        "expiry_date": date(2028, 2, 18),
        "manufacture_date": date(2026, 2, 18),
    },
]

DEFAULT_ALERTS = [
    {
        "drug_name": "Coartem (Artemether/Lumefantrine)",
        "batch_number": "CRT-26A09",
        "type": models.AlertTypeEnum.expiry,
        "message": "Batch CRT-26A09 of Coartem expires soon. Prioritize distribution.",
        "status": models.AlertStatusEnum.unread,
    },
    {
        "drug_name": "Amoxicillin Trihydrate 500mg",
        "batch_number": "AMX-25L12",
        "type": models.AlertTypeEnum.low_stock,
        "message": "Amoxicillin stock is healthy, keep monitoring expiry dates.",
        "status": models.AlertStatusEnum.read,
    },
]


def _get_or_create(db: Session, model, lookup: dict, defaults: dict):
    instance = db.query(model).filter_by(**lookup).first()
    if instance:
        return instance, False
    payload = {**lookup, **defaults}
    instance = model(**payload)
    db.add(instance)
    db.flush()
    return instance, True


def seed_database(db: Session) -> dict[str, int]:
    created = {"users": 0, "suppliers": 0, "drugs": 0, "batches": 0, "alerts": 0}

    user_by_email = {}
    for user in DEFAULT_USERS:
        instance, was_created = _get_or_create(
            db,
            models.User,
            {"email": user["email"]},
            {
                "name": user["name"],
                "password": hash_password(user["password"]),
                "role": user["role"],
                "phone": user["phone"],
            },
        )
        user_by_email[user["email"]] = instance
        created["users"] += int(was_created)

    supplier_by_name = {}
    for supplier in DEFAULT_SUPPLIERS:
        instance, was_created = _get_or_create(db, models.Supplier, {"name": supplier["name"]}, supplier)
        supplier_by_name[supplier["name"]] = instance
        created["suppliers"] += int(was_created)

    drug_by_name = {}
    for drug in DEFAULT_DRUGS:
        instance, was_created = _get_or_create(db, models.Drug, {"name": drug["name"]}, drug)
        drug_by_name[drug["name"]] = instance
        created["drugs"] += int(was_created)

    for batch in DEFAULT_BATCHES:
        drug = drug_by_name[batch["drug_name"]]
        supplier = supplier_by_name[batch["supplier_name"]]
        lookup = {"batch_number": batch["batch_number"]}
        defaults = {
            "drug_id": drug.id,
            "supplier_id": supplier.id,
            "quantity": batch["quantity"],
            "buying_price": batch["buying_price"],
            "selling_price": batch["selling_price"],
            "expiry_date": batch["expiry_date"],
            "manufacture_date": batch["manufacture_date"],
        }
        _, was_created = _get_or_create(db, models.Batch, lookup, defaults)
        created["batches"] += int(was_created)

    for alert in DEFAULT_ALERTS:
        drug = drug_by_name[alert["drug_name"]]
        batch = db.query(models.Batch).filter(models.Batch.batch_number == alert["batch_number"]).first()
        if not batch:
            continue
        _, was_created = _get_or_create(
            db,
            models.Alert,
            {"drug_id": drug.id, "batch_id": batch.id, "message": alert["message"]},
            {"type": alert["type"], "status": alert["status"]},
        )
        created["alerts"] += int(was_created)

    db.commit()
    return created

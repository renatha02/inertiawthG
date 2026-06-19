from fastapi import Query


def pagination_params(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max records per page"),
):
    return {"skip": skip, "limit": limit}


def paginated_response(query, skip: int, limit: int):
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return items, total

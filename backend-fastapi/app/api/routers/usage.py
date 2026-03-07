from fastapi import APIRouter

router = APIRouter(tags=['Usage'])

@router.get('/usage/summary')
async def usage_summary(from_date: str, to_date: str) -> dict:
    return {'from': from_date, 'to': to_date, 'totalRequests': 0, 'byProvider': [], 'estimatedCostUsd': 0.0}

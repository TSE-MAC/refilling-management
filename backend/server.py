from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import jwt


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise RuntimeError("MONGO_URL environment variable is not set. Please configure it in Vercel.")

client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'refillops')]

# Auth config
LOGIN_USER = os.environ.get('LOGIN_USER', 'suresafe')
LOGIN_PASS = os.environ.get('LOGIN_PASS', 'suresafe123')
JWT_SECRET = os.environ.get('JWT_SECRET', 'refillops-dev-secret-change-me')
JWT_ALG = 'HS256'
JWT_EXP_HOURS = 24 * 14  # 14 days

# FastAPI app
app = FastAPI(title="RefillOps API")
api_router = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)


# ---------- Auth ----------
def create_token(username: str) -> str:
    payload = {
        'sub': username,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def require_auth(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    if credentials is None or credentials.scheme.lower() != 'bearer':
        raise HTTPException(status_code=401, detail='Missing bearer token')
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        return payload.get('sub')
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail='Invalid or expired token')


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str


@api_router.post('/auth/login', response_model=LoginResponse)
async def login(body: LoginRequest):
    if body.username != LOGIN_USER or body.password != LOGIN_PASS:
        raise HTTPException(status_code=401, detail='Invalid credentials')
    return LoginResponse(token=create_token(body.username), username=body.username)


@api_router.get('/auth/me')
async def me(user: str = Depends(require_auth)):
    return {'username': user}


# ---------- Models ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class PartyIn(BaseModel):
    name: str
    phone: Optional[str] = None


class Party(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    createdAt: str


class SparePart(BaseModel):
    id: str
    name: str
    currentStock: int = 0


class StockLogEntry(BaseModel):
    id: str
    partId: str
    partName: str
    type: Literal['in', 'out']
    quantity: int
    date: str
    jobId: Optional[str] = None
    note: Optional[str] = None


class AddStockIn(BaseModel):
    quantity: int
    note: Optional[str] = None


class Extinguisher(BaseModel):
    type: Literal['CO2', 'DCP', 'ABC', 'Water', 'Foam']
    size: str
    unit: Literal['kg', 'ltr']
    quantity: int


class JobSparePart(BaseModel):
    partId: str
    partName: str
    quantityUsed: int


class JobIn(BaseModel):
    partyName: str
    partyId: Optional[str] = None
    extinguishers: List[Extinguisher] = Field(default_factory=list)
    spareParts: List[JobSparePart] = Field(default_factory=list)
    deliveryCharge: float = 0


class Job(BaseModel):
    id: str
    partyName: str
    partyId: Optional[str] = None
    status: Literal['active', 'dispatched'] = 'active'
    createdAt: str
    dispatchedAt: Optional[str] = None
    deliveryCharge: float = 0
    extinguishers: List[Extinguisher] = Field(default_factory=list)
    spareParts: List[JobSparePart] = Field(default_factory=list)


# ---------- Parties ----------
@api_router.get('/parties', response_model=List[Party])
async def list_parties(_: str = Depends(require_auth)):
    rows = await db.parties.find({}, {'_id': 0}).sort('name', 1).to_list(2000)
    return rows


@api_router.post('/parties', response_model=Party)
async def create_party(body: PartyIn, _: str = Depends(require_auth)):
    doc = {
        'id': str(uuid.uuid4()),
        'name': body.name.strip(),
        'phone': (body.phone or '').strip() or None,
        'createdAt': now_iso(),
    }
    if not doc['name']:
        raise HTTPException(status_code=400, detail='Name required')
    await db.parties.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api_router.put('/parties/{party_id}', response_model=Party)
async def update_party(party_id: str, body: PartyIn, _: str = Depends(require_auth)):
    update = {'name': body.name.strip(), 'phone': (body.phone or '').strip() or None}
    res = await db.parties.find_one_and_update(
        {'id': party_id}, {'$set': update}, return_document=True, projection={'_id': 0}
    )
    if not res:
        raise HTTPException(status_code=404, detail='Party not found')
    return res


@api_router.delete('/parties/{party_id}')
async def delete_party(party_id: str, _: str = Depends(require_auth)):
    res = await db.parties.delete_one({'id': party_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Party not found')
    return {'ok': True}


# ---------- Spare Parts ----------
@api_router.get('/spareparts', response_model=List[SparePart])
async def list_spareparts(_: str = Depends(require_auth)):
    rows = await db.spareparts.find({}, {'_id': 0}).sort('name', 1).to_list(2000)
    return rows


@api_router.get('/spareparts/stocklog', response_model=List[StockLogEntry])
async def stocklog(_: str = Depends(require_auth)):
    rows = await db.stocklogs.find({}, {'_id': 0}).sort('date', -1).to_list(5000)
    return rows


@api_router.post('/spareparts/{part_id}/addstock', response_model=SparePart)
async def add_stock(part_id: str, body: AddStockIn, _: str = Depends(require_auth)):
    if body.quantity <= 0:
        raise HTTPException(status_code=400, detail='Quantity must be positive')
    part = await db.spareparts.find_one({'id': part_id}, {'_id': 0})
    if not part:
        raise HTTPException(status_code=404, detail='Part not found')
    new_stock = int(part.get('currentStock', 0)) + int(body.quantity)
    await db.spareparts.update_one({'id': part_id}, {'$set': {'currentStock': new_stock}})
    log = {
        'id': str(uuid.uuid4()),
        'partId': part_id,
        'partName': part['name'],
        'type': 'in',
        'quantity': int(body.quantity),
        'date': now_iso(),
        'jobId': None,
        'note': body.note,
    }
    await db.stocklogs.insert_one(log)
    part['currentStock'] = new_stock
    return part


# ---------- Jobs ----------
def total_extinguishers(j: dict) -> int:
    return sum(int(e.get('quantity', 0)) for e in j.get('extinguishers', []))


@api_router.get('/jobs', response_model=List[Job])
async def list_jobs(status: Optional[str] = Query(None), _: str = Depends(require_auth)):
    q = {}
    if status in ('active', 'dispatched'):
        q['status'] = status
    rows = await db.jobs.find(q, {'_id': 0}).sort('createdAt', -1).to_list(5000)
    return rows


@api_router.post('/jobs', response_model=Job)
async def create_job(body: JobIn, _: str = Depends(require_auth)):
    if not body.partyName.strip():
        raise HTTPException(status_code=400, detail='Company name required')
    if not body.extinguishers:
        raise HTTPException(status_code=400, detail='At least one extinguisher row required')
    doc = {
        'id': str(uuid.uuid4()),
        'partyName': body.partyName.strip(),
        'partyId': body.partyId,
        'status': 'active',
        'createdAt': now_iso(),
        'dispatchedAt': None,
        'deliveryCharge': float(body.deliveryCharge or 0),
        'extinguishers': [e.model_dump() for e in body.extinguishers],
        'spareParts': [p.model_dump() for p in body.spareParts],
    }
    await db.jobs.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api_router.get('/jobs/{job_id}', response_model=Job)
async def get_job(job_id: str, _: str = Depends(require_auth)):
    job = await db.jobs.find_one({'id': job_id}, {'_id': 0})
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    return job


@api_router.put('/jobs/{job_id}', response_model=Job)
async def update_job(job_id: str, body: JobIn, _: str = Depends(require_auth)):
    job = await db.jobs.find_one({'id': job_id}, {'_id': 0})
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    if job.get('status') != 'active':
        raise HTTPException(status_code=400, detail='Only active jobs can be edited')
    if not body.extinguishers:
        raise HTTPException(status_code=400, detail='At least one extinguisher row required')
    update = {
        'partyName': body.partyName.strip(),
        'partyId': body.partyId,
        'deliveryCharge': float(body.deliveryCharge or 0),
        'extinguishers': [e.model_dump() for e in body.extinguishers],
        'spareParts': [p.model_dump() for p in body.spareParts],
    }
    res = await db.jobs.find_one_and_update(
        {'id': job_id}, {'$set': update}, return_document=True, projection={'_id': 0}
    )
    return res


@api_router.post('/jobs/{job_id}/dispatch', response_model=Job)
async def dispatch_job(job_id: str, _: str = Depends(require_auth)):
    job = await db.jobs.find_one({'id': job_id}, {'_id': 0})
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    if job.get('status') == 'dispatched':
        raise HTTPException(status_code=400, detail='Already dispatched')

    dispatched_at = now_iso()

    # Deduct spare parts and log
    for sp in job.get('spareParts', []):
        part = await db.spareparts.find_one({'id': sp['partId']}, {'_id': 0})
        if not part:
            continue
        qty = int(sp.get('quantityUsed', 0))
        new_stock = int(part.get('currentStock', 0)) - qty
        await db.spareparts.update_one({'id': sp['partId']}, {'$set': {'currentStock': new_stock}})
        log = {
            'id': str(uuid.uuid4()),
            'partId': sp['partId'],
            'partName': sp.get('partName') or part['name'],
            'type': 'out',
            'quantity': qty,
            'date': dispatched_at,
            'jobId': job_id,
            'note': f"Used in job for {job.get('partyName')}",
        }
        await db.stocklogs.insert_one(log)

    res = await db.jobs.find_one_and_update(
        {'id': job_id},
        {'$set': {'status': 'dispatched', 'dispatchedAt': dispatched_at}},
        return_document=True,
        projection={'_id': 0},
    )
    return res


# ---------- Dashboard ----------
@api_router.get('/dashboard/stats')
async def dashboard_stats(_: str = Depends(require_auth)):
    active_jobs = await db.jobs.find({'status': 'active'}, {'_id': 0}).to_list(5000)
    total_active = len(active_jobs)
    total_ext_in_shop = sum(total_extinguishers(j) for j in active_jobs)

    parts = await db.spareparts.find({}, {'_id': 0}).to_list(2000)
    low_stock = sum(1 for p in parts if int(p.get('currentStock', 0)) < 5)

    # Current calendar month delivery cost (UTC month boundaries)
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()
    if now.month == 12:
        next_month = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        next_month = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
    next_month_iso = next_month.isoformat()

    dispatched_this_month = await db.jobs.find(
        {
            'status': 'dispatched',
            'dispatchedAt': {'$gte': month_start, '$lt': next_month_iso},
        },
        {'_id': 0},
    ).to_list(5000)
    monthly_delivery = sum(float(j.get('deliveryCharge', 0) or 0) for j in dispatched_this_month)

    return {
        'activeJobs': total_active,
        'extinguishersInShop': total_ext_in_shop,
        'lowStockParts': low_stock,
        'monthlyDeliveryCost': monthly_delivery,
    }


# ---------- Seed ----------
SEED_PARTS = [
    'ABC Valve',
    'Spindle',
    'ABC Pipe',
    'CO2 Discharge Set',
    'CO2 Pipe',
    'CO2 Horn',
]


@app.on_event('startup')
async def seed_db():
    count = await db.spareparts.count_documents({})
    if count == 0:
        docs = [
            {'id': str(uuid.uuid4()), 'name': name, 'currentStock': 0}
            for name in SEED_PARTS
        ]
        await db.spareparts.insert_many(docs)
        logging.info(f'Seeded {len(docs)} spare parts')


# ---------- Mount ----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()

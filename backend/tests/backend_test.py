"""Backend tests for RefillOps API. Covers auth, parties, spare parts, jobs, dispatch, dashboard."""
import os
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')
API = f"{BASE_URL}/api"

USERNAME = "suresafe"
PASSWORD = "suresafe123"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"username": USERNAME, "password": PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["username"] == USERNAME
    return data["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth ----------
class TestAuth:
    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"username": USERNAME, "password": "wrong"}, timeout=20)
        assert r.status_code == 401

    def test_login_wrong_user(self):
        r = requests.post(f"{API}/auth/login", json={"username": "nope", "password": PASSWORD}, timeout=20)
        assert r.status_code == 401

    def test_protected_requires_token(self):
        r = requests.get(f"{API}/parties", timeout=20)
        assert r.status_code == 401

    def test_me(self, auth):
        r = requests.get(f"{API}/auth/me", headers=auth, timeout=20)
        assert r.status_code == 200
        assert r.json()["username"] == USERNAME


# ---------- Spare Parts ----------
class TestSpareParts:
    def test_list_seeded_parts(self, auth):
        r = requests.get(f"{API}/spareparts", headers=auth, timeout=20)
        assert r.status_code == 200
        parts = r.json()
        names = {p["name"] for p in parts}
        expected = {"ABC Valve", "Spindle", "ABC Pipe", "CO2 Discharge Set", "CO2 Pipe", "CO2 Horn"}
        assert expected.issubset(names), f"Missing seeded parts. Got: {names}"

    def test_add_stock_and_log(self, auth):
        r = requests.get(f"{API}/spareparts", headers=auth, timeout=20)
        parts = r.json()
        part = next(p for p in parts if p["name"] == "ABC Valve")
        before = int(part["currentStock"])
        add = requests.post(
            f"{API}/spareparts/{part['id']}/addstock",
            headers=auth,
            json={"quantity": 10, "note": "TEST_add"},
            timeout=20,
        )
        assert add.status_code == 200
        assert add.json()["currentStock"] == before + 10

        log = requests.get(f"{API}/spareparts/stocklog", headers=auth, timeout=20)
        assert log.status_code == 200
        entries = log.json()
        assert len(entries) >= 1
        # Verify sort desc and find our entry
        latest = entries[0]
        assert latest["type"] in ("in", "out")
        found = [e for e in entries if e.get("note") == "TEST_add" and e["partId"] == part["id"]]
        assert found, "Stock log entry for add not found"
        assert found[0]["type"] == "in"
        assert found[0]["quantity"] == 10

    def test_add_stock_invalid_qty(self, auth):
        r = requests.get(f"{API}/spareparts", headers=auth, timeout=20)
        part = r.json()[0]
        bad = requests.post(
            f"{API}/spareparts/{part['id']}/addstock",
            headers=auth,
            json={"quantity": 0},
            timeout=20,
        )
        assert bad.status_code == 400


# ---------- Parties ----------
class TestParties:
    def test_party_crud(self, auth):
        # Create
        r = requests.post(f"{API}/parties", headers=auth, json={"name": "TEST_Party", "phone": "1234567890"}, timeout=20)
        assert r.status_code == 200
        party = r.json()
        pid = party["id"]
        assert party["name"] == "TEST_Party"
        assert party["phone"] == "1234567890"

        # List
        lst = requests.get(f"{API}/parties", headers=auth, timeout=20).json()
        assert any(p["id"] == pid for p in lst)

        # Update
        upd = requests.put(f"{API}/parties/{pid}", headers=auth, json={"name": "TEST_Party_Edit", "phone": "9999"}, timeout=20)
        assert upd.status_code == 200
        assert upd.json()["name"] == "TEST_Party_Edit"

        # Delete
        d = requests.delete(f"{API}/parties/{pid}", headers=auth, timeout=20)
        assert d.status_code == 200

        # Verify removal: PUT to deleted -> 404
        verify = requests.put(f"{API}/parties/{pid}", headers=auth, json={"name": "x"}, timeout=20)
        assert verify.status_code == 404


# ---------- Jobs flow + dispatch + dashboard ----------
class TestJobsAndDispatch:
    def test_full_job_lifecycle(self, auth):
        # Get a part
        parts = requests.get(f"{API}/spareparts", headers=auth, timeout=20).json()
        spindle = next(p for p in parts if p["name"] == "Spindle")
        # Pre-stock 5 spindles
        requests.post(f"{API}/spareparts/{spindle['id']}/addstock", headers=auth, json={"quantity": 5}, timeout=20)
        before_parts = requests.get(f"{API}/spareparts", headers=auth, timeout=20).json()
        before_stock = next(p for p in before_parts if p["id"] == spindle["id"])["currentStock"]

        # Create job
        body = {
            "partyName": "TEST_JobParty",
            "extinguishers": [
                {"type": "CO2", "size": "4.5", "unit": "kg", "quantity": 3},
                {"type": "ABC", "size": "6", "unit": "kg", "quantity": 2},
            ],
            "spareParts": [
                {"partId": spindle["id"], "partName": spindle["name"], "quantityUsed": 2}
            ],
            "deliveryCharge": 250.0,
        }
        r = requests.post(f"{API}/jobs", headers=auth, json=body, timeout=20)
        assert r.status_code == 200, r.text
        job = r.json()
        jid = job["id"]
        assert job["status"] == "active"
        assert job["deliveryCharge"] == 250.0
        assert len(job["extinguishers"]) == 2

        # Get by id
        g = requests.get(f"{API}/jobs/{jid}", headers=auth, timeout=20)
        assert g.status_code == 200

        # Filter active
        act = requests.get(f"{API}/jobs?status=active", headers=auth, timeout=20).json()
        assert any(j["id"] == jid for j in act)

        # Update job
        body["deliveryCharge"] = 300.0
        u = requests.put(f"{API}/jobs/{jid}", headers=auth, json=body, timeout=20)
        assert u.status_code == 200
        assert u.json()["deliveryCharge"] == 300.0

        # Dashboard stats
        stats = requests.get(f"{API}/dashboard/stats", headers=auth, timeout=20).json()
        for key in ("activeJobs", "extinguishersInShop", "lowStockParts", "monthlyDeliveryCost"):
            assert key in stats
        assert stats["activeJobs"] >= 1
        assert stats["extinguishersInShop"] >= 5  # 3+2

        # Dispatch
        d = requests.post(f"{API}/jobs/{jid}/dispatch", headers=auth, timeout=20)
        assert d.status_code == 200, d.text
        dj = d.json()
        assert dj["status"] == "dispatched"
        assert dj["dispatchedAt"] is not None

        # Verify stock deducted
        after_parts = requests.get(f"{API}/spareparts", headers=auth, timeout=20).json()
        after_stock = next(p for p in after_parts if p["id"] == spindle["id"])["currentStock"]
        assert after_stock == before_stock - 2, f"Expected {before_stock-2}, got {after_stock}"

        # Verify stock log has 'out' entry for this job
        logs = requests.get(f"{API}/spareparts/stocklog", headers=auth, timeout=20).json()
        out_entries = [e for e in logs if e.get("jobId") == jid and e["type"] == "out"]
        assert out_entries, "No 'out' stock log entry for dispatched job"
        assert out_entries[0]["quantity"] == 2

        # Cannot edit dispatched job
        bad_upd = requests.put(f"{API}/jobs/{jid}", headers=auth, json=body, timeout=20)
        assert bad_upd.status_code == 400

        # Cannot dispatch twice
        bad_disp = requests.post(f"{API}/jobs/{jid}/dispatch", headers=auth, timeout=20)
        assert bad_disp.status_code == 400

        # Filter dispatched
        disp_list = requests.get(f"{API}/jobs?status=dispatched", headers=auth, timeout=20).json()
        assert any(j["id"] == jid for j in disp_list)

        # Monthly delivery cost includes this dispatched job (same calendar month)
        stats2 = requests.get(f"{API}/dashboard/stats", headers=auth, timeout=20).json()
        assert stats2["monthlyDeliveryCost"] >= 300.0

    def test_create_job_validation(self, auth):
        # No extinguishers
        r = requests.post(f"{API}/jobs", headers=auth, json={"partyName": "X", "extinguishers": []}, timeout=20)
        assert r.status_code == 400
        # Empty party name
        r2 = requests.post(f"{API}/jobs", headers=auth, json={
            "partyName": "  ",
            "extinguishers": [{"type": "CO2", "size": "2", "unit": "kg", "quantity": 1}],
        }, timeout=20)
        assert r2.status_code == 400

    def test_get_nonexistent_job(self, auth):
        r = requests.get(f"{API}/jobs/non-existent-id", headers=auth, timeout=20)
        assert r.status_code == 404

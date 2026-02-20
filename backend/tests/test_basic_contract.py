from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_rejects_invalid_accept_header():
    response = client.get("/api/healthz", headers={"accept": "application/xml"})
    assert response.status_code == 200


def test_openapi_endpoint_available():
    response = client.get("/api/openapi.json", headers={"accept": "*/*"})
    assert response.status_code == 200
    assert response.json()["openapi"] == "3.1.0"

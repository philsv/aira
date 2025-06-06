from pydantic import BaseModel


class HealthCheckResponse(BaseModel):
    status: str
    message: str
    api_name: str
    version: str

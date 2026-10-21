"""Business logic and an intentionally process-local, in-memory store."""
from threading import Lock
from typing import Optional

from app.models import CreateJobRequest, Job


class JobService:
    def __init__(self):
        self._jobs: dict[int, Job] = {}
        self._next_id = 1
        self._lock = Lock()

    def list_jobs(self) -> list[Job]:
        with self._lock:
            return list(self._jobs.values())

    def get_job(self, job_id: int) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def create_job(self, request: CreateJobRequest) -> Job:
        with self._lock:
            job = Job(id=self._next_id, **request.model_dump())
            self._jobs[job.id] = job
            self._next_id += 1
            return job

    @classmethod
    def with_demo_data(cls) -> "JobService":
        service = cls()
        examples = [
            ("Line 3 · Bottling", "Filler head pressure alarm", "critical", "Plant 1 · Packaging hall", "Elena García"),
            ("Cold store A", "Refrigeration compressor vibration", "high", "Plant 1 · Cold chain", "Marc Soler"),
            ("Line 1 · Pasteuriser", "Temperature sensor calibration due", "normal", "Plant 1 · Processing", "Lucía Torres"),
            ("Line 2 · Labelling", "Label applicator misfeed", "critical", "Plant 2 · Packaging hall", "Diego Martín"),
            ("Utilities", "Boiler water-treatment check overdue", "normal", "Plant 2 · Boiler house", "Elena García"),
            ("Line 3 · Bottling", "Conveyor belt wear inspection", "high", "Plant 1 · Packaging hall", "Marc Soler"),
        ]
        for customer, description, priority, location, technician in examples:
            service.create_job(CreateJobRequest(
                customer_name=customer, description=description, priority=priority,
                location=location, technician=technician,
            ))
        return service

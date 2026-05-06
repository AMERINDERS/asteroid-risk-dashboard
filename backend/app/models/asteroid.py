from sqlalchemy import String, Boolean, Float, DateTime
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.sql import func
from typing import Optional
from app.db import Base


class Asteroid(Base):
    __tablename__ = 'asteroids'

    # Primary key from NASA
    neo_reference_id: Mapped[str] = mapped_column(String(20), primary_key=True)

    # Identification
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Hazard flags from NASA
    is_potentially_hazardous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_sentry_object: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Physical properties
    abs_magnitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    est_diameter_min_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    est_diameter_max_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Sentry impact data (only populated for Sentry objects)
    sentry_impact_probability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Audit timestamps
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # One asteroid has many close approaches over time
    close_approaches: Mapped[list] = relationship('CloseApproach', back_populates='asteroid')

    def __repr__(self) -> str:
        return f"<Asteroid {self.neo_reference_id} '{self.name}'>"

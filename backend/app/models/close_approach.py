from sqlalchemy import String, Float, Date, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.sql import func
from app.db import Base


class CloseApproach(Base):
    __tablename__ = 'close_approaches'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Foreign key to the asteroids table
    neo_reference_id: Mapped[str] = mapped_column(
        String(20),
        ForeignKey('asteroids.neo_reference_id'),
        nullable=False,
        index=True,
    )

    # When the approach happens
    approach_date: Mapped[Date] = mapped_column(Date, nullable=False, index=True)

    # Miss distance — how close it gets to Earth
    miss_distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    miss_distance_lunar: Mapped[float] = mapped_column(Float, nullable=False)

    # Speed relative to Earth
    velocity_kms: Mapped[float] = mapped_column(Float, nullable=False)

    # Computed risk score (0-100 algorithm)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False, index=True)

    # Audit
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Many close approaches belong to one asteroid
    asteroid: Mapped['Asteroid'] = relationship('Asteroid', back_populates='close_approaches')

    __table_args__ = (
        UniqueConstraint('neo_reference_id', 'approach_date', name='uq_approach_asteroid_date'),
    )

    def __repr__(self) -> str:
        return f"<Approach {self.neo_reference_id} on {self.approach_date}>"

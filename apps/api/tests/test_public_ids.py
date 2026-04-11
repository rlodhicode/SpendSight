from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.services import next_public_id


def test_public_id_sequence_prefixes_and_increment():
    engine = create_engine("sqlite:///:memory:")
    TestingSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    try:
        first_electric = next_public_id(session, "electric")
        second_electric = next_public_id(session, "electricity")
        first_water = next_public_id(session, "water")
        first_unknown = next_public_id(session, "other")
        session.commit()
    finally:
        session.close()

    assert first_electric == "E00001"
    assert second_electric == "E00002"
    assert first_water == "W00001"
    assert first_unknown == "U00001"

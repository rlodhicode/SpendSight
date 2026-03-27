from pathlib import Path

from worker.extractor import mock_extract


def test_mock_extract(tmp_path: Path):
    file_path = tmp_path / "bill.pdf"
    file_path.write_bytes(b"sample bill content")
    result = mock_extract(str(file_path), "electricity")
    assert result.provider_name
    assert result.total_amount_due > 0
    assert result.usage_kwh is not None


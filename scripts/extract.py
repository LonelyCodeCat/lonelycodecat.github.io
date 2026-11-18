"""Generate the portfolio snapshot from Apple's SEC Company Facts JSON."""
import csv
import json
import sys
from datetime import date
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "docs"
facts = json.loads(Path(sys.argv[1]).read_text())
assert int(facts["cik"]) == 320193
rows = {}
metrics = {
    "revenue": "RevenueFromContractWithCustomerExcludingAssessedTax",
    "operating_income": "OperatingIncomeLoss",
}
for name, tag in metrics.items():
    for fact in facts["facts"]["us-gaap"][tag]["units"]["USD"]:
        if fact["form"] != "10-K" or fact["fp"] != "FY":
            continue
        end = date.fromisoformat(fact["end"])
        if not (2019 <= end.year <= 2026 and fact["fy"] == end.year):
            continue
        days = (end - date.fromisoformat(fact["start"])).days + 1
        if days not in (364, 371):
            continue
        row = rows.setdefault(end.year, {"year": end.year, "end": fact["end"], "accession": fact["accn"]})
        assert row["end"] == fact["end"] and row["accession"] == fact["accn"]
        assert name not in row or row[name] == fact["val"]
        row[name] = fact["val"]
assert sorted(rows) == list(range(2019, 2027))
records = [rows[year] for year in sorted(rows)]
with (root / "apple-annual.csv").open("w", newline="") as out:
    writer = csv.DictWriter(out, fieldnames=["year", "end", "revenue", "operating_income", "accession"], lineterminator="\n")
    writer.writeheader()
    for record in records:
        assert all(record[key] > 0 for key in metrics)
        writer.writerow(record)
(root / "facts.js").write_text("const appleFacts = " + json.dumps(records, indent=2) + ";\n")

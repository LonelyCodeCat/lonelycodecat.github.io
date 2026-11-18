"""Build the ES-only weekly snapshot. Optional argument: saved CFTC response."""
import json
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

where = ("cftc_contract_market_code='13874A' AND report_date_as_yyyy_mm_dd "
         "between '2025-11-01T00:00:00' and '2026-11-11T00:00:00'")
query = urlencode({"$where": where, "$order": "report_date_as_yyyy_mm_dd ASC"})
url = "https://publicreporting.cftc.gov/resource/gpe5-46if.json?" + query
if len(sys.argv) > 1:
    records = json.loads(Path(sys.argv[1]).read_text())
else:
    with urlopen(url, timeout=45) as response:
        records = json.load(response)

groups = ["dealer", "asset_mgr", "lev_money", "other_rept", "nonrept"]
weeks = []
for record in records:
    day = record["report_date_as_yyyy_mm_dd"][:10]
    assert record["cftc_contract_market_code"] == "13874A"
    assert date(2025, 11, 1) <= date.fromisoformat(day) <= date(2026, 11, 10)
    assert not weeks or weeks[-1][0] < day
    interest = int(record["open_interest_all"])
    net = []
    for group in groups:
        suffix = "_all" if group in ("dealer", "nonrept") else ""
        long = int(record[group + "_positions_long" + suffix])
        short = int(record[group + "_positions_short" + suffix])
        net.append(long - short)
    assert sum(net) == 0 and interest > 0
    weeks.append([day, interest, *net])
assert weeks and weeks[0][0] == "2025-11-04" and weeks[-1][0] == "2026-11-10"
lines = [json.dumps(row) for row in weeks]
target = Path(__file__).resolve().parents[1] / "docs" / "positioning-data.js"
target.write_text("// CFTC TFF futures only, 13874A. Columns: date, OI, " +
                  ", ".join(groups) + " (net).\nconst esWeeks = [\n  " +
                  ",\n  ".join(lines) + "\n];\n")

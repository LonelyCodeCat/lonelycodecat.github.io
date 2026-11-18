# Inside the E-mini

Jun Li’s data portfolio explores how E-mini S&P 500 futures (ES) trade around the clock and how positions vary across trader groups. [Explore the interactive charts](https://lonelycodecat.github.io/).

## Data

Each file below opens as a table on GitHub. The unit for positions and open interest is futures contracts.

| Dataset | What one row represents | Coverage |
| --- | --- | --- |
| [Weekly open interest and net positions](docs/data/es-cftc-weekly.csv) | One report date, with total open interest and five trader groups’ net positions | 54 reports, 4 Nov 2025 through 10 Nov 2026 |
| [Trader long and short positions](docs/data/es-cftc-trader-positions.csv) | One group on one report date, with long, short and net contracts | 270 observations across the same 54 reports |
| [Hourly return profile](docs/data/es-hourly-profile.csv) | One New York clock-hour interval, with its sample mean return and standard deviation in basis points | 24 hourly summaries from Jan 1998 through Dec 2020 |

### Weekly positioning

Both weekly files come from the CFTC Traders in Financial Futures, futures-only report for market code `13874A` (CME E-mini S&P 500). The dates identify positions as of the report date. For example, on 10 November 2026 the dealer group held 175,005 long and 910,294 short contracts, giving a net position of −735,289. The five groups’ net positions sum to zero. Separately reported spreading positions cancel in that calculation and are omitted from the long and short file. [CFTC source table](https://publicreporting.cftc.gov/Commitments-of-Traders/TFF-Futures-Only/gpe5-46if)

Running `python3 scripts/build-positioning.py` fetches the fixed sample window and rebuilds both weekly CSVs and the site's positioning data. [Extraction script](scripts/build-positioning.py)

### Hourly returns

The hourly file transcribes the mean and standard deviation from panels (a) and (b) of Table A.1 in *The Overnight Drift*, by Nina Boyarchenko, Lars C. Larsen and Paul Whelan. Returns use volume-weighted trade prices. Hours run from 18:00 ET around to 18:00 ET the next day. One basis point equals 0.01%. For 02:00–03:00 ET the historical mean is +1.51 bp and the standard deviation is 17.21 bp. [Staff Report 917, Appendix A](https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr917.pdf)

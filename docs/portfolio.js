const hourMs = 3_600_000;
// Sunday 17:00 in Chicago, using the UTC offset of each reference week.
const weekOpens = {
  november: "2026-11-15T23:00:00Z",
  july: "2026-07-12T22:00:00Z",
};
const zone = document.querySelector("#zone");
const season = document.querySelector("#season");
const canvas = document.querySelector("#clock");
const download = document.querySelector("#download");
let pauseHour = 16;
let csvUrl;

function drawClock() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  const cx = width / 2;
  const cy = height / 2;
  const radius = height * 0.365;
  const angle = hour => hour * Math.PI / 12 - Math.PI / 2;
  function arc(r, begin, end, thickness, color) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, angle(begin), angle(end));
    ctx.lineWidth = thickness;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  arc(radius * .78, 0, 24, 1, "#425867");
  arc(radius * 1.14, 0, 24, 1, "#425867");
  for (let hour = 0; hour < 24; hour++) {
    const maintenance = hour === pauseHour;
    arc(radius, hour + .055, hour + .945, radius * .19, maintenance ? "#ffc26d" : "#85a9ff");
    if (maintenance) arc(radius * .84, hour + .05, hour + .95, 2, "#ffc26d");
    for (let tick = 0; tick < 4; tick++) {
      const a = angle(hour + tick / 4);
      const start = tick ? 1.10 : 1.07;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * radius * start, cy + Math.sin(a) * radius * start);
      ctx.lineTo(cx + Math.cos(a) * radius * 1.14, cy + Math.sin(a) * radius * 1.14);
      ctx.strokeStyle = "#8196a8";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.fillStyle = "#d6e1ea";
  ctx.font = "13px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const hour of [0, 3, 6, 9, 12, 15, 18, 21]) {
    const a = angle(hour);
    ctx.fillText(String(hour).padStart(2, "0"), cx + Math.cos(a) * radius * 1.26, cy + Math.sin(a) * radius * 1.26);
  }
}

function render() {
  const timeZone = zone.value;
  const city = zone.selectedOptions[0].text;
  const firstOpen = Date.parse(weekOpens[season.value]);
  const times = new Intl.DateTimeFormat("en-GB", {timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
  const dates = new Intl.DateTimeFormat("en-GB", {timeZone, weekday: "short", day: "numeric", month: "short"});
  const tradeDate = new Intl.DateTimeFormat("en-GB", {timeZone: "America/Chicago", weekday: "short", day: "numeric", month: "short"});
  const body = document.querySelector("#sessions");
  body.replaceChildren();
  const csv = [["trade_date_chicago", "display_zone", "open_local", "close_local", "open_utc", "close_utc"]];
  const localDate = new Intl.DateTimeFormat("sv-SE", {timeZone, year:"numeric", month:"2-digit", day:"2-digit"});
  const chicagoDate = new Intl.DateTimeFormat("sv-SE", {timeZone:"America/Chicago", year:"numeric", month:"2-digit", day:"2-digit"});
  for (let day = 0; day < 5; day++) {
    const start = new Date(firstOpen + day * 24 * hourMs);
    const end = new Date(start.getTime() + 23 * hourMs);
    const row = body.insertRow();
    for (const value of [tradeDate.format(end), dates.format(start) + " · " + times.format(start), dates.format(end) + " · " + times.format(end)]) {
      row.insertCell().textContent = value;
    }
    csv.push([chicagoDate.format(end), timeZone, localDate.format(start) + " " + times.format(start), localDate.format(end) + " " + times.format(end), start.toISOString(), end.toISOString()]);
  }
  const close = firstOpen + 23 * hourMs;
  drawWeek(timeZone, firstOpen);
  pauseHour = Number(times.format(close).slice(0, 2));
  document.querySelector("#pause").textContent = city + " maintenance · " + times.format(close) + "–" + times.format(close + hourMs);
  document.querySelector("#table-caption").textContent = season.selectedOptions[0].text + " · " + city + " time";
  if (csvUrl) URL.revokeObjectURL(csvUrl);
  csvUrl = URL.createObjectURL(new Blob([csv.map(row => row.join(",")).join("\r\n") + "\r\n"], {type:"text/csv;charset=utf-8"}));
  download.href = csvUrl;
  download.download = "es-sessions-" + season.value + "-" + city.toLowerCase() + ".csv";
  drawClock();
}

function drawWeek(timeZone, firstOpen) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells = days.map(() => Array(24).fill(false));
  const fmt = new Intl.DateTimeFormat("en-GB", {timeZone, weekday:"short", hour:"2-digit", hourCycle:"h23"});
  for (let session = 0; session < 5; session++) {
    for (let hour = 0; hour < 23; hour++) {
      const instant = firstOpen + (session * 24 + hour) * hourMs;
      const parts = Object.fromEntries(fmt.formatToParts(instant).map(p => [p.type, p.value]));
      cells[days.indexOf(parts.weekday)][Number(parts.hour)] = true;
    }
  }
  const map = document.querySelector("#heatmap");
  map.replaceChildren();
  const axis = document.createElement("div");
  axis.className = "heat-axis";
  for (const label of ["00", "06", "12", "18"]) {
    const tick = document.createElement("span");
    tick.textContent = label;
    axis.append(tick);
  }
  map.append(axis);
  cells.forEach((hours, day) => {
    const row = document.createElement("div");
    row.className = "heat-row";
    const label = document.createElement("span");
    label.textContent = days[day];
    row.append(label);
    hours.forEach((open, hour) => {
      const tile = document.createElement("i");
      if (open) tile.className = "open";
      tile.title = days[day] + " " + String(hour).padStart(2, "0") + ":00 · " + (open ? "Scheduled open" : "Closed");
      row.append(tile);
    });
    map.append(row);
  });
}
zone.addEventListener("change", render);
season.addEventListener("change", render);
new ResizeObserver(drawClock).observe(canvas);
render();

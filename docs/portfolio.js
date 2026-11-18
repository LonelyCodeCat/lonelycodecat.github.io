const canvas = document.querySelector("#surface");

function drawSurface() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  const amplitude = (x, y) =>
    Math.exp(-((x - 0.2) ** 2 * 6 + (y + 0.18) ** 2 * 8)) +
    0.55 * Math.exp(-((x + 0.52) ** 2 * 12 + (y - 0.24) ** 2 * 12));
  function project(x, y) {
    const z = amplitude(x, y);
    return [width * (0.5 + 0.244 * (x - y)), height * (0.65 + 0.147 * (x + y) - 0.50 * z), z];
  }
  // Draw back to front so each opaque surface tile hides the mesh behind it.
  const count = 44;
  const step = 2 / count;
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      const x = -1 + i * step;
      const y = -1 + j * step;
      const tile = [project(x, y), project(x + step, y), project(x + step, y + step), project(x, y + step)];
      const level = Math.min(1, tile[0][2]);
      ctx.beginPath();
      tile.forEach(([px, py], k) => k ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
      ctx.closePath();
      ctx.fillStyle = 'hsl(' + (166 - 86 * level) + ' 36% ' + (11 + 26 * level) + '%)';
      ctx.fill();
      ctx.strokeStyle = 'hsla(' + (152 - 76 * level) + ', 74%, ' + (48 + 32 * level) + '%, ' + (0.48 + level * 0.50) + ')';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }
}
new ResizeObserver(drawSurface).observe(canvas);

const names = {revenue: "Revenue", operating_income: "Operating income"};
let metric = "revenue";
const years = document.querySelector("#year");
const bars = document.querySelector("#bars");
for (const fact of appleFacts) {
  years.add(new Option(fact.year, fact.year));
  const button = document.createElement("button");
  button.className = "bar";
  button.type = "button";
  button.append(document.createElement("i"), document.createElement("span"));
  button.lastChild.textContent = fact.year;
  button.addEventListener("click", () => { years.value = fact.year; update(); });
  bars.append(button);
}
years.selectedIndex = appleFacts.length - 1;
years.addEventListener("change", update);
for (const button of document.querySelectorAll("[data-metric]")) {
  button.addEventListener("click", () => { metric = button.dataset.metric; update(); });
}
function billions(value) { return "$" + (value / 1e9).toFixed(1) + "B"; }
function update() {
  const index = years.selectedIndex;
  const row = appleFacts[index];
  const maximum = Math.max(...appleFacts.map(fact => fact[metric]));
  document.querySelector("#value").textContent = billions(row[metric]);
  document.querySelector("#metric-name").textContent = names[metric];
  const delta = document.querySelector("#delta");
  if (index > 0) {
    const change = 100 * (row[metric] / appleFacts[index - 1][metric] - 1);
    delta.textContent = (change > 0 ? "+" : "") + change.toFixed(1) + "% year over year";
  } else {
    delta.textContent = "First year in this study";
  }
  const filing = document.querySelector("#filing");
  filing.href = "https://www.sec.gov/Archives/edgar/data/320193/" + row.accession.replaceAll("-", "") + "/" + row.accession + "-index.htm";
  filing.textContent = "FY" + row.year + " filing";
  for (const button of document.querySelectorAll("[data-metric]")) {
    button.setAttribute("aria-pressed", button.dataset.metric === metric);
  }
  appleFacts.forEach((fact, i) => {
    const button = bars.children[i];
    const label = fact.year + " " + names[metric] + " " + billions(fact[metric]);
    button.style.setProperty("--height", (100 * fact[metric] / maximum) + "%");
    button.title = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", i === index);
  });
}
update();

// New York Fed Staff Report 917, Table A.1 (a, b). Ordered 18:00–18:00 ET.
const hourly = {
  mean: [.45,.16,-.04,-.06,-.20,-.06,.54,.50,1.51,.39,-.14,.14,.39,-.01,.28,-1.33,-.08,-.27,.48,-.11,-.13,.52,-2.65,-.61],
  spread: [13.40,14.59,16.92,16.22,15.65,12.59,13.74,13.67,17.21,22.32,20.63,17.89,18.69,19.40,28.51,34.05,41.83,32.95,28.48,30.40,35.83,49.42,24.97,14.84],
};
const groups = ["Dealers", "Asset managers", "Leveraged funds", "Other reportables", "Non-reportables"];
const format = new Intl.NumberFormat("en-US");
const signed = n => (n > 0 ? "+" : "") + format.format(n);
const hourPicker = document.querySelector("#hour");
const report = document.querySelector("#report");
const hourPlot = document.querySelector("#hour-chart");
const interestPlot = document.querySelector("#oi-chart");
let measure = "mean";
const padHour = n => String(n % 24).padStart(2,"0");
const hourLabel = i => padHour(18+i) + ":00–" + padHour(19+i) + ":00 ET";
const groupLimit = Math.max(...esWeeks.flatMap(row => row.slice(2).map(Math.abs)));
const interests = esWeeks.map(row => row[1]);
const reportTimes = esWeeks.map(row => Date.parse(row[0]));
const firstReport = reportTimes[0];
const timeSpan = reportTimes.at(-1) - firstReport;
const oiStep = 200000;
const oiLow = Math.floor(Math.min(...interests) / oiStep) * oiStep;
const oiHigh = Math.ceil(Math.max(...interests) / oiStep) * oiStep;

function frame(canvas) {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.font = "12px ui-monospace, monospace";
  return {ctx, width, height, left:43, right:width-12, top:12, bottom:height-27};
}
function horizontalAxis(f, ticks, y, formatTick, dark) {
  const {ctx,left,right} = f;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const tick of ticks) {
    const py = y(tick);
    ctx.strokeStyle = tick === 0 && dark ? "#a1b3cd" : dark ? "#354861" : "#d4dce1";
    ctx.beginPath(); ctx.moveTo(left,py); ctx.lineTo(right,py); ctx.stroke();
    ctx.fillStyle = dark ? "#bdc9de" : "#455768";
    ctx.fillText(formatTick(tick),left-7,py);
  }
}
function hourRender() {
  const i = Number(hourPicker.value);
  const mean = measure === "mean";
  const val = hourly[measure][i];
  document.querySelector("#hour-value").textContent = (mean && val > 0 ? "+" : "") + val.toFixed(2);
  document.querySelector("#hour-slot").textContent = hourLabel(i);
  hourPicker.setAttribute("aria-valuetext", hourLabel(i) + ", " + val.toFixed(2) + " basis points");
  const f = frame(hourPlot);
  const {ctx,left,right,top,bottom} = f;
  const lo = mean ? -3 : 0, hi = mean ? 2 : 50;
  const y = value => bottom - (value-lo)/(hi-lo)*(bottom-top);
  const step = (right-left)/24;
  ctx.fillStyle = "#2a3e54";
  ctx.fillRect(left+i*step,top,step,bottom-top);
  horizontalAxis(f,mean ? [-3,-2,-1,0,1,2] : [0,10,20,30,40,50],y,String,true);
  hourly[measure].forEach((n,j) => {
    ctx.fillStyle = j === i ? "#f9f4da" : n < 0 ? "#ffab83" : "#69dbd0";
    ctx.fillRect(left+(j+.13)*step,Math.min(y(n),y(0)),step*.74,Math.max(1,Math.abs(y(n)-y(0))));
  });
  ctx.fillStyle = "#c7d3df";
  ctx.textAlign = "center";
  for (let j=0;j<24;j+=4) ctx.fillText(padHour(j+18),left+(j+.5)*step,bottom+16);
}
function interestRender() {
  const i = report.selectedIndex;
  const row = esWeeks[i];
  document.querySelector("#interest").textContent = format.format(row[1]);
  document.querySelector("#oi-change").textContent = i ? signed(row[1]-esWeeks[i-1][1])+" vs prior report" : "First report in sample";
  const f = frame(interestPlot);
  const {ctx,left,right,top,bottom} = f;
  const x = j => left+(reportTimes[j]-firstReport)/timeSpan*(right-left);
  const y = n => bottom-(n-oiLow)/(oiHigh-oiLow)*(bottom-top);
  const ticks = [];
  for (let t=oiLow;t<=oiHigh;t+=oiStep) ticks.push(t);
  horizontalAxis(f,ticks,y,n=>(n/1e6).toFixed(1)+"m",false);
  ctx.beginPath();
  interests.forEach((n,j)=>j ? ctx.lineTo(x(j),y(n)) : ctx.moveTo(x(j),y(n)));
  ctx.strokeStyle = "#197e79"; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.lineTo(right,bottom); ctx.lineTo(left,bottom); ctx.closePath();
  ctx.fillStyle = "rgba(22,139,129,.12)"; ctx.fill();
  ctx.lineWidth=1; ctx.strokeStyle="#62768a"; ctx.setLineDash([3,3]);
  ctx.beginPath();ctx.moveTo(x(i),top);ctx.lineTo(x(i),bottom);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(x(i),y(row[1]),4.5,0,Math.PI*2);ctx.fillStyle="#173c52";ctx.fill();
  ctx.fillStyle="#445868";ctx.textAlign="left";ctx.fillText("Nov ’25",left,bottom+17);
  ctx.textAlign="right";ctx.fillText("Nov ’26",right,bottom+17);
  const panel = document.querySelector("#groups");
  panel.replaceChildren();
  groups.forEach((name,j) => {
    const value = row[j+2];
    const item = document.createElement("div");
    item.className = "net-row";
    const label = document.createElement("span"), bar = document.createElement("span"), amount = document.createElement("strong");
    label.textContent = name; amount.textContent = signed(value);
    bar.className = "net-track";
    const fill = document.createElement("i");
    fill.className = value < 0 ? "short" : "long";
    fill.style.width = Math.abs(value)/groupLimit*50+"%";
    bar.append(fill);item.append(label,bar,amount);panel.append(item);
  });
}
function plotFraction(canvas,event) {
  const rect = canvas.getBoundingClientRect();
  const t = (event.clientX-rect.left-43)/(rect.width-55);
  return Math.max(0,Math.min(1,t));
}
for (const key of Object.keys(hourly)) {
  document.getElementById(key).addEventListener("click",() => {
    measure = key;
    for (const id of Object.keys(hourly)) document.getElementById(id).setAttribute("aria-pressed",id===key);
    hourRender();
  });
}
hourPicker.addEventListener("input",hourRender);
function inspectHour(event) {hourPicker.value=Math.min(23,Math.floor(plotFraction(hourPlot,event)*24));hourRender();}
hourPlot.addEventListener("pointerdown",inspectHour);
hourPlot.addEventListener("pointermove",event=>{if(event.pointerType==="mouse") inspectHour(event);});
for(const row of esWeeks) report.add(new Option(row[0],row[0]));
report.selectedIndex=esWeeks.length-1;
interestPlot.addEventListener("pointerdown",event=>{
  const target = firstReport + plotFraction(interestPlot,event)*timeSpan;
  report.selectedIndex = reportTimes.reduce((best,time,j) =>
    Math.abs(time-target)<Math.abs(reportTimes[best]-target) ? j : best, 0);
  interestRender();
});
report.addEventListener("change",interestRender);
const csv = [["report_date","open_interest","dealer_net","asset_manager_net","leveraged_money_net","other_reportable_net","nonreportable_net"],...esWeeks].map(row=>row.join(",")).join("\r\n");
document.querySelector("#position-csv").href=URL.createObjectURL(new Blob([csv+"\r\n"],{type:"text/csv;charset=utf-8"}));
new ResizeObserver(hourRender).observe(hourPlot);
new ResizeObserver(interestRender).observe(interestPlot);
hourRender();
interestRender();

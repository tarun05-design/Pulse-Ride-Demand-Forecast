// Renders a true 12-number analog clock face (like a real clock) as the hour
// picker, paired with an AM/PM toggle. The reference "typical day" demand curve
// reshapes depending on AM/PM, since each clock position (e.g. 3 o'clock)
// represents two different real hours (3 AM and 3 PM) with different demand.

const TYPICAL_CURVE = [
  0.12, 0.07, 0.04, 0.03, 0.04, 0.10, 0.28, 0.55,
  0.85, 0.55, 0.40, 0.42, 0.48, 0.45, 0.42, 0.48,
  0.65, 0.95, 0.80, 0.55, 0.40, 0.30, 0.22, 0.16
];

const CX = 120, CY = 120;
const BASE_R = 52, RING_DEPTH = 34, TICK_R = 96, LABEL_R = 108;

function angleForPos(pos) {
  // pos: 0 = 12 o'clock (top), 1..11 = clockwise around the face
  return (pos / 12) * Math.PI * 2 - Math.PI / 2;
}

function pointAt(angle, r) {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

// hour24: the real 0-23 hour this clock-position + AM/PM combination represents
function hour24From(pos, ampm) {
  if (pos === 0) return ampm === "AM" ? 0 : 12;
  return ampm === "AM" ? pos : pos + 12;
}

function posAndAmpmFromHour24(hour24) {
  const ampm = hour24 < 12 ? "AM" : "PM";
  const pos = hour24 % 12;
  return { pos, ampm };
}

function curveRadiusAt(posFloat, ampm) {
  const hourFloat = posFloat + (ampm === "PM" ? 12 : 0);
  const i0 = Math.floor(hourFloat) % 24;
  const i1 = (i0 + 1) % 24;
  const frac = hourFloat - Math.floor(hourFloat);
  const smooth = (1 - Math.cos(frac * Math.PI)) / 2;
  const v = TYPICAL_CURVE[i0] * (1 - smooth) + TYPICAL_CURVE[i1] * smooth;
  return BASE_R + v * RING_DEPTH;
}

function buildCurvePath(ampm) {
  const steps = 60;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const posFloat = (i / steps) * 12;
    const r = curveRadiusAt(posFloat, ampm);
    const [x, y] = pointAt(angleForPos(posFloat), r);
    d += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2) + " ";
  }
  return d + "Z";
}

function initDial(svgId, sliderId, readoutId, ampmGroupName) {
  const svg = document.getElementById(svgId);
  const slider = document.getElementById(sliderId);
  const readout = document.getElementById(readoutId);
  const hourField = document.getElementById("hourField");
  const ampmInputs = document.querySelectorAll('input[name="' + ampmGroupName + '"]');
  if (!svg || !slider) return;

  const ns = "http://www.w3.org/2000/svg";
  svg.setAttribute("viewBox", "0 0 240 240");

  function currentAmpm() {
    for (const input of ampmInputs) if (input.checked) return input.value;
    return "AM";
  }

  const curvePath = document.createElementNS(ns, "path");
  curvePath.setAttribute("fill", "rgba(76,216,230,0.06)");
  curvePath.setAttribute("stroke", "#4CD8E6");
  curvePath.setAttribute("stroke-width", "1.2");
  curvePath.setAttribute("stroke-opacity", "0.55");
  svg.appendChild(curvePath);

  // 12 tick marks + numeric labels (12, 1, 2, ... 11)
  for (let pos = 0; pos < 12; pos++) {
    const a = angleForPos(pos);
    const [x1, y1] = pointAt(a, TICK_R - 6);
    const [x2, y2] = pointAt(a, TICK_R);
    const tick = document.createElementNS(ns, "line");
    tick.setAttribute("x1", x1); tick.setAttribute("y1", y1);
    tick.setAttribute("x2", x2); tick.setAttribute("y2", y2);
    tick.setAttribute("stroke", "#5E6C85");
    tick.setAttribute("stroke-width", pos % 3 === 0 ? "2" : "1");
    tick.setAttribute("class", "tick-" + pos);
    svg.appendChild(tick);

    const [lx, ly] = pointAt(a, LABEL_R);
    const label = document.createElementNS(ns, "text");
    label.setAttribute("x", lx); label.setAttribute("y", ly + 4);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-family", "IBM Plex Mono, monospace");
    label.setAttribute("font-size", "11");
    label.setAttribute("fill", "#8C9AB3");
    label.setAttribute("class", "label-" + pos);
    label.textContent = pos === 0 ? "12" : String(pos);
    svg.appendChild(label);
  }

  const hand = document.createElementNS(ns, "line");
  hand.setAttribute("stroke", "#FFB020");
  hand.setAttribute("stroke-width", "1.5");
  hand.setAttribute("stroke-opacity", "0.5");
  svg.appendChild(hand);

  const glow = document.createElementNS(ns, "circle");
  glow.setAttribute("r", "9");
  glow.setAttribute("fill", "#FFB020");
  glow.setAttribute("opacity", "0.18");
  svg.appendChild(glow);

  const marker = document.createElementNS(ns, "circle");
  marker.setAttribute("r", "5");
  marker.setAttribute("fill", "#FFB020");
  svg.appendChild(marker);

  function redraw(pos, ampm) {
    curvePath.setAttribute("d", buildCurvePath(ampm));

    const a = angleForPos(pos);
    const r = curveRadiusAt(pos, ampm);
    const [hx, hy] = pointAt(a, r);
    hand.setAttribute("x1", CX); hand.setAttribute("y1", CY);
    hand.setAttribute("x2", hx); hand.setAttribute("y2", hy);
    glow.setAttribute("cx", hx); glow.setAttribute("cy", hy);
    marker.setAttribute("cx", hx); marker.setAttribute("cy", hy);

    for (let p = 0; p < 12; p++) {
      const t = svg.querySelector(".tick-" + p);
      const l = svg.querySelector(".label-" + p);
      const active = p === pos;
      if (t) t.setAttribute("stroke", active ? "#FFB020" : "#5E6C85");
      if (l) l.setAttribute("fill", active ? "#FFB020" : "#8C9AB3");
    }

    if (readout) {
      const hh = String(pos === 0 ? 12 : pos).padStart(2, "0");
      readout.innerHTML = hh + '<span>:00 ' + ampm + '</span>';
    }

    if (hourField) hourField.value = hour24From(pos, ampm);
  }

  function updateFromState() {
    const pos = parseInt(slider.value, 10);
    const ampm = currentAmpm();
    redraw(pos, ampm);
  }

  function setPosFromPointer(evt) {
    const rect = svg.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    const x = ((clientX - rect.left) / rect.width) * 240;
    const y = ((clientY - rect.top) / rect.height) * 240;
    let angle = Math.atan2(y - CY, x - CX) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    const pos = Math.round((angle / (Math.PI * 2)) * 12) % 12;
    slider.value = pos;
    redraw(pos, currentAmpm());
  }

  slider.addEventListener("input", updateFromState);
  for (const input of ampmInputs) {
    input.addEventListener("change", updateFromState);
  }

  let dragging = false;
  svg.addEventListener("pointerdown", (e) => { dragging = true; setPosFromPointer(e); });
  window.addEventListener("pointermove", (e) => { if (dragging) setPosFromPointer(e); });
  window.addEventListener("pointerup", () => { dragging = false; });

  updateFromState();
}

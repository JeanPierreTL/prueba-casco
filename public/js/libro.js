const PAGINAS = [
  { tit: "El casco",
    desc: "El casco protege la cabeza del ciclista y es la base donde se instalan el sensor y las luces direccionales.",
    det: ["Cúpula rígida con espacio para la electrónica.", "Sensor arriba y una luz a cada lado.", "Escanea Hiro para verlo en 3D."],
    preg: "¿Qué componentes añadirías a un casco común para que pueda señalizar giros?" },
  { tit: "El sensor de movimiento",
    desc: "Un sensor MPU6050 (acelerómetro y giroscopio) mide cuánto se inclina la cabeza hacia cada lado.",
    det: ["Es la placa verde sobre el casco.", "Se conecta al Arduino por I2C (pines A4 y A5).", "El acelerómetro mide la gravedad en 3 ejes."],
    preg: "¿Qué magnitud mide el acelerómetro y cómo permite saber la inclinación?" },
  { tit: "Luces direccionales",
    desc: "Dos luces naranjas, una a cada lado, parpadean para avisar hacia dónde gira el ciclista.",
    det: ["Solo se enciende la luz del lado inclinado.", "Casco recto: ambas luces apagadas.", "La simulación gira sola a ambos lados."],
    preg: "¿Qué luz debe encenderse si el ciclista se inclina a la derecha y por qué?" },
  { tit: "Inclinación y giro",
    desc: "El Arduino compara la inclinación con un umbral: pasados 15° a un lado, activa la luz de ese lado.",
    det: ["Se activa a ±15° y se apaga bajo 10° (histéresis).", "La histéresis evita que la luz titile.", "Mueve el control para probarlo."],
    preg: "¿Por qué se usa un umbral y una histéresis en vez de encender la luz con cualquier inclinación?",
    control: true },
  { tit: "El sistema completo",
    desc: "El sensor mide, el Arduino decide y las luces avisan. Este modelo simula el casco real.",
    det: ["El código filtra vibraciones y parpadea sin bloquear.", "Componentes: Arduino, MPU6050, 2 LED y batería.", "El modelo es didáctico y simplifica el casco real."],
    preg: "¿Qué información conserva la simulación del casco real y qué simplifica?" }
];

const $ = s => document.querySelector(s);
const sistema = $("#sistema"), marcador = $("#marcador"), guia = $("#guia");
const slider = $("#inclinacion"), etiqueta = $("#valorAngulo"), estado = $("#estado");
const prev = $("#prev"), next = $("#next"), boton = $("#pausa");
const cubierta = $("#cubierta"), ventana = $("#ventana");
let actual = 0, enPausa = false;

// Recorta un hueco en la cubierta sobre la ventana y coloca el marco guía.
function recortar() {
  const r = ventana.getBoundingClientRect();
  const W = cubierta.clientWidth, H = cubierta.clientHeight;
  const x = r.left, y = r.top, x2 = r.right, y2 = r.bottom;
  const poly = `polygon(evenodd, 0 0, ${W}px 0, ${W}px ${H}px, 0 ${H}px, 0 0, ` +
    `${x}px ${y}px, ${x2}px ${y}px, ${x2}px ${y2}px, ${x}px ${y2}px, ${x}px ${y}px)`;
  cubierta.style.clipPath = poly;
  cubierta.style.webkitClipPath = poly;
  guia.style.left = x + "px"; guia.style.top = y + "px";
  guia.style.width = r.width + "px"; guia.style.height = r.height + "px";
}
new ResizeObserver(recortar).observe(ventana);
window.addEventListener("resize", recortar);
window.addEventListener("orientationchange", () => setTimeout(recortar, 300));

function animar(...els) {
  els.forEach(e => { e.classList.remove("vuelta"); void e.offsetWidth; e.classList.add("vuelta"); });
}

function mostrar(animado) {
  const d = PAGINAS[actual], n = actual + 1;
  $("#numPag").textContent = `Página ${n} de ${PAGINAS.length}`;
  $("#tit").textContent = d.tit;
  $("#desc").textContent = d.desc;
  $("#numGrande").textContent = n;
  $("#preguntaIzq").textContent = d.preg;
  $("#preguntaMovil").textContent = "Pregunta: " + d.preg;
  $("#indicador").textContent = `${n} / ${PAGINAS.length}`;

  const ul = $("#detalles"); ul.innerHTML = "";
  d.det.forEach(t => { const li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });

  $("#controlInc").style.display = d.control ? "block" : "none";
  estado.style.display = n >= 3 ? "block" : "none";
  prev.disabled = actual === 0;
  next.disabled = actual === PAGINAS.length - 1;

  sistema.querySelectorAll("[data-paginas]").forEach(el => {
    el.setAttribute("visible", el.dataset.paginas.split(" ").includes(String(n)));
  });
  slider.value = 0; etiqueta.textContent = "0";
  sistema.setAttribute("casco-ciclista", { auto: n === 3 || n === 5, angulo: 0 });

  if (animado) animar($("#cabeza"), $("#pie"), $(".deco"));
  requestAnimationFrame(recortar);
}

function ir(delta) {
  const nuevo = actual + delta;
  if (nuevo < 0 || nuevo >= PAGINAS.length) return;
  actual = nuevo; mostrar(true);
}

prev.addEventListener("click", () => ir(-1));
next.addEventListener("click", () => ir(1));
document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") ir(1);
  if (e.key === "ArrowLeft") ir(-1);
});

// Deslizar el dedo para pasar página
let x0 = null;
$(".der").addEventListener("touchstart", e => {
  x0 = e.target.type === "range" ? null : e.touches[0].clientX;
}, { passive: true });
$(".der").addEventListener("touchend", e => {
  if (x0 === null) return;
  const dx = e.changedTouches[0].clientX - x0;
  if (Math.abs(dx) > 60) ir(dx < 0 ? 1 : -1);
  x0 = null;
});

slider.addEventListener("input", () => {
  etiqueta.textContent = slider.value;
  sistema.setAttribute("casco-ciclista", "angulo", Number(slider.value));
});

sistema.addEventListener("direccion", e => {
  const l = e.detail.lado;
  estado.textContent = l === "ninguno"
    ? "Casco recto: luces apagadas."
    : "Giro a la " + l + ": luz " + l + " parpadeando.";
});

boton.addEventListener("click", () => {
  enPausa = !enPausa;
  enPausa ? sistema.pause() : sistema.play();
  boton.textContent = enPausa ? "Continuar" : "Pausar";
});

const hint = $("#hint");
marcador.addEventListener("markerFound", () => guia.classList.add("ok"));
marcador.addEventListener("markerLost", () => {
  guia.classList.remove("ok"); hint.textContent = "Enfoca el marcador Hiro aquí";
});
window.addEventListener("camera-error", () => {
  hint.textContent = "Revisa HTTPS y permisos de cámara";
});

sistema.addEventListener("loaded", () => mostrar(false));
mostrar(false);
setTimeout(recortar, 500);

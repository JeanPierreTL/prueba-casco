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
const sistema = $("#sistema");
const estado = $("#estado");
const boton = $("#pausa");
const marcador = $("#marcador");
const slider = $("#inclinacion");
const etiqueta = $("#valorAngulo");
const selectorCamara = $("#camara");
const textoGuia = $("#textoGuia");
const prev = $("#prev"), next = $("#next");
let actual = 0;

const CLAVE_CAMARA = "casco-ra-camara-v2";
let cambiandoCamara = false;
let streamPreparado;

function mejorarEnfoque(pista) {
  if (!pista?.getCapabilities || !pista.applyConstraints) return;

  const capacidades = pista.getCapabilities();
  const ajustes = {};

  if (capacidades.focusMode?.includes("continuous")) {
    ajustes.focusMode = "continuous";
  }

  if (capacidades.exposureMode?.includes("continuous")) {
    ajustes.exposureMode = "continuous";
  }

  if (capacidades.whiteBalanceMode?.includes("continuous")) {
    ajustes.whiteBalanceMode = "continuous";
  }

  if (Object.keys(ajustes).length) {
    pista.applyConstraints({advanced: [ajustes]}).catch(() => {});
  }
}

async function cambiarCamara(deviceId) {
  if (!deviceId || cambiandoCamara) return;

  const video = document.querySelector("#arjs-video");
  if (!video) return;

  cambiandoCamara = true;
  selectorCamara.disabled = true;
  estado.textContent = "Cambiando cámara…";

  video.srcObject?.getTracks().forEach(track => track.stop());

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        deviceId: {exact: deviceId},
        width: {ideal: 960},
        height: {ideal: 720},
        frameRate: {ideal: 24, max: 30}
      }
    });

    video.srcObject = stream;
    await video.play();
    mejorarEnfoque(stream.getVideoTracks()[0]);
    localStorage.setItem(CLAVE_CAMARA, deviceId);
    window.dispatchEvent(new Event("resize"));
    estado.textContent = "Cámara lista. Enfoca el marcador Hiro completo.";
  } catch (error) {
    localStorage.removeItem(CLAVE_CAMARA);
    estado.textContent = "No se pudo abrir esa cámara. Recargando la cámara automática…";
    setTimeout(() => location.reload(), 1200);
  } finally {
    cambiandoCamara = false;
    selectorCamara.disabled = false;
  }
}

async function prepararSelectorCamara(stream) {
  const pistaActiva = stream.getVideoTracks()[0];
  mejorarEnfoque(pistaActiva);

  const activa = pistaActiva.getSettings?.().deviceId;
  const dispositivos = await navigator.mediaDevices.enumerateDevices();
  const camaras = dispositivos.filter(dispositivo => dispositivo.kind === "videoinput");

  selectorCamara.replaceChildren();
  camaras.forEach((camara, indice) => {
    const opcion = document.createElement("option");
    opcion.value = camara.deviceId;
    opcion.textContent = `${indice + 1}. ${camara.label || "Cámara"}`;
    selectorCamara.appendChild(opcion);
  });

  const guardada = localStorage.getItem(CLAVE_CAMARA);
  const guardadaExiste = camaras.some(camara => camara.deviceId === guardada);
  const camarasTraseras = camaras.filter(camara =>
    /back|rear|environment|trasera/i.test(camara.label)
  );
  const principal = camarasTraseras.find(camara =>
    /camera\s*0(?:\D|$)/i.test(camara.label)
  ) || camarasTraseras[0];
  const seleccionada = guardadaExiste ? guardada : principal?.deviceId || activa;

  if (seleccionada) selectorCamara.value = seleccionada;
  selectorCamara.disabled = camaras.length < 2;

  if (seleccionada && seleccionada !== activa) {
    await cambiarCamara(seleccionada);
  }
}

function iniciarSelectorCamara(stream) {
  if (!stream || stream === streamPreparado) return;
  streamPreparado = stream;

  prepararSelectorCamara(stream).catch(error => {
    console.warn("No se pudieron enumerar las cámaras:", error);
    selectorCamara.replaceChildren(new Option("Cámaras no disponibles", ""));
    selectorCamara.disabled = true;
  });
}

function buscarCamaraActiva() {
  iniciarSelectorCamara(document.querySelector("#arjs-video")?.srcObject);
}

window.addEventListener("camera-init", event => {
  iniciarSelectorCamara(event.detail.stream);
});

// Si el permiso ya estaba concedido, AR.js puede iniciar la cámara antes de
// que este script termine de registrarse y añadir el video después del evento.
const observadorVideo = new MutationObserver(buscarCamaraActiva);
observadorVideo.observe(document.body, {childList: true, subtree: true});
buscarCamaraActiva();

selectorCamara.addEventListener("change", () => {
  cambiarCamara(selectorCamara.value);
});


/* ===== Libro: páginas ===== */
const puntos = $("#puntos");
PAGINAS.forEach(() => puntos.appendChild(document.createElement("span")));

function animar(...els) {
  els.forEach(e => { if (!e) return; e.classList.remove("vuelta"); void e.offsetWidth; e.classList.add("vuelta"); });
}

function mostrarPagina(animado) {
  const d = PAGINAS[actual], n = actual + 1;
  $("#numPag").textContent = `Página ${n} de ${PAGINAS.length}`;
  $("#tit").textContent = d.tit;
  $("#desc").textContent = d.desc;
  $("#numGrande").textContent = n;
  $("#preguntaIzq").textContent = d.preg;
  $("#preguntaMovil").textContent = "Pregunta: " + d.preg;
  puntos.querySelectorAll("span").forEach((s, i) => s.classList.toggle("on", i === actual));

  const ul = $("#detalles"); ul.innerHTML = "";
  d.det.forEach(t => { const li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });

  $("#controlInc").style.display = d.control ? "block" : "none";
  prev.disabled = actual === 0;
  next.disabled = actual === PAGINAS.length - 1;

  sistema.querySelectorAll("[data-paginas]").forEach(el => {
    el.setAttribute("visible", el.dataset.paginas.split(" ").includes(String(n)));
  });
  slider.value = 0;
  etiqueta.textContent = "0";
  sistema.setAttribute("casco-ciclista", {auto: n === 3 || n === 5, angulo: 0});

  if (animado) animar($("#tit"), $("#contenido"), $("#paginaIzq"));
}

function ir(delta) {
  const nuevo = actual + delta;
  if (nuevo < 0 || nuevo >= PAGINAS.length) return;
  actual = nuevo;
  mostrarPagina(true);
}
prev.addEventListener("click", () => ir(-1));
next.addEventListener("click", () => ir(1));
document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") ir(1);
  if (e.key === "ArrowLeft") ir(-1);
});

// Deslizar el dedo sobre el título o el texto para pasar de página
let x0 = null;
["#paginaTop", "#paginaBot"].forEach(sel => {
  const el = $(sel);
  el.addEventListener("touchstart", e => {
    const t = e.target;
    x0 = (t.type === "range" || t.closest("details")) ? null : e.touches[0].clientX;
  }, {passive: true});
  el.addEventListener("touchend", e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 60) ir(dx < 0 ? 1 : -1);
    x0 = null;
  });
});

sistema.addEventListener("loaded", () => mostrarPagina(false));
mostrarPagina(false);

slider.addEventListener("input", () => {
  etiqueta.textContent = slider.value;
  sistema.setAttribute("casco-ciclista", "angulo", Number(slider.value));
});

sistema.addEventListener("direccion", e => {
  if (actual < 2) return; // las luces se ven desde la página 3
  const l = e.detail.lado;
  estado.textContent = l === "ninguno"
    ? "Casco recto: luces apagadas."
    : "Giro a la " + l + ": luz " + l + " parpadeando.";
});

let enPausa = false;
boton.addEventListener("click", () => {
  enPausa = !enPausa;
  enPausa ? sistema.pause() : sistema.play();
  boton.textContent = enPausa ? "Continuar" : "Pausar";
});

marcador.addEventListener("markerFound", () => {
  estado.textContent = "Marcador detectado. Usa ‹ › para cambiar de página.";
  document.body.classList.add("marcador-detectado");
  textoGuia.textContent = "Hiro detectado";
});
marcador.addEventListener("markerLost", () => {
  estado.textContent = "Vuelve a enfocar el marcador completo.";
  document.body.classList.remove("marcador-detectado");
  textoGuia.textContent = "Coloca aquí todo el cuadrado Hiro";
});
window.addEventListener("camera-error", () => {
  estado.textContent = "Revisa HTTPS, permisos y disponibilidad de cámara.";
});

/* ===== Diagnóstico: abrir con /index.html?debug ===== */
if (new URLSearchParams(location.search).has("debug")) {
  const d = document.createElement("pre");
  d.style.cssText = "position:fixed;z-index:50;left:4px;right:4px;top:4px;margin:0;padding:6px;" +
    "background:rgba(0,0,0,.85);color:#0f0;font:11px monospace;white-space:pre-wrap;max-height:25vh;overflow:auto";
  document.body.appendChild(d);
  const ev = [];
  ["camera-init", "camera-error", "markerFound", "markerLost"].forEach(n => window.addEventListener(n, () => ev.push(n)));
  setInterval(() => {
    const v = document.querySelector("#arjs-video");
    d.textContent = `AFRAME:${!!window.AFRAME} arjs:${!!(window.AFRAME && AFRAME.systems && AFRAME.systems.arjs)} https:${location.protocol === "https:"}\n` +
      `video:${v ? v.videoWidth + "x" + v.videoHeight + " ready=" + v.readyState : "NO EXISTE"}\neventos:${ev.slice(-6).join(", ")}`;
  }, 700);
}

// ---------- Contenido del libro ----------
const paginas = {
  1: {
    titulo: "El casco",
    texto: "El casco protege la cabeza y integra la electrónica. " +
           "Observa la cúpula azul. ¿Qué componentes añadirías para señalizar giros?",
    detalles: [
      "Cúpula azul: absorbe el impacto y protege la cabeza.",
      "Borde blanco: es la base donde se fijan los componentes.",
      "Visera: protege del sol y de la lluvia."
    ]
  },
  2: {
    titulo: "Sensor de movimiento",
    texto: "Un sensor de movimiento (acelerómetro/giroscopio MPU6050) mide la " +
           "inclinación de la cabeza. Identifica la placa verde sobre el casco.",
    detalles: [
      "El acelerómetro mide la inclinación respecto a la gravedad.",
      "El giroscopio mide qué tan rápido gira la cabeza.",
      "Envía sus datos al Arduino cada pocos milisegundos."
    ]
  },
  3: {
    titulo: "Luces direccionales",
    texto: "Dos luces direccionales, izquierda y derecha, parpadean según el giro. " +
           "Observa cuál se enciende al inclinarse el casco.",
    detalles: [
      "Luz izquierda: parpadea al inclinarse a la izquierda.",
      "Luz derecha: parpadea al inclinarse a la derecha.",
      "Con el casco recto, las dos permanecen apagadas."
    ]
  },
  4: {
    titulo: "Inclinación y giro",
    texto: "Mueve el control de inclinación. Pasados ±15° se activa la luz " +
           "del lado hacia el que te inclinas.",
    detalles: [
      "Negativo: inclinación a la izquierda. Positivo: a la derecha.",
      "El umbral de activación es de ±15°.",
      "En el Arduino, la luz se apaga al bajar de 10° (histéresis)."
    ]
  },
  5: {
    titulo: "El sistema completo",
    texto: "Sistema completo: el sensor mide, Arduino decide y las luces avisan. " +
           "Simulación automática de un ciclista que gira a ambos lados.",
    detalles: [
      "Sensor: mide la inclinación de la cabeza.",
      "Arduino: compara el ángulo con el umbral y decide qué luz encender.",
      "Luces: avisan a conductores y peatones hacia dónde giras."
    ]
  }
};
const TOTAL = Object.keys(paginas).length;
 
// ---------- Referencias ----------
const libro = document.querySelector("#libro");
const sistema = document.querySelector("#sistema");
const estado = document.querySelector("#estado");
const boton = document.querySelector("#pausa");
const marcador = document.querySelector("#marcador");
const slider = document.querySelector("#inclinacion");
const bloqueInclinacion = document.querySelector("#bloqueInclinacion");
const etiqueta = document.querySelector("#valorAngulo");
const selectorCamara = document.querySelector("#camara");
const textoGuia = document.querySelector("#textoGuia");
const visor = document.querySelector("#visor");
const btnAnterior = document.querySelector("#anterior");
const btnSiguiente = document.querySelector("#siguiente");
const indicador = document.querySelector("#indicador");
const detalle = document.querySelector("#detalle");
 
let paginaActual = 1;
 
// ---------- Visor: alinea video y escena RA con el hueco de la página ----------
const raiz = document.documentElement;
let ultimoMarco = "";
 
function ajustarVisor() {
  const r = visor.getBoundingClientRect();
  if (r.width < 10 || r.height < 10) return;
  const marco = [r.left, r.top, r.width, r.height].map(Math.round);
  const clave = marco.join(",");
  if (clave === ultimoMarco) return; // evita bucles con el evento resize
  ultimoMarco = clave;
  ["x", "y", "w", "h"].forEach((k, i) =>
    raiz.style.setProperty(`--v${k}`, marco[i] + "px"));
  // Avisa a A-Frame y AR.js para que reajusten el tamaño del render
  window.dispatchEvent(new Event("resize"));
}
 
window.addEventListener("resize", ajustarVisor);
window.addEventListener("orientationchange", () => setTimeout(ajustarVisor, 250));
if ("ResizeObserver" in window) {
  const ro = new ResizeObserver(ajustarVisor);
  ro.observe(visor);
  ro.observe(document.querySelector(".derecha header"));
  ro.observe(document.body);
}
ajustarVisor();
 
// ---------- Cámara ----------
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
 
// ---------- Páginas del libro ----------
function aplicarPaginaAlCasco() {
  const p = String(paginaActual);
 
  sistema.querySelectorAll("[data-paginas]").forEach(el => {
    el.setAttribute("visible", el.dataset.paginas.split(" ").includes(p));
  });
 
  slider.disabled = p !== "4";
  slider.value = 0;
  etiqueta.textContent = "0";
  sistema.setAttribute("casco-ciclista", {auto: p === "3" || p === "5", angulo: 0});
}
 
function mostrarPagina() {
  const datos = paginas[paginaActual];
 
  document.querySelector("#numeral").textContent = paginaActual;
  document.querySelector("#titulo").textContent = datos.titulo;
  document.querySelector("#contenido").textContent = datos.texto;
  document.querySelector("#detalles").replaceChildren(
    ...datos.detalles.map(t => {
      const li = document.createElement("li");
      li.textContent = t;
      return li;
    })
  );
  indicador.textContent = `Página ${paginaActual} de ${TOTAL}`;
  bloqueInclinacion.hidden = paginaActual !== 4;
  btnAnterior.disabled = paginaActual === 1;
  btnSiguiente.disabled = paginaActual === TOTAL;
  detalle.scrollTop = 0;
 
  aplicarPaginaAlCasco();
  // El título puede cambiar de alto y mover el visor
  requestAnimationFrame(ajustarVisor);
}
 
function irA(n) {
  if (n < 1 || n > TOTAL || n === paginaActual) return;
  const direccion = n > paginaActual ? "gira-sig" : "gira-ant";
  paginaActual = n;
 
  libro.classList.remove("gira-sig", "gira-ant");
  void libro.offsetWidth; // reinicia la animación
  libro.classList.add(direccion);
 
  mostrarPagina();
}
 
btnAnterior.addEventListener("click", () => irA(paginaActual - 1));
btnSiguiente.addEventListener("click", () => irA(paginaActual + 1));
 
document.addEventListener("keydown", e => {
  if (e.target.closest?.("input, select, textarea")) return;
  if (e.key === "ArrowRight") irA(paginaActual + 1);
  if (e.key === "ArrowLeft") irA(paginaActual - 1);
});
 
sistema.addEventListener("loaded", aplicarPaginaAlCasco);
mostrarPagina();
 
slider.addEventListener("input", () => {
  etiqueta.textContent = slider.value;
  sistema.setAttribute("casco-ciclista", "angulo", Number(slider.value));
});
 
sistema.addEventListener("direccion", e => {
  const l = e.detail.lado;
  estado.textContent = l === "ninguno"
    ? "Casco recto: luces apagadas."
    : "Giro a la " + l + ": direccional " + l + " parpadeando.";
});
 
let enPausa = false;
boton.addEventListener("click", () => {
  enPausa = !enPausa;
  enPausa ? sistema.pause() : sistema.play();
  boton.textContent = enPausa ? "Continuar" : "Pausar";
});
 
marcador.addEventListener("markerFound", () => {
  estado.textContent = "Marcador detectado. Usa los botones para cambiar de página.";
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
 
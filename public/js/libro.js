
"use strict";

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
const escenaRA = document.querySelector("#escenaRA");
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
let enPausa = false;
let objetivoDetectado = false;
let motorListo = false;

// ---------- Validación de elementos ----------
if (
  !libro || !sistema || !estado || !boton || !marcador ||
  !escenaRA || !slider || !bloqueInclinacion || !etiqueta ||
  !visor || !btnAnterior || !btnSiguiente || !indicador || !detalle
) {
  console.error(
    "Faltan elementos HTML necesarios. Comprueba los ID de index.html."
  );
} else {

  // ---------- Visor ----------
  const raiz = document.documentElement;
  let ultimoMarco = "";

  function ajustarVisor() {
    const r = visor.getBoundingClientRect();

    if (r.width < 10 || r.height < 10) return;

    const marco = [
      r.left,
      r.top,
      r.width,
      r.height
    ].map(Math.round);

    const clave = marco.join(",");

    if (clave === ultimoMarco) return;

    ultimoMarco = clave;

    ["x", "y", "w", "h"].forEach((k, i) => {
      raiz.style.setProperty(`--v${k}`, marco[i] + "px");
    });

    // Redimensiona el render de A-Frame.
    window.dispatchEvent(new Event("resize"));
  }

  function actualizarGuia(texto) {
    if (textoGuia) {
      textoGuia.textContent = texto;
    }
  }

  window.addEventListener("resize", ajustarVisor);

  window.addEventListener("orientationchange", () => {
    window.setTimeout(ajustarVisor, 250);
  });

  if ("ResizeObserver" in window) {
    const observador = new ResizeObserver(ajustarVisor);

    observador.observe(visor);

    const encabezado = document.querySelector(".derecha header");

    if (encabezado) observador.observe(encabezado);
  }

  // ---------- Cámara y reconocimiento MindAR ----------
  // MindAR administra el acceso a la cámara.
  // No se debe buscar #arjs-video ni usar eventos de AR.js.

  if (selectorCamara) {
    selectorCamara.disabled = true;
    selectorCamara.replaceChildren();

    const opcion = document.createElement("option");
    opcion.value = "";
    opcion.textContent = "Cámara administrada por MindAR";

    selectorCamara.appendChild(opcion);
  }

  marcador.addEventListener("targetFound", () => {
    objetivoDetectado = true;

    document.body.classList.add("marcador-detectado");

    actualizarGuia("Imagen reconocida");

    estado.textContent =
      "Imagen reconocida. Usa los botones para cambiar de página.";
  });

  marcador.addEventListener("targetLost", () => {
    objetivoDetectado = false;

    document.body.classList.remove("marcador-detectado");

    actualizarGuia("Enfoca la imagen objetivo");

    estado.textContent =
      "Vuelve a enfocar la imagen objetivo.";
  });

  // Evento documentado por la integración A-Frame de MindAR.
  escenaRA.addEventListener("arReady", () => {
    motorListo = true;

    estado.textContent =
      "Cámara iniciada. Enfoca la imagen objetivo.";

    actualizarGuia("Enfoca la imagen objetivo");

    ajustarVisor();
  });

  escenaRA.addEventListener("arError", (event) => {
    motorListo = false;

    console.error(
      "Error al iniciar MindAR:",
      event.detail || event
    );

    estado.textContent =
      "No se pudo iniciar la cámara. Revisa los permisos, HTTPS y la consola.";

    actualizarGuia("Error al iniciar la cámara");
  });

  // ---------- Páginas del libro ----------
  function aplicarPaginaAlCasco() {
    const p = String(paginaActual);

    sistema.querySelectorAll("[data-paginas]").forEach((elemento) => {
      const paginasElemento = (elemento.dataset.paginas || "")
        .split(/\s+/)
        .filter(Boolean);

      elemento.setAttribute(
        "visible",
        paginasElemento.includes(p)
      );
    });

    slider.disabled = paginaActual !== 4;
    slider.value = 0;
    etiqueta.textContent = "0";

    // Mantiene el comportamiento original:
    // automático en páginas 3 y 5.
    sistema.setAttribute("casco-ciclista", {
      auto: paginaActual === 3 || paginaActual === 5,
      angulo: 0
    });
  }

  function mostrarPagina() {
    const datos = paginas[paginaActual];

    document.querySelector("#numeral").textContent = paginaActual;
    document.querySelector("#titulo").textContent = datos.titulo;
    document.querySelector("#contenido").textContent = datos.texto;

    document.querySelector("#detalles").replaceChildren(
      ...datos.detalles.map((texto) => {
        const li = document.createElement("li");
        li.textContent = texto;
        return li;
      })
    );

    indicador.textContent = `Página ${paginaActual} de ${TOTAL}`;

    bloqueInclinacion.hidden = paginaActual !== 4;

    btnAnterior.disabled = paginaActual === 1;
    btnSiguiente.disabled = paginaActual === TOTAL;

    detalle.scrollTop = 0;

    aplicarPaginaAlCasco();

    // El encabezado puede cambiar de alto.
    requestAnimationFrame(ajustarVisor);
  }

  function irA(n) {
    if (n < 1 || n > TOTAL || n === paginaActual) return;

    const direccion = n > paginaActual ? "gira-sig" : "gira-ant";

    paginaActual = n;

    libro.classList.remove("gira-sig", "gira-ant");

    void libro.offsetWidth;

    libro.classList.add(direccion);

    mostrarPagina();
  }

  btnAnterior.addEventListener("click", () => {
    irA(paginaActual - 1);
  });

  btnSiguiente.addEventListener("click", () => {
    irA(paginaActual + 1);
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.closest?.("input, select, textarea")) return;

    if (event.key === "ArrowRight") {
      irA(paginaActual + 1);
    }

    if (event.key === "ArrowLeft") {
      irA(paginaActual - 1);
    }
  });

  // ---------- Modelo 3D ----------
  sistema.addEventListener("loaded", aplicarPaginaAlCasco);

  sistema.addEventListener("componentinitialized", (event) => {
    if (event.detail.name === "casco-ciclista") {
      aplicarPaginaAlCasco();
    }
  });

  // ---------- Control de inclinación ----------
  slider.addEventListener("input", () => {
    const angulo = Number(slider.value);

    etiqueta.textContent = String(angulo);

    sistema.setAttribute("casco-ciclista", {
      auto: false,
      angulo
    });
  });

  // ---------- Mensajes de dirección ----------
  sistema.addEventListener("direccion", (event) => {
    const lado = event.detail?.lado;

    if (!lado) return;

    estado.textContent = lado === "ninguno"
      ? "Casco recto: luces apagadas."
      : `Giro a la ${lado}: direccional ${lado} parpadeando.`;
  });

  // ---------- Pausa ----------
  boton.addEventListener("click", () => {
    enPausa = !enPausa;

    if (enPausa) {
      sistema.pause();
    } else {
      sistema.play();
    }

    boton.textContent = enPausa ? "Continuar" : "Pausar";

    if (enPausa) {
      estado.textContent = "Modelo pausado.";
    } else if (objetivoDetectado) {
      estado.textContent =
        "Imagen reconocida. Puedes cambiar de página.";
    } else if (motorListo) {
      estado.textContent =
        "Cámara iniciada. Enfoca la imagen objetivo.";
    } else {
      estado.textContent = "Iniciando cámara...";
    }
  });

  // ---------- Inicialización ----------
  mostrarPagina();

  requestAnimationFrame(() => {
    ajustarVisor();
  });

  // Diagnóstico si el motor no informa que está listo.
  window.setTimeout(() => {
    if (!motorListo) {
      console.warn(
        "MindAR todavía no ha emitido arReady. " +
        "Comprueba los permisos de cámara y la carga de targets.mind."
      );
    }
  }, 10000);
}

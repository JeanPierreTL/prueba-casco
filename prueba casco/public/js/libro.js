const textos = {
  1: "El casco protege la cabeza y integra la electrónica. " +
     "Observa la cúpula azul. ¿Qué componentes añadirías para señalizar giros?",
  2: "Un sensor de movimiento (acelerómetro/giroscopio MPU6050) mide la " +
     "inclinación de la cabeza. Identifica la placa verde sobre el casco.",
  3: "Dos luces direccionales, izquierda y derecha, parpadean según el giro. " +
     "Observa cuál se enciende al inclinarse el casco.",
  4: "Mueve el control de inclinación. Pasados ±15° se activa la luz " +
     "del lado hacia el que te inclinas.",
  5: "Sistema completo: el sensor mide, Arduino decide y las luces avisan. " +
     "Simulación automática de un ciclista que gira a ambos lados."
};

const selector = document.querySelector("#pagina");
const sistema = document.querySelector("#sistema");
const estado = document.querySelector("#estado");
const boton = document.querySelector("#pausa");
const marcador = document.querySelector("#marcador");
const slider = document.querySelector("#inclinacion");
const etiqueta = document.querySelector("#valorAngulo");

function mostrarPagina() {
  const p = selector.value;
  document.querySelector("#contenido").textContent = textos[p];

  sistema.querySelectorAll("[data-paginas]").forEach(el => {
    el.setAttribute("visible", el.dataset.paginas.split(" ").includes(p));
  });

  slider.disabled = p !== "4";
  slider.value = 0;
  etiqueta.textContent = "0";
  sistema.setAttribute("casco-ciclista", {auto: p === "3" || p === "5", angulo: 0});
}

selector.addEventListener("change", mostrarPagina);
sistema.addEventListener("loaded", mostrarPagina);
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
  estado.textContent = "Marcador detectado. Selecciona tu página.";
});
marcador.addEventListener("markerLost", () => {
  estado.textContent = "Vuelve a enfocar el marcador completo.";
});
window.addEventListener("camera-error", () => {
  estado.textContent = "Revisa HTTPS, permisos y disponibilidad de cámara.";
});

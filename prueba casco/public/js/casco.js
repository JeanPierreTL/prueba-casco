// Componente: casco de ciclista con direccionales según inclinación.
// Convención: ángulo negativo = inclinación a la izquierda; positivo = derecha.
const THREE = AFRAME.THREE;

AFRAME.registerComponent("casco-ciclista", {
  schema: {
    angulo: {type: "number", default: 0},
    umbral: {type: "number", default: 15},
    auto:   {type: "boolean", default: false}
  },

  init: function () {
    const crear = (tag, atributos, padre) => {
      const e = document.createElement(tag);
      Object.entries(atributos).forEach(([k, v]) => e.setAttribute(k, v));
      padre.appendChild(e);
      return e;
    };

    this.cuerpo = crear("a-entity", {}, this.el);

    // Página 1: cúpula, borde y visera
    crear("a-sphere", {radius: 0.5, "theta-length": 90, color: "#1e88e5",
      material: "shader: flat; side: double"}, this.cuerpo);
    crear("a-torus", {radius: 0.5, "radius-tubular": 0.03, rotation: "90 0 0",
      color: "#ffffff", material: "shader: flat"}, this.cuerpo);
    crear("a-box", {position: "0 0.03 -0.52", width: 0.5, height: 0.02,
      depth: 0.22, color: "#0d47a1", material: "shader: flat"}, this.cuerpo);

    // Página 2: sensor de movimiento (MPU6050)
    crear("a-box", {position: "0 0.52 0", width: 0.22, height: 0.04,
      depth: 0.16, color: "#43a047", material: "shader: flat",
      "data-paginas": "2 4 5"}, this.cuerpo);

    // Página 3: luces direccionales
    const luz = x => crear("a-sphere", {position: `${x} 0.08 0`, radius: 0.09,
      color: "#3a2a10", material: "shader: flat",
      "data-paginas": "3 4 5"}, this.cuerpo);
    this.luzI = luz(-0.5);
    this.luzD = luz(0.5);

    this.ang = 0;
    this.lado = "ninguno";
    this.pintado = "";
  },

  update: function () {
    if (!this.data.auto) this.ang = this.data.angulo;
  },

  tick: function (t) {
    if (this.data.auto) this.ang = 30 * Math.sin(t / 2000);

    this.cuerpo.object3D.rotation.z = -THREE.MathUtils.degToRad(this.ang);

    const u = this.data.umbral;
    const lado = this.ang < -u ? "izquierda" : this.ang > u ? "derecha" : "ninguno";
    const on = Math.floor(t / 400) % 2 === 0;

    if (lado !== this.lado) {
      this.lado = lado;
      this.el.emit("direccion", {lado: lado});
    }

    const huella = lado + on;
    if (huella === this.pintado) return;
    this.pintado = huella;

    const ENC = "#ffa000", APA = "#3a2a10";
    this.luzI.setAttribute("color", lado === "izquierda" && on ? ENC : APA);
    this.luzD.setAttribute("color", lado === "derecha" && on ? ENC : APA);
  }
});

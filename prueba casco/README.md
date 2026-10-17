# Casco inteligente de ciclista con direccionales + Realidad Aumentada

Libro educativo con RA (A-Frame 1.6.0 + AR.js 3.4.7) y firmware Arduino.

## Estructura
```text
casco_ra/
├── arduino/casco_direccional/casco_direccional.ino
├── public/
│   ├── css/estilos.css
│   ├── js/casco.js      (componente 3D del casco)
│   ├── js/libro.js      (lógica de páginas)
│   ├── assets/
│   ├── aframe.html      (escena básica)
│   ├── vista3d.html     (casco 3D con simulación)
│   └── index.html       (RA con marcador Hiro)
├── package.json
└── README.md
```

## Ejecutar (Codespaces)
```bash
npx --yes http-server public -p 8000 -a 0.0.0.0
```
Abra el puerto 8000 (HTTPS) y pruebe `/aframe.html`, `/vista3d.html`, `/index.html`.

## Páginas del libro
1. El casco · 2. Sensor de movimiento · 3. Luces direccionales ·
4. Inclinación y giro (control manual) · 5. Sistema completo (simulación).

## Arduino
Abra `casco_direccional.ino` en Arduino IDE. Umbral: ±15° (histéresis a 10°).

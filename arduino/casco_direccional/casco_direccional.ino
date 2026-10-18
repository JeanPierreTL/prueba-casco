/*
  Casco de ciclista con direccionales por inclinación.
  Placa: Arduino Uno/Nano | Sensor: MPU6050 (I2C, 0x68)

  Conexiones:
    MPU6050 VCC->5V (o 3.3V según módulo), GND->GND, SDA->A4, SCL->A5
    LED izquierdo (naranja) -> D5 con resistencia 220 ohm a GND
    LED derecho   (naranja) -> D6 con resistencia 220 ohm a GND
    (Para tiras LED use un transistor/MOSFET, no el pin directo.)

  Convención: roll negativo = inclinación izquierda; positivo = derecha.
  Si en su montaje queda invertido, cambie SIGNO a -1.
*/
#include <Wire.h>

const uint8_t MPU = 0x68;
const uint8_t PIN_IZQ = 5;
const uint8_t PIN_DER = 6;

const float UMBRAL_ON  = 15.0;  // grados para activar
const float UMBRAL_OFF = 10.0;  // grados para desactivar (histéresis)
const float SIGNO = 1.0;
const unsigned long PERIODO_PARPADEO = 400; // ms

float rollFiltrado = 0;
int lado = 0;                    // -1 izq, 0 ninguno, 1 der
unsigned long ultimoCambio = 0;
bool encendido = false;

void setup() {
  pinMode(PIN_IZQ, OUTPUT);
  pinMode(PIN_DER, OUTPUT);
  Serial.begin(9600);
  Wire.begin();
  Wire.beginTransmission(MPU);
  Wire.write(0x6B);  // PWR_MGMT_1
  Wire.write(0);     // despertar el sensor
  Wire.endTransmission(true);
}

float leerRoll() {
  Wire.beginTransmission(MPU);
  Wire.write(0x3B);  // ACCEL_XOUT_H
  Wire.endTransmission(false);
  Wire.requestFrom(MPU, (uint8_t)6, (uint8_t)true);
  if (Wire.available() < 6) return rollFiltrado;

  int16_t ax = (Wire.read() << 8) | Wire.read();
  int16_t ay = (Wire.read() << 8) | Wire.read();
  int16_t az = (Wire.read() << 8) | Wire.read();
  (void)ax;
  // Inclinación lateral (roll) a partir del acelerómetro
  return SIGNO * atan2((float)ay, (float)az) * 180.0 / PI;
}

void loop() {
  // Filtro simple para suavizar vibraciones
  rollFiltrado = 0.8 * rollFiltrado + 0.2 * leerRoll();

  // Decisión con histéresis
  if (lado == 0) {
    if (rollFiltrado < -UMBRAL_ON) lado = -1;
    else if (rollFiltrado > UMBRAL_ON) lado = 1;
  } else if (fabs(rollFiltrado) < UMBRAL_OFF) {
    lado = 0;
  }

  // Parpadeo sin bloquear (millis)
  if (millis() - ultimoCambio >= PERIODO_PARPADEO) {
    ultimoCambio = millis();
    encendido = !encendido;
  }

  digitalWrite(PIN_IZQ, (lado == -1 && encendido) ? HIGH : LOW);
  digitalWrite(PIN_DER, (lado ==  1 && encendido) ? HIGH : LOW);

  Serial.print("roll: "); Serial.print(rollFiltrado);
  Serial.print("  lado: "); Serial.println(lado);
  delay(20);
}

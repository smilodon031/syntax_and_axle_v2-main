/**
 * @file esp32_rc_car.ino
 * @brief High-performance WebSockets/HTTP Asynchronous Control Core for NeonRC
 * * Hardware Architecture:
 * - Pin 16: MG90S Steering Servo
 * - Pin 17: 20A Brushed ESC Main Drive
 */

#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ArduinoJson.h>

// --- PIN ARCHITECTURE CONFIGURATION ---
#define SERVO_PIN         16
#define ESC_PIN           17

// --- PWM CHANNEL ATTRIBUTES (LEDC Peripheral Configuration) ---
#define PWM_FREQ          50       // Standard 50Hz for RC Electronics
#define TIMER_RES         16       // 16-bit resolution (0 to 65535)
#define SERVO_CH          0
#define ESC_CH            1

// PWM Duty Cycle Microsecond Values at 16-bit @ 50Hz
// Math: (Microseconds / 20000us total period) * 65535
const uint32_t MIN_PULSE  = 3277;  // 1000us (Full Reverse / Full Left)
const uint32_t NEUTRAL_PULSE = 4915; // 1500us (Stop / Center)
const uint32_t MAX_PULSE  = 6553;  // 2000us (Full Forward / Full Right)

// --- NETWORK ACCESS POINT LOGIC ---
const char* ssid = "NeonRC_Car";
const char* password = ""; // Open Network as per setup specifications

// --- GLOBAL UTILITIES & STATE MANAGERS ---
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
unsigned long lastPacketTime = 0;
const unsigned long FAILSAFE_TIMEOUT_MS = 500; // Auto stop after 0.5s connection drops

// Writes microsecond-equivalent duty cycles to the specified LEDC channel
void writeMicroseconds(uint8_t channel, uint32_t us) {
  uint32_t duty = (us * 65535) / 20000;
  ledcWrite(channel, duty);
}

// Safely sets car elements back to structural dead-center states
void triggerFailsafe() {
  writeMicroseconds(SERVO_CH, 1500);
  writeMicroseconds(ESC_CH, 1500);
}

// Maps input ranges (-100 to 100) to precise microsecond ranges (1000 to 2000)
void processMovement(int throttleValue, int steeringValue) {
  lastPacketTime = millis(); // Refresh connection health watch-timer

  // Constrain inputs safely within boundary conditions
  throttleValue = constrain(throttleValue, -100, 100);
  steeringValue = constrain(steeringValue, -100, 100);

  // Map values linearly to RC control intervals
  uint32_t servoUs = map(steeringValue, -100, 100, 1000, 2000);
  uint32_t escUs   = map(throttleValue, -100, 100, 1000, 2000);

  writeMicroseconds(SERVO_CH, servoUs);
  writeMicroseconds(ESC_CH, escUs);
}

// Handles parsing structural JSON arriving over WebSockets
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, data, len);
    if (error) return;

    // Check if the payload is a Keep-Alive heartbeat frame
    if (doc.containsKey("ping")) {
      uint64_t timestamp = doc["ping"];
      StaticJsonDocument<128> responseDoc;
      responseDoc["pong"] = timestamp;
      String responseString;
      serializeJson(responseDoc, responseString);
      ws.textAll(responseString);
      lastPacketTime = millis();
      return;
    }

    // Regular directional telemetry engine extraction
    if (doc.containsKey("throttle") && doc.containsKey("steering")) {
      int t = doc["throttle"];
      int s = doc["steering"];
      processMovement(t, s);
    }
  }
}

// Structural state configurations for the WebSocket infrastructure
void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
             void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      lastPacketTime = millis();
      break;
    case WS_EVT_DISCONNECT:
      triggerFailsafe();
      break;
    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len);
      break;
    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);

  // Initialize LEDC Core Peripherals for High Resolution Performance
  ledcSetup(SERVO_CH, PWM_FREQ, TIMER_RES);
  ledcAttachPin(SERVO_PIN, SERVO_CH);
  
  ledcSetup(ESC_CH, PWM_FREQ, TIMER_RES);
  ledcAttachPin(ESC_PIN, ESC_CH);

  // Initialize system safely at neutral stop configs
  triggerFailsafe();

  // Bring up local Wi-Fi Access Point network architecture
  WiFi.softAP(ssid, password);
  Serial.print("Access Point Operational. Connect to: ");
  Serial.println(ssid);
  Serial.print("ESP32 Local Gateway IP: ");
  Serial.println(WiFi.softAPIP());

  // Attach WebSocket listeners
  ws.onEvent(onEvent);
  server.addHandler(&ws);

  // --- PROPORTIONAL FALLBACK HTTP ROUTING HANDLERS ---
  server.on("/drive", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (request->hasParam("v")) {
      int t = request->getParam("v")->value().toInt();
      // Keep steering at last known safe state by evaluating mapped values
      uint32_t targetServo = (ledcRead(SERVO_CH) * 20000) / 65535; 
      int currentS = map(targetServo, 1000, 2000, -100, 100);
      processMovement(t, currentS);
    }
    request->send(200, "text/plain", "OK");
  });

  server.on("/steer", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (request->hasParam("v")) {
      int s = request->getParam("v")->value().toInt();
      uint32_t targetEsc = (ledcRead(ESC_CH) * 20000) / 65535;
      int currentT = map(targetEsc, 1000, 2000, -100, 100);
      processMovement(currentT, s);
    }
    request->send(200, "text/plain", "OK");
  });

  server.on("/stop", HTTP_GET, [](AsyncWebServerRequest *request) {
    uint32_t targetServo = (ledcRead(SERVO_CH) * 20000) / 65535;
    int currentS = map(targetServo, 1000, 2000, -100, 100);
    processMovement(0, currentS); // Kill power completely but leave steering where it is
    request->send(200, "text/plain", "OK");
  });

  // Handle cross-origin OPTIONS safety updates seamlessly
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  server.begin();
  lastPacketTime = millis();
}

void loop() {
  ws.cleanupClients();

  // Continuous loop active monitoring system for Failsafe parameters
  if (millis() - lastPacketTime > FAILSAFE_TIMEOUT_MS) {
    triggerFailsafe();
  }
}
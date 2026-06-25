/**
 * @file receiver.ino
 * @brief ESP32 receiver firmware for the React dashboard WebSocket controls.
 *
 * Expected WebSocket payload from the dashboard:
 *   { "throttle": <int -100..100>, "steering": <int -100..100> }
 *
 * This sketch creates an AP named "NeonRC_Car" and opens a WebSocket at "/ws".
 * Steering is mapped to GPIO 12 using ESP32 Core 3.0 LEDC PWM.
 */

#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ArduinoJson.h>

// --- HARDWARE PIN DEFINITIONS ---
#define STEERING_PIN      12
#define ESC_PIN           17

// --- PWM SETUP ---
#define PWM_FREQ          50       // 50Hz standard RC frame rate
#define PWM_RES           16       // 16-bit resolution (0 to 65535)

const char* ssid = "NeonRC_Car";
const char* password = "password123";

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
unsigned long lastPacketTime = 0;
const unsigned long FAILSAFE_TIMEOUT_MS = 500;

void writeMicroseconds(uint8_t pin, uint32_t us) {
  // Duty cycle calculation based on a 16-bit (65535) timer resolution
  uint32_t duty = (us * 65535) / 20000;
  ledcWrite(pin, duty);
}

void triggerFailsafe() {
  writeMicroseconds(STEERING_PIN, 1500); // Center the steering
  writeMicroseconds(ESC_PIN, 1500);      // Neutral throttle
}

void processMovement(int throttleValue, int steeringValue) {
  lastPacketTime = millis();

  throttleValue = constrain(throttleValue, -100, 100);
  steeringValue = constrain(steeringValue, -100, 100);

  uint32_t steeringUs = map(steeringValue, -100, 100, 1000, 2000);
  uint32_t escUs      = map(throttleValue, -100, 100, 1000, 2000);

  writeMicroseconds(STEERING_PIN, steeringUs);
  writeMicroseconds(ESC_PIN, escUs);
}

void handleWebSocketMessage(void* arg, uint8_t* data, size_t len) {
  AwsFrameInfo* info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    data[len] = 0;
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, data, len);
    if (error) return;

    if (doc.containsKey("ping")) {
      uint64_t timestamp = doc["ping"];
      String response = "{\"pong\":" + String(timestamp) + "}";
      ws.textAll(response);
      lastPacketTime = millis();
      return;
    }

    if (doc.containsKey("throttle") && doc.containsKey("steering")) {
      int throttle = doc["throttle"];
      int steering = doc["steering"];
      processMovement(throttle, steering);
    }
  }
}

void onEvent(AsyncWebSocket* server, AsyncWebSocketClient* client, AwsEventType type,
             void* arg, uint8_t* data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      lastPacketTime = millis();
      Serial.print("WebSocket client connected from IP: ");
      Serial.println(client->remoteIP());
      break;
    case WS_EVT_DISCONNECT:
      Serial.println("WebSocket client disconnected");
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

  // FIXED: Pin timers are now initialized with PWM_RES (16-bit) to match the math calculation
  ledcAttach(STEERING_PIN, PWM_FREQ, PWM_RES);
  ledcAttach(ESC_PIN, PWM_FREQ, PWM_RES);

  triggerFailsafe();

  WiFi.softAP(ssid, password);
  Serial.print("Access point started: ");
  Serial.println(ssid);

  ws.onEvent(onEvent);
  server.addHandler(&ws);
  server.begin();

  lastPacketTime = millis();
}

void loop() {
  ws.cleanupClients();
  if (millis() - lastPacketTime > FAILSAFE_TIMEOUT_MS) {
    triggerFailsafe();
  }
}
/**
 * @file receiver.ino
 * @brief Final high-performance firmware matching the React Cockpit Web App
 * 
 * Hardware Layout:
 * - Pin 16: MG90S Steering Servo Signal Wire
 * - Pin 17: Bnineteenteam 20A Brushed ESC Signal Wire
 */

#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ArduinoJson.h>

// --- HARDWARE PIN DEFINITIONS ---
#define SERVO_PIN         16
#define ESC_PIN           17

// --- HIGH-RESOLUTION PWM SETUP ---
#define PWM_FREQ          50       // Standard 50Hz RC frame rate
#define TIMER_RES         16       // 16-bit precision (0 - 65535)
#define SERVO_CH          0
#define ESC_CH            1

// Network credentials matching your Setup UI specs
const char* ssid = "NeonRC_Car";
const char* password = "password123"; 

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
unsigned long lastPacketTime = 0;
const unsigned long FAILSAFE_TIMEOUT_MS = 500; // 0.5s connection protection drop

// Converts microseconds directly to 16-bit register duty values
void writeMicroseconds(uint8_t channel, uint32_t us) {
  uint32_t duty = (us * 65535) / 20000;
  ledcWrite(channel, duty);
}

// Drops car states back to safe, non-destructive defaults
void triggerFailsafe() {
  writeMicroseconds(SERVO_CH, 1500); // Dead center
  writeMicroseconds(ESC_CH, 1500);   // Stop motor
}

// Maps input arrays (-100 to 100) straight to standard microsecond pulses
void processMovement(int throttleValue, int steeringValue) {
  lastPacketTime = millis(); // Kick the watchdog timer

  throttleValue = constrain(throttleValue, -100, 100);
  steeringValue = constrain(steeringValue, -100, 100);

  // Map inputs directly to clean 1000us - 2000us waveforms
  uint32_t servoUs = map(steeringValue, -100, 100, 1000, 2000);
  uint32_t escUs   = map(throttleValue, -100, 100, 1000, 2000);

  writeMicroseconds(SERVO_CH, servoUs);
  writeMicroseconds(ESC_CH, escUs);
}

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    data[len] = 0;
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, data, len);
    if (error) return;

    // Direct loop echo back to keep latency analytics alive on screen
    if (doc.containsKey("ping")) {
      uint64_t timestamp = doc["ping"];
      String response = "{\"pong\":" + String(timestamp) + "}";
      ws.textAll(response);
      lastPacketTime = millis();
      return;
    }

    if (doc.containsKey("throttle") && doc.containsKey("steering")) {
      int t = doc["throttle"];
      int s = doc["steering"];
      processMovement(t, s);
    }
  }
}

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

  // Attach precise hardware PWM timers
  ledcSetup(SERVO_CH, PWM_FREQ, TIMER_RES);
  ledcAttachPin(SERVO_PIN, SERVO_CH);
  
  ledcSetup(ESC_CH, PWM_FREQ, TIMER_RES);
  ledcAttachPin(ESC_PIN, ESC_CH);

  triggerFailsafe();

  WiFi.softAP(ssid, password);
  Serial.print("Local Network Live! SSID: ");
  Serial.println(ssid);

  ws.onEvent(onEvent);
  server.addHandler(&ws);
  server.begin();
  
  lastPacketTime = millis();
}

void loop() {
  ws.cleanupClients();

  // Watchdog verification structure
  if (millis() - lastPacketTime > FAILSAFE_TIMEOUT_MS) {
    triggerFailsafe();
  }
}
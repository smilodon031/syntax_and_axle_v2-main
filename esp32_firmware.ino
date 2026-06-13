/*
  NeonRC Cockpit - ESP32 Firmware
  --------------------------------
  Hardware: ESP32, Brushed ESC, Servo Motor
  
  Connections:
  - ESC Signal: GPIO 18 (PWM)
  - Servo Signal: GPIO 19 (PWM)
  
  Communication:
  - WebSocket Server on Port 81
  - Data Format: {"throttle": -100 to 100, "steering": -100 to 100}
*/

#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

// --- CONFIGURATION ---
const char* ssid = "NeonRC_Car";
const char* password = "password123"; // 8 characters min

// Pins
const int ESC_PIN = 18;
const int SERVO_PIN = 19;

// Objects
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
Servo motorESC;
Servo steeringServo;

// --- CONTROL LOGIC ---
void handleControl(int throttle, int steering) {
  // 1. STEERING (Servo)
  // Map: -100 (left) -> 0 deg, 0 (center) -> 90 deg, 100 (right) -> 180 deg
  int steeringAngle = map(steering, -100, 100, 0, 180);
  steeringServo.write(steeringAngle);

  // 2. THROTTLE (ESC)
  // Logic: pwm = 1500 + (throttle * 5)
  // 1500us = stop, 1000us = reverse, 2000us = forward
  int throttlePWM = 1500 + (throttle * 5);
  
  // Clamp values between 1000-2000
  if (throttlePWM > 2000) throttlePWM = 2000;
  if (throttlePWM < 1000) throttlePWM = 1000;
  
  motorESC.writeMicroseconds(throttlePWM);

  Serial.printf("Control -> Throttle: %d (PWM: %d), Steering: %d (Angle: %d)\n", 
                throttle, throttlePWM, steering, steeringAngle);
}

// --- WEBSOCKET EVENT HANDLER ---
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
               void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_DATA) {
    AwsFrameInfo *info = (AwsFrameInfo*)arg;
    if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
      data[len] = 0;
      StaticJsonDocument<200> doc;
      DeserializationError error = deserializeJson(doc, (char*)data);
      
      if (!error) {
        if (doc.containsKey("throttle") && doc.containsKey("steering")) {
          int throttle = doc["throttle"];
          int steering = doc["steering"];
          handleControl(throttle, steering);
        }
        
        // Handle ping/pong for latency check
        if (doc.containsKey("ping")) {
          String response = "{\"pong\":" + String((long)doc["ping"]) + "}";
          client->text(response);
        }
      }
    }
  }
}

void setup() {
  Serial.begin(115200);

  // Initialize Servos
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  
  steeringServo.setPeriodHertz(50);    // Standard 50hz servo
  steeringServo.attach(SERVO_PIN, 500, 2400); 
  
  motorESC.setPeriodHertz(50);
  motorESC.attach(ESC_PIN, 1000, 2000);
  
  // Neutral start (Safety)
  motorESC.writeMicroseconds(1500);
  steeringServo.write(90);

  // Setup WiFi Access Point
  Serial.println("Starting Access Point...");
  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);

  // Setup WebSocket
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  // Start Server
  server.begin();
  Serial.println("Server started.");
}

void loop() {
  ws.cleanupClients();
}

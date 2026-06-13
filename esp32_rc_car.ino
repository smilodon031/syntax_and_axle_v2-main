/*
  NeonRC ESP32 Vehicle Core (Pro Edition)
  ---------------------------------------
  This code handles variable speed and steering (Proportional Control)
  using HTTP parameters sent from the NeonRC Dashboard.

  Hardware Connections:
  - Motor (via L298N or ESC):
    - PWM / ENA: GPIO 25
    - IN1: GPIO 26
    - IN2: GPIO 27
  - Steering Servo:
    - Signal: GPIO 14
*/

#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>

// --- CONFIGURATION ---
const char* ssid = "NeonRC_Car";
const char* password = "password123";

// Pin Definitions
const int MOTOR_ENA = 25;
const int MOTOR_IN1 = 26;
const int MOTOR_IN2 = 27;
const int SERVO_PIN = 14;

// PWM Config
const int PWM_FREQ = 5000;
const int PWM_RES = 8; // 0-255

Servo steeringServo;
WebServer server(80);

void handleDrive() {
  if (server.hasArg("v")) {
    int val = server.arg("v").toInt(); // -100 to 100
    
    // Map -100..100 to 0..255 PWM
    int speed = map(abs(val), 0, 100, 0, 255);
    
    if (val > 5) { // Forward
      digitalWrite(MOTOR_IN1, HIGH);
      digitalWrite(MOTOR_IN2, LOW);
      ledcWrite(0, speed);
    } else if (val < -5) { // Reverse
      digitalWrite(MOTOR_IN1, LOW);
      digitalWrite(MOTOR_IN2, HIGH);
      ledcWrite(0, speed);
    } else {
      digitalWrite(MOTOR_IN1, LOW);
      digitalWrite(MOTOR_IN2, LOW);
      ledcWrite(0, 0);
    }
  }
  server.send(200, "text/plain", "OK");
}

void handleSteer() {
  if (server.hasArg("v")) {
    int val = server.arg("v").toInt(); // -100 (left) to 100 (right)
    
    // Map -100..100 to 0..180 degrees
    int angle = map(val, -100, 100, 45, 135); // 45-135 range for safety
    steeringServo.write(angle);
  }
  server.send(200, "text/plain", "OK");
}

void handleStop() {
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, LOW);
  ledcWrite(0, 0);
  server.send(200, "text/plain", "STOPPED");
}

void setup() {
  Serial.begin(115200);

  // Pins
  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);
  
  ledcSetup(0, PWM_FREQ, PWM_RES);
  ledcAttachPin(MOTOR_ENA, 0);

  steeringServo.attach(SERVO_PIN);
  steeringServo.write(90); // Center

  WiFi.softAP(ssid, password);
  Serial.println("WiFi AP Ready: " + String(ssid));
  Serial.println("IP: " + WiFi.softAPIP().toString());

  server.on("/drive", handleDrive);
  server.on("/steer", handleSteer);
  server.on("/stop", handleStop);
  server.on("/", []() { server.send(200, "text/plain", "NeonRC Pro Active"); });

  server.begin();
}

void loop() {
  server.handleClient();
}

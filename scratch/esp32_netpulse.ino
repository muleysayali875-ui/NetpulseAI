#include <ESP8266WiFi.h>       // ✅ ESP8266 / NodeMCU
#include <ESP8266HTTPClient.h> // ✅ ESP8266 HTTP client
#include <WiFiClient.h>        // ✅ Plain HTTP (not HTTPS)
#include <ArduinoJson.h>
#include <math.h>

// ─── WiFi credentials ────────────────────────────────────────
const char* ssid     = "Airtel_Fortune";
const char* password = "Air@123124";

// ─── Backend URL ─────────────────────────────────────────────
// ✅ http:// — your server is plain HTTP on port 5000
const char* serverUrl = "http://192.168.1.2:5000/api/iot/data";

// ─── User ID ─────────────────────────────────────────────────
// Each device sends the userId of its owner so data is
// routed to the correct isolated dashboard.
//   id=2  → rushikeshsawarkar14@gmail.com
//   id=4  → co.2023.rrsawarkar@bitwardha.ac.in
//   id=5  → sayalimuley5@gmail.com
const int OWNER_USER_ID = 2; // ← change per device/user

// ─── LED Pins (NodeMCU / ESP8266) ────────────────────────────
// NodeMCU digital pins: D5=GPIO14, D6=GPIO12, D7=GPIO13
#define GREEN_LED D5  // WiFi connected
#define BLUE_LED  D6  // Sending data
#define RED_LED   D7  // Error

bool errorState = false;
unsigned long lastBlink = 0;
bool redState = false;

// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  pinMode(GREEN_LED, OUTPUT);
  pinMode(BLUE_LED,  OUTPUT);
  pinMode(RED_LED,   OUTPUT);

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(BLUE_LED,  LOW);
  digitalWrite(RED_LED,   LOW);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected to WiFi");
  Serial.print("NodeMCU IP: ");
  Serial.println(WiFi.localIP());

  digitalWrite(GREEN_LED, HIGH); // ✅ WiFi OK
}

// ─────────────────────────────────────────────────────────────
void loop() {

  // 🔴 Blink red LED on error
  if (errorState) {
    if (millis() - lastBlink > 500) {
      lastBlink = millis();
      redState = !redState;
      digitalWrite(RED_LED, redState ? HIGH : LOW);
    }
  } else {
    digitalWrite(RED_LED, LOW);
  }

  if (WiFi.status() == WL_CONNECTED) {

    WiFiClient client;
    HTTPClient http;
    http.setTimeout(15000);
    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");

    // ──────────────────────────────────────────────────────────
    // 🧠 REALISTIC SIMULATION MATCHING ML TRAINING DATA
    // ──────────────────────────────────────────────────────────
    float timeFactor = millis() / 25000.0;

    int activeUsers = 200 + (int)(150 * sin(timeFactor)) + random(-10, 10);
    if (activeUsers < 10) activeUsers = 10;

    float true_congestion = 0.6f * (activeUsers / 400.0f)
                          + 0.25f * sin(timeFactor)
                          + 0.15f * (random(0, 100) / 100.0f);
    if (true_congestion < 0.0f) true_congestion = 0.0f;
    if (true_congestion > 1.0f) true_congestion = 1.0f;

    float latency        = 30.0f + (100.0f * tanh(true_congestion * 2.0f)) + (random(-10, 10) / 2.0f);
    float packet_loss    = 1.0f  + (true_congestion * 3.0f) + (random(-8, 8) / 10.0f);
    if (packet_loss < 0.0f) packet_loss = 0.0f;
    float throughput     = 80.0f - (true_congestion * 50.0f) + (random(-10, 10) / 2.0f);
    if (throughput < 1.0f) throughput = 1.0f;
    float signal_strength = -50.0f + (random(-40, 40) / 10.0f);

    // Occasional anomaly spike (3% chance)
    if (random(0, 100) < 3) {
      latency     *= random(150, 250) / 100.0f;
      packet_loss *= random(200, 400) / 100.0f;
      throughput  *= random(30,  70)  / 100.0f;
    }

    // ─── Build JSON payload ────────────────────────────────────
    StaticJsonDocument<256> doc;
    doc["userId"]          = OWNER_USER_ID; // ✅ Routes to correct dashboard
    doc["active_users"]    = activeUsers;
    doc["latency"]         = latency;
    doc["throughput"]      = throughput;
    doc["packet_loss"]     = packet_loss;
    doc["signal_strength"] = signal_strength;

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    Serial.println("\nSending data:");
    Serial.println(jsonPayload);

    digitalWrite(BLUE_LED, HIGH); // 🔵 Sending…
    int httpCode = http.POST(jsonPayload);
    digitalWrite(BLUE_LED, LOW);

    if (httpCode > 0) {
      Serial.print("HTTP Response code: ");
      Serial.println(httpCode);
      Serial.println(http.getString());
      errorState = false;
    } else {
      Serial.print("HTTP Error: ");
      Serial.println(http.errorToString(httpCode));
      errorState = true;
    }

    http.end();

  } else {
    Serial.println("WiFi Disconnected — reconnecting…");
    digitalWrite(GREEN_LED, LOW);
    WiFi.reconnect();
    errorState = true;
  }

  delay(5000);
}

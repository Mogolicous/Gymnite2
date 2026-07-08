#include <SPI.h>
#include <MFRC522.h>

/*
 * CABLEADO PARA ARDUINO UNO AL MÓDULO RC522:
 * ---------------------------------------------------------
 * RC522 Pin  |  Arduino UNO Pin
 * -----------|---------------------------------------------
 * SDA (SS)   |  Pin 10
 * SCK        |  Pin 13
 * MOSI       |  Pin 11
 * MISO       |  Pin 12
 * IRQ        |  No se conecta
 * GND        |  GND
 * RST        |  Pin 9
 * 3.3V       |  3.3V (¡NUNCA a 5V!)
 * ---------------------------------------------------------
 */

#define RST_PIN   9
#define SS_PIN    10

MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(9600);   // Iniciar puerto serie
  while (!Serial);      // Esperar a que el puerto serie se abra (solo por seguridad)
  
  SPI.begin();          
  mfrc522.PCD_Init();   
  
  // Imprimir un mensaje inicial para saber que está vivo
  Serial.println("INICIADO"); 
}

void loop() {
  if ( ! mfrc522.PICC_IsNewCardPresent()) {
    return;
  }
  if ( ! mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  String uidString = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      uidString += "0";
    }
    uidString += String(mfrc522.uid.uidByte[i], HEX);
  }
  
  uidString.toUpperCase();

  // Imprimir SOLO el código y un salto de línea (Python leerá esto)
  Serial.println(uidString);

  mfrc522.PICC_HaltA();
  delay(1000); 
}

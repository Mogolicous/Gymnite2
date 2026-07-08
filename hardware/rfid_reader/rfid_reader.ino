#include <SPI.h>
#include <MFRC522.h>
#include <Keyboard.h> // IMPORTANTE: Solo funciona en Arduino Leonardo, Pro Micro o placas con USB Nativo (ATmega32U4)

/*
 * CABLEADO TÍPICO (Arduino Leonardo / Pro Micro al módulo RC522):
 * ---------------------------------------------------------
 * RC522 Pin  |  Arduino Leonardo/Micro Pin
 * -----------|---------------------------------------------
 * SDA (SS)   |  Pin 10
 * SCK        |  Pin 15 (SCK del header ICSP) o buscar pin SCK
 * MOSI       |  Pin 16 (MOSI del header ICSP)
 * MISO       |  Pin 14 (MISO del header ICSP)
 * IRQ        |  No se conecta
 * GND        |  GND
 * RST        |  Pin 9
 * 3.3V       |  3.3V (¡NUNCA a 5V, quemarás el módulo RC522!)
 * ---------------------------------------------------------
 */

#define RST_PIN   9
#define SS_PIN    10

MFRC522 mfrc522(SS_PIN, RST_PIN);  // Instancia del lector RC522

void setup() {
  Serial.begin(9600);   // Iniciar monitor serie (para debug)
  
  SPI.begin();          // Iniciar bus SPI
  mfrc522.PCD_Init();   // Iniciar módulo MFRC522
  
  Keyboard.begin();     // Iniciar emulación de teclado HID
  
  delay(100);
  Serial.println(F("Lector RFID HID listo. Acerca una tarjeta..."));
}

void loop() {
  // 1. Verificar si hay una tarjeta nueva cerca
  if ( ! mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // 2. Leer el código (UID) de la tarjeta
  if ( ! mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // 3. Convertir el UID (bytes) a un String hexadecimal
  String uidString = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    // Agregar un 0 a la izquierda si es menor a 0x10 para mantener formato de 2 dígitos
    if (mfrc522.uid.uidByte[i] < 0x10) {
      uidString += "0";
    }
    uidString += String(mfrc522.uid.uidByte[i], HEX);
  }
  
  uidString.toUpperCase(); // Ej: pasará de "a1b2" a "A1B2"

  // (Opcional) Imprimir por monitor serie para depuración
  Serial.print("Tarjeta Leída: ");
  Serial.println(uidString);

  // 4. EMULAR TECLADO: Escribir el código y presionar ENTER
  Keyboard.print(uidString);
  Keyboard.write(KEY_RETURN); // Presiona 'Enter'

  // 5. Pausar la tarjeta para no leerla 100 veces por segundo
  mfrc522.PICC_HaltA();
  
  // Pequeña pausa adicional para evitar rebotes
  delay(1000); 
}

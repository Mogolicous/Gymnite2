import serial
import pyautogui
import time
import sys

# CONFIGURACIÓN: Cambia esto por el puerto COM de tu Arduino UNO (ej. 'COM3', 'COM4', '/dev/ttyUSB0')
PUERTO_COM = 'COM3' 
BAUD_RATE = 9600

def main():
    print(f"Iniciando puente Serial-a-Teclado en {PUERTO_COM}...")
    
    try:
        # Intenta conectar con el Arduino
        arduino = serial.Serial(PUERTO_COM, BAUD_RATE, timeout=1)
        time.sleep(2) # Espera a que el Arduino se reinicie
        print("✅ Conectado exitosamente al Arduino UNO.")
        print("Esperando escaneo de tarjetas... (Presiona Ctrl+C para salir)")
        
    except serial.SerialException as e:
        print(f"❌ Error al conectar al puerto {PUERTO_COM}.")
        print("Asegúrate de que el Arduino esté conectado y que el puerto sea correcto.")
        print(f"Detalle del error: {e}")
        sys.exit(1)

    try:
        while True:
            # Leer línea del puerto serie
            if arduino.in_waiting > 0:
                linea = arduino.readline().decode('utf-8').strip()
                
                # Ignorar el mensaje de inicio
                if linea == "INICIADO":
                    continue
                
                if linea:
                    print(f"💳 Tarjeta detectada: {linea} -> Escribiendo como teclado...")
                    # Simular tipeo del código
                    pyautogui.write(linea)
                    # Simular presionar Enter
                    pyautogui.press('enter')
                    
            time.sleep(0.01)
            
    except KeyboardInterrupt:
        print("\nCerrando programa...")
        arduino.close()

if __name__ == "__main__":
    main()

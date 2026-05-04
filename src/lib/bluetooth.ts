export const MEDIBOT_SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
export const LIVE_CHAR_UUID = "12345678-1234-5678-1234-56789abcdef1";
export const FINAL_CHAR_UUID = "12345678-1234-5678-1234-56789abcdef2";

export interface MediData {
  type: "live" | "final";
  hr: number;
  spo2: number;
  temp: number;
  stress?: string;
}

export class BluetoothService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private liveChar: BluetoothRemoteGATTCharacteristic | null = null;
  private finalChar: BluetoothRemoteGATTCharacteristic | null = null;

  async connect(
    onLiveData: (data: MediData) => void,
    onFinalData: (data: MediData) => void,
    onDisconnect: () => void
  ) {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth API is not available in this browser.");
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "MediBot" }],
        optionalServices: [MEDIBOT_SERVICE_UUID],
      });

      this.device.addEventListener('gattserverdisconnected', onDisconnect);

      this.server = await this.device.gatt?.connect() || null;
      if (!this.server) throw new Error("Could not connect to GATT server.");

      const service = await this.server.getPrimaryService(MEDIBOT_SERVICE_UUID);
      
      this.liveChar = await service.getCharacteristic(LIVE_CHAR_UUID);
      this.finalChar = await service.getCharacteristic(FINAL_CHAR_UUID);

      await this.liveChar.startNotifications();
      this.liveChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = new TextDecoder().decode(event.target.value);
        try {
          const data = JSON.parse(value);
          onLiveData(data);
        } catch (e) {
          console.error("Error parsing live data:", e);
        }
      });

      await this.finalChar.startNotifications();
      this.finalChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = new TextDecoder().decode(event.target.value);
        try {
          const data = JSON.parse(value);
          onFinalData(data);
        } catch (e) {
          console.error("Error parsing final data:", e);
        }
      });

      return this.device;
    } catch (error) {
      console.error("Bluetooth connection error:", error);
      throw error;
    }
  }

  async disconnect() {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.liveChar = null;
    this.finalChar = null;
  }

  isConnected() {
    return this.device?.gatt?.connected || false;
  }
}

export const bluetoothService = new BluetoothService();

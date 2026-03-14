"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "../components/ui/use-toast";

const PrinterContext = createContext(null);

export const PrinterProvider = ({ children }) => {
  const { success, error } = useToast();
  const [device, setDevice] = useState(null);
  const [server, setServer] = useState(null);
  const [service, setService] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // disconnected, connecting, connected

  // Common POS printer service UUIDs
  const serviceUuids = [
    '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS
    '0000ff00-0000-1000-8000-00805f9b34fb', // Generic/MTP
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
    'e7e11102-acdd-4151-af41-e1105920a255', // Others
    '0000fee7-0000-1000-8000-00805f9b34fb', // ZJiang
    '00001101-0000-1000-8000-00805f9b34fb', // Serial Port
    '0000ffe0-0000-1000-8000-00805f9b34fb', // Cc2540
    '0000ff01-0000-1000-8000-00805f9b34fb', // Common Chinese
    '0000af11-0000-1000-8000-00805f9b34fb', // Variants
    '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Re-confirm ISSC
  ];

  // Attempt auto-reconnect on mount
  useEffect(() => {
    const savedPrinter = localStorage.getItem("saved_printer_name");
    if (savedPrinter && navigator.bluetooth) {
      console.log("Found saved printer preference:", savedPrinter);
      // We can't auto-connect without user gesture usually, but we can set status
    }
  }, []);

  const connect = async () => {
    if (!navigator.bluetooth) {
      error("Web Bluetooth is not supported in this browser.");
      return;
    }

    if (isConnecting || device) return;

    setIsConnecting(true);
    setConnectionStatus("connecting");
    try {
      console.log("Broad Bluetooth Scan Started...");
      const selectedDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: serviceUuids
      });

      console.log("Device selected:", selectedDevice.name);
      const connectedServer = await selectedDevice.gatt.connect();
      console.log("GATT Server connected");
      
      let connectedService = null;
      let connectedChar = null;

      const charUuids = [
        '00002af1-0000-1000-8000-00805f9b34fb',
        '0000ff02-0000-1000-8000-00805f9b34fb',
        '49535343-8841-43f4-a8d4-ecbe34729bb3',
        '0000ffe1-0000-1000-8000-00805f9b34fb',
        '0000bec8-0000-1000-8000-00805f9b34fb'
      ];

      // Strategy 1: Enumeration (Plural)
      try {
        console.log("Attempting plural service discovery...");
        const services = await connectedServer.getPrimaryServices();
        console.log(`Discovered ${services.length} services`);
        
        for (const s of services) {
          console.log(`Checking service: ${s.uuid}`);
          try {
            const characteristics = await s.getCharacteristics();
            for (const c of characteristics) {
              console.log(`  - Characteristic: ${c.uuid} (${JSON.stringify(c.properties)})`);
              if (c.properties.write || c.properties.writeWithoutResponse) {
                console.log("  !!! Found writable characteristic:", c.uuid);
                connectedService = s;
                connectedChar = c;
                break;
              }
            }
          } catch (e) { console.warn(`Failed to probe service ${s.uuid}`, e); }
          if (connectedChar) break;
        }
      } catch (e) {
        console.warn("Plural discovery failed or not supported, falling back to sequential scan.", e);
      }

      // Strategy 2: Sequential Fallback (using pre-authorized list)
      if (!connectedChar) {
        console.log("Starting sequential UUID scan fallback...");
        for (const uuid of serviceUuids) {
          try {
            connectedService = await connectedServer.getPrimaryService(uuid);
            if (connectedService) {
              for (const cUuid of charUuids) {
                try {
                  connectedChar = await connectedService.getCharacteristic(cUuid);
                  if (connectedChar) break;
                } catch (e) { /* continue */ }
              }
            }
            if (connectedChar) break;
          } catch (e) { /* continue */ }
        }
      }

      if (!connectedChar) {
        throw new Error("Could not find a valid printing service or characteristic.");
      }

      setDevice(selectedDevice);
      setServer(connectedServer);
      setService(connectedService);
      setCharacteristic(connectedChar);
      setConnectionStatus("connected");

      localStorage.setItem("saved_printer_name", selectedDevice.name);

      selectedDevice.addEventListener('gattserverdisconnected', onDisconnected);
      
      success(`Connected to ${selectedDevice.name}`);
    } catch (e) {
      console.error("Printer connection error:", e);
      setConnectionStatus("disconnected");
      if (e.name === 'NotFoundError') {
        error("Printer selection cancelled.");
      } else {
        error(`Failed to connect: ${e.message || "Unknown error"}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (device && device.gatt.connected) {
      device.gatt.disconnect();
    }
    onDisconnected();
  };

  const onDisconnected = () => {
    setDevice(null);
    setServer(null);
    setService(null);
    setCharacteristic(null);
    setConnectionStatus("disconnected");
  };

  const print = async (data) => {
    if (!characteristic) {
      error("Printer not connected");
      return false;
    }
    try {
      let buffer = data;
      if (typeof data === 'string') {
         buffer = new Uint8Array(data.length);
         for (let i = 0; i < data.length; i++) {
           buffer[i] = data.charCodeAt(i);
         }
      }
      
      // Standard BLE MTU is small. 20 bytes is the safest minimum for all printers.
      const maxChunk = 20; 
      console.log(`Starting print job: ${buffer.length} bytes, chunk size: ${maxChunk}`);

      for (let i = 0; i < buffer.length; i += maxChunk) {
        const chunk = buffer.slice(i, i + maxChunk);
        
        // Try multiple write methods
        try {
          if (characteristic.writeValueWithoutResponse) {
            await characteristic.writeValueWithoutResponse(chunk);
          } else if (characteristic.writeValueWithResponse) {
            await characteristic.writeValueWithResponse(chunk);
          } else {
            await characteristic.writeValue(chunk);
          }
        } catch (writeErr) {
          console.warn("Primary write method failed, trying legacy fallback...", writeErr);
          await characteristic.writeValue(chunk);
        }

        // Delay to prevent buffer overflow on the printer side
        await new Promise(resolve => setTimeout(resolve, 30));
        
        if (i % 100 === 0) {
          console.log(`Sent ${i}/${buffer.length} bytes...`);
        }
      }
      
      console.log("Print job completed successfully");
      return true;
    } catch (e) {
      console.error("Print transmission error:", e);
      error(`Printing failed: ${e.message || "Unknown error"}`);
      return false;
    }
  };

  return (
    <PrinterContext.Provider value={{ 
      device, 
      isConnecting, 
      connectionStatus, 
      connect, 
      disconnect, 
      print 
    }}>
      {children}
    </PrinterContext.Provider>
  );
};

export const usePrinter = () => {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error("usePrinter must be used within a PrinterProvider");
  }
  return context;
};

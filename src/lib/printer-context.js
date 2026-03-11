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

  // Restore connection on load if possible (Web Bluetooth doesn't allow auto-reconnect without user gesture usually, 
  // but we can keep track of state)
  
  const connect = async () => {
    if (!navigator.bluetooth) {
      error("Web Bluetooth is not supported in this browser.");
      return;
    }

    setIsConnecting(true);
    try {
      const selectedDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // Standard POS UUID
      });

      const connectedServer = await selectedDevice.gatt.connect();
      const connectedService = await connectedServer.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const connectedChar = await connectedService.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      setDevice(selectedDevice);
      setServer(connectedServer);
      setService(connectedService);
      setCharacteristic(connectedChar);

      selectedDevice.addEventListener('gattserverdisconnected', onDisconnected);
      
      success(`Connected to ${selectedDevice.name}`);
    } catch (e) {
      console.error(e);
      error("Failed to connect to printer.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (device && device.gatt.connected) {
      device.gatt.disconnect();
    }
    setDevice(null);
    setServer(null);
    setService(null);
    setCharacteristic(null);
  };

  const onDisconnected = () => {
    setDevice(null);
    setServer(null);
    setService(null);
    setCharacteristic(null);
  };

  const print = async (data) => {
    if (!characteristic) {
      error("Printer not connected");
      return false;
    }
    try {
      // If data is string, convert to Uint8Array
      let buffer = data;
      if (typeof data === 'string') {
         buffer = new Uint8Array(data.length);
         for (let i = 0; i < data.length; i++) {
           buffer[i] = data.charCodeAt(i);
         }
      }
      
      // Split into chunks if needed (max 512 bytes usually)
      const maxChunk = 512;
      for (let i = 0; i < buffer.length; i += maxChunk) {
        const chunk = buffer.slice(i, i + maxChunk);
        await characteristic.writeValue(chunk);
      }
      return true;
    } catch (e) {
      console.error(e);
      error("Failed to send data to printer");
      return false;
    }
  };

  return (
    <PrinterContext.Provider value={{ device, isConnecting, connect, disconnect, print }}>
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

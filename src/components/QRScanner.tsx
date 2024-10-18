import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import jsQR from "jsqr";
import localforage from 'localforage';
import { AttendanceRecord, User } from '../utils/types';
import { getWelcomeMessage, getExitMessage } from '../utils/messages';

const QRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (scanning) {
      startScanning();
    } else {
      stopScanning();
    }
  }, [scanning]);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error("Erreur lors de l'accès à la caméra:", err);
      toast.error("Impossible d'accéder à la caméra");
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const handleScan = async (qrCode: string) => {
    const users = await localforage.getItem<User[]>('users') || [];
    const user = users.find(u => u.id === qrCode);
    if (!user) {
      toast.error("Utilisateur non trouvé");
      return;
    }

    const attendanceRecords = await localforage.getItem<AttendanceRecord[]>('attendance') || [];
    const lastRecord = attendanceRecords.filter(record => record.userId === qrCode).pop();
    const newType = lastRecord?.type === 'check-in' ? 'check-out' : 'check-in';

    const newRecord: AttendanceRecord = {
      userId: qrCode,
      timestamp: new Date(),
      type: newType
    };
    attendanceRecords.push(newRecord);
    await localforage.setItem('attendance', attendanceRecords);

    const message = newType === 'check-in' 
      ? getWelcomeMessage(`${user.firstName} ${user.lastName}`)
      : getExitMessage();
    toast.success(message);
    setScanning(false);
  };

  const tick = () => {
    if (videoRef.current && canvasRef.current) {
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        canvasRef.current.height = videoRef.current.videoHeight;
        canvasRef.current.width = videoRef.current.videoWidth;
        const context = canvasRef.current.getContext('2d');
        if (context) {
          context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
          const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code) {
            console.log("QR Code détecté", code.data);
            handleScan(code.data);
            return;
          }
        }
      }
      requestAnimationFrame(tick);
    }
  };

  const toggleScanning = () => {
    setScanning(!scanning);
  };

  return (
    <div className="text-center">
      <div className="mb-4">
        {scanning ? (
          <div className="relative w-64 h-64 mx-auto">
            <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover" />
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" style={{ display: 'none' }} />
            <div className="absolute top-0 left-0 w-full h-full border-2 border-gold"></div>
          </div>
        ) : (
          <div className="w-64 h-64 mx-auto bg-gray-700 flex items-center justify-center">
            <span className="text-gray-500">QR Code Scanner</span>
          </div>
        )}
      </div>
      <Button onClick={toggleScanning} className="bg-gold text-black hover:bg-yellow-600">
        {scanning ? 'Arrêter le scan' : 'Scanner QR Code'}
      </Button>
    </div>
  );
};

export default QRScanner;
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The camera half of a gate check.
 *
 * Uses the browser's native `BarcodeDetector` where it exists (Chrome, Edge,
 * Android) and falls back to jsQR everywhere else, so a guard on an iPad is not
 * told to type a DID by hand.
 *
 * Failure modes are reported specifically rather than as "camera error",
 * because the fixes are completely different: a denied permission needs a
 * browser setting, an insecure origin needs HTTPS, and no device at all needs
 * a different machine.
 */

type DetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => DetectorLike;
  }
}

export function QrScanner({ onResult }: { onResult: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  // A camera left running after the component goes away is a light that never
  // switches off, which people rightly find alarming.
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    setError(null);
    doneRef.current = false;

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(
        window.isSecureContext === false
          ? "The camera needs a secure origin — use https, or localhost."
          : "This browser does not expose a camera to web pages.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setScanning(true);

      const detector = window.BarcodeDetector
        ? new window.BarcodeDetector({ formats: ["qr_code"] })
        : null;

      // Loaded only when needed, so browsers with a native detector never pay
      // for the fallback.
      const jsQR = detector ? null : (await import("jsqr")).default;

      const tick = async () => {
        if (doneRef.current) return;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          frameRef.current = requestAnimationFrame(() => void tick());
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        let found: string | null = null;
        try {
          if (detector) {
            const codes = await detector.detect(canvas);
            found = codes[0]?.rawValue ?? null;
          } else if (jsQR) {
            const image = context.getImageData(0, 0, canvas.width, canvas.height);
            found = jsQR(image.data, image.width, image.height)?.data ?? null;
          }
        } catch {
          // A single unreadable frame is normal — keep looking.
        }

        if (found) {
          doneRef.current = true;
          stop();
          onResult(found.trim());
          return;
        }

        frameRef.current = requestAnimationFrame(() => void tick());
      };

      frameRef.current = requestAnimationFrame(() => void tick());
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera permission was refused. Allow it in the browser's site settings, then try again."
          : name === "NotFoundError"
            ? "No camera found on this device."
            : "The camera could not be started.",
      );
      stop();
    }
  }, [onResult, stop]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {scanning ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-full border border-ink-black px-5 py-2.5 text-body text-ink-black hover:bg-mist-gray"
          >
            Stop camera
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            className="rounded-full bg-ink-black px-5 py-2.5 text-body text-paper-white hover:opacity-90"
          >
            Scan with camera
          </button>
        )}
        {scanning ? (
          <span className="text-caption leading-caption text-slate-gray">
            Hold the card&rsquo;s QR in front of the camera.
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-caption leading-caption text-sienna-brown">
          {error}
        </p>
      ) : null}

      <div className={scanning ? "block" : "hidden"}>
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full max-w-[420px] rounded-2xl bg-ink-black"
        />
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

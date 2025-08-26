import { useCallback } from "react";

export const useScreenshot = () => {
  // Take screenshot of specific element
  const takeElementScreenshot = useCallback(async (
    element: HTMLElement, 
    filename?: string,
    format: "png" | "jpeg" = "png",
    quality: number = 1.0
  ) => {
    try {
      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(element, {
        allowTaint: true,
        useCORS: true,
        scale: 2, // Higher quality
        backgroundColor: "#000000",
        width: element.offsetWidth,
        height: element.offsetHeight,
      });

      // Convert to blob
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create screenshot blob"));
          }
        }, `image/${format}`, quality);
      });
    } catch (error) {
      console.error("Failed to take screenshot:", error);
      throw error;
    }
  }, []);

  // Take screenshot of video grid
  const takeVideoGridScreenshot = useCallback(async (filename?: string) => {
    const videoGrid = document.querySelector('[data-video-grid]') as HTMLElement;
    if (!videoGrid) {
      throw new Error("Video grid not found");
    }

    const blob = await takeElementScreenshot(videoGrid, filename);
    return blob;
  }, [takeElementScreenshot]);

  // Take full call screenshot
  const takeFullCallScreenshot = useCallback(async (filename?: string) => {
    const callInterface = document.querySelector('[data-call-interface]') as HTMLElement;
    if (!callInterface) {
      // Fallback to body if call interface not found
      const blob = await takeElementScreenshot(document.body, filename);
      return blob;
    }

    const blob = await takeElementScreenshot(callInterface, filename);
    return blob;
  }, [takeElementScreenshot]);

  // Download screenshot
  const downloadScreenshot = useCallback((blob: Blob, filename?: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Take and download screenshot in one action
  const takeAndDownloadScreenshot = useCallback(async (
    type: "video-grid" | "full-call" = "video-grid",
    filename?: string
  ) => {
    try {
      let blob: Blob;
      
      if (type === "video-grid") {
        blob = await takeVideoGridScreenshot(filename);
      } else {
        blob = await takeFullCallScreenshot(filename);
      }
      
      downloadScreenshot(blob, filename);
      return blob;
    } catch (error) {
      console.error("Failed to take and download screenshot:", error);
      throw error;
    }
  }, [takeVideoGridScreenshot, takeFullCallScreenshot, downloadScreenshot]);

  // Take screenshot using native API (if available)
  const takeNativeScreenshot = useCallback(async () => {
    try {
      if ('getDisplayMedia' in navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            mediaSource: 'screen'
          } as any
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        return new Promise<Blob>((resolve, reject) => {
          video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(video, 0, 0);
            
            canvas.toBlob((blob) => {
              // Stop the stream
              stream.getTracks().forEach(track => track.stop());
              
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Failed to create screenshot blob"));
              }
            }, 'image/png');
          };
        });
      } else {
        throw new Error("Screen capture not supported");
      }
    } catch (error) {
      console.error("Failed to take native screenshot:", error);
      throw error;
    }
  }, []);

  return {
    takeElementScreenshot,
    takeVideoGridScreenshot,
    takeFullCallScreenshot,
    downloadScreenshot,
    takeAndDownloadScreenshot,
    takeNativeScreenshot,
  };
};

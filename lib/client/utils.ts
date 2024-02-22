'use client';

export const handleJoinOurSlackRequest = () => {
  window.location.href = 'https://join.slack.com/t/codeassistcommunity/shared_invite/zt-2dewvxtjl-caGDjW~fOYtODFNeFBlssA';
}

export const convertBitmapToCanvas = (bitmap: ImageBitmap): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  try {
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Cannot draw canvas because context is null');
    }
    ctx.drawImage(bitmap, 0, 0);
  } catch (error) {
    console.error("Canvas drawing error: ", error as Error);
  }

  return canvas;
};

export const convertBitmapToBase64 = async (bitmap: ImageBitmap): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject('Could not get canvas context');
      return;
    }
    ctx.drawImage(bitmap, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = function () {
          const base64data = reader.result;
          resolve(base64data as string);
        };
        reader.readAsDataURL(blob);
      } else {
        reject('Could not convert image to blob');
      }
    }, 'image/png');
  });
};

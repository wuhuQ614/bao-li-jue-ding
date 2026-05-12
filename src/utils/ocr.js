const otsuThreshold = (grayData, total) => {
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < grayData.length; i += 4) histogram[grayData[i]]++;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let sumB = 0, wB = 0, maxVariance = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) { maxVariance = variance; threshold = t; }
  }
  return threshold;
};

const preprocessForOCR = (base64Image) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const minDim = 1800;
      let w = img.width, h = img.height;
      const longSide = Math.max(w, h);
      if (longSide < minDim) {
        const scale = minDim / longSide;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const total = w * h;
      let minGray = 255, maxGray = 0;
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        data[i] = data[i + 1] = data[i + 2] = gray;
        if (gray < minGray) minGray = gray;
        if (gray > maxGray) maxGray = gray;
      }
      const range = maxGray - minGray || 1;
      for (let i = 0; i < data.length; i += 4) {
        const stretched = Math.round(((data[i] - minGray) / range) * 255);
        data[i] = data[i + 1] = data[i + 2] = stretched;
      }
      ctx.putImageData(imageData, 0, 0);
      const threshold = otsuThreshold(data, total);
      const binaryData = ctx.getImageData(0, 0, w, h);
      const bd = binaryData.data;
      for (let i = 0; i < bd.length; i += 4) {
        const val = bd[i] > threshold ? 255 : 0;
        bd[i] = bd[i + 1] = bd[i + 2] = val;
      }
      ctx.putImageData(binaryData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = base64Image;
  });
};

const prepareOCRImage = async (src) => {
  const preprocessed = await preprocessForOCR(src);
  return preprocessed;
};

// ==================== 根应用组件 ====================

export { otsuThreshold, preprocessForOCR, prepareOCRImage };

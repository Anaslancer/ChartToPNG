const sharp = require('sharp');
import * as path from 'path';
import { getChatData, ChartService } from './chartService';
import { ohlcvData } from './ohlcvData';

(async () => {
  const chartService = new ChartService();

  // Token and TimeFrame
  const tokenName = 'HAT';
  const timeFrame = '1m';

  try {
    // Generate chart using OHLCV data
    const chartImagesByBuffer = await chartService.generateChart(ohlcvData);
    const outputPath = path.resolve(process.cwd(), 'output.png'); // Use project root
    const chartImage = await chartService.combineImagesVertically(chartImagesByBuffer);
    const finalImage = await chartService.addTextToImage(chartImage, getChatData(ohlcvData).data, tokenName, timeFrame, {});
    await sharp(finalImage).toFile(outputPath);
    console.log("Generated the output.png");
  } catch (error) {
    console.error('Error generating chart:', error);
  }
})();

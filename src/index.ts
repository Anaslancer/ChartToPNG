import { TestChartService } from './testChartService';
import { ImageService } from './imageCombineService';
import { ohlcvData } from './ohlcvData';
import * as fs from 'fs';
import * as path from 'path';

(async () => {
  const chartService = new TestChartService();
  const imageService = new ImageService();

  // Token and TimeFrame
  const tokenName = 'HAT';
  const timeFrame = '1m';

  try {
    // Generate chart using OHLCV data
    const chartImages = await chartService.generateChart(ohlcvData, tokenName, timeFrame, 1200, 800);
    const outputPath = path.resolve(process.cwd(), 'output.png'); // Use project root
    await imageService.combineImagesVertically(chartImages, outputPath, 1200, 800);
  } catch (error) {
    console.error('Error generating chart:', error);
  }
})();

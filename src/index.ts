import { getChatData, ChartService } from './chartService';
import { ImageService } from './imageService';
import { ohlcvData } from './ohlcvData';
import * as path from 'path';
import { CHART_WIDTH, MACD_CHART_HEIGHT, PRIMARY_CHART_HEIGHT, RSI_CHART_HEIGHT } from './consts';
const sharp = require('sharp');

(async () => {
  const chartService = new ChartService();
  const imageService = new ImageService();

  // Token and TimeFrame
  const tokenName = 'HAT';
  const timeFrame = '1m';

  // Width and Height
  const width = CHART_WIDTH;
  const height = PRIMARY_CHART_HEIGHT + RSI_CHART_HEIGHT + MACD_CHART_HEIGHT;

  try {
    // Generate chart using OHLCV data
    const chartImagesByBuffer = await chartService.generateChart(ohlcvData, width, height);
    const outputPath = path.resolve(process.cwd(), 'output.png'); // Use project root
    const chartImage = await imageService.combineImagesVertically(chartImagesByBuffer, width, height);
    const finalImage = await imageService.addTextToImage(chartImage, getChatData(ohlcvData).data, tokenName, timeFrame, {});
    await sharp(finalImage).toFile(outputPath);
    console.log("Generated the output.png");
  } catch (error) {
    console.error('Error generating chart:', error);
  }
})();

import { ChartService } from './chartService';
import { ohlcvData } from './ohlcvData';
import * as fs from 'fs';
import * as path from 'path';

(async () => {
  const service = new ChartService();

  // Token and Timeframe
  const tokenName = 'HAT';
  const timeframe = '1m';

  try {
    // Generate chart using OHLCV data
    const chart = await service.generateChart(ohlcvData, tokenName, timeframe);

    // Save chart to a file in the project root
    const outputPath = path.resolve(process.cwd(), 'output.png'); // Use project root
    fs.writeFileSync(outputPath, chart);

    console.log(`Chart generated: ${outputPath}`);
  } catch (error) {
    console.error('Error generating chart:', error);
  }
})();

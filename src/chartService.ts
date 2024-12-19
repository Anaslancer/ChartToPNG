// chartService.ts

import puppeteer from 'puppeteer';
import { OHLCV } from '../types';

export class ChartService {
  async generateChart(data: OHLCV[], tokenName: string, timeframe: string): Promise<Buffer> {
    let browser
    try {
        browser = await puppeteer.launch({
        headless: true,
        channel: 'chrome',
        executablePath: process.platform === 'win32'
          ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
          : '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      // Sort and map incoming data
      const chartData = data
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(item => ({
          time: item.timestamp,  // Ensure this is a valid time (UTCTimestamp)
          open: Number(item.open),
          high: Number(item.high),
          low: Number(item.low),
          close: Number(item.close),
          volume: Number(item.volume)
        }));

      // Compute RSI
      function calculateRSI(data: { time: number; close: number; }[], period = 14) {
        const closes = data.map(d => d.close);
        const gains: number[] = [];
        const losses: number[] = [];
        const rsiData: { time: number; value: number }[] = [];

        for (let i = 1; i < closes.length; i++) {
          const diff = closes[i] - closes[i - 1];
          gains.push(diff > 0 ? diff : 0);
          losses.push(diff < 0 ? Math.abs(diff) : 0);
        }

        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

        for (let i = period; i < closes.length; i++) {
          avgGain = ((avgGain * (period - 1)) + gains[i - 1]) / period;
          avgLoss = ((avgLoss * (period - 1)) + losses[i - 1]) / period;

          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          const rsi = 100 - (100 / (1 + rs));

          rsiData.push({
            time: data[i].time,
            value: rsi
          });
        }

        return rsiData;
      }

      // Compute MACD
      function calculateMACD(data: { time: number; close: number; }[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const scaledCloses = data.map(d => d.close);
        
        function ema(values: number[], period: number) {
          const k = 2 / (period + 1);
          let emaVal = values[0];
          const result = [emaVal];
          for (let i = 1; i < values.length; i++) {
            emaVal = values[i] * k + emaVal * (1 - k);
            result.push(emaVal);
          }
          return result;
        }

        const slowEma = ema(scaledCloses, slowPeriod);
        const fastEma = ema(scaledCloses, fastPeriod);

        const macdLine: number[] = [];
        for (let i = 0; i < slowEma.length; i++) {
          if (fastEma[i] !== undefined) {
            macdLine.push(fastEma[i] - slowEma[i]);
          }
        }

        const signalLine = ema(macdLine.slice(slowPeriod - fastPeriod), signalPeriod); 
        // Adjust indices if needed
        // macdLine starts at index (slowPeriod - 1)
        // We'll consider data from slowPeriod-1 to end for MACD

        const start = slowPeriod - 1; // first MACD value index in original data
        const macdData: { time: number; value: number }[] = [];
        const signalData: { time: number; value: number }[] = [];
        const histogramData: { time: number; value: number; color: string }[] = [];

        for (let i = start + signalPeriod; i < data.length; i++) {
          const macdValue = macdLine[i - start];
          const signalValue = signalLine[i - (start + signalPeriod)];
          const hist = macdValue - signalValue;

          macdData.push({ time: data[i].time, value: macdValue });
          signalData.push({ time: data[i].time, value: signalValue });
          histogramData.push({
            time: data[i].time,
            value: hist,
            color: hist >= 0 ? '#26a69a' : '#ef5350',
          });
        }

        return { macdData, signalData, histogramData };
      }

      const rsiData = calculateRSI(chartData);
      const macdResults = calculateMACD(chartData);

      // Align all data sets by time
      const fullTimeArray = chartData.map(d => d.time);

      // Convert RSI, MACD, Signal, Histogram into maps for quick lookup
      const rsiMap = new Map(rsiData.map(d => [d.time, d.value]));

      const macdMap = new Map(macdResults.macdData.map(d => [d.time, d.value]));
      const signalMap = new Map(macdResults.signalData.map(d => [d.time, d.value]));
      const histMap = new Map(macdResults.histogramData.map(d => [d.time, { value: d.value, color: d.color }]));

      const alignedRsiData = fullTimeArray.map(t => {
        if (rsiMap.has(t)) {
          return { time: t, value: rsiMap.get(t)! };
        } else {
          // Whitespace if RSI not available at this time
          return { time: t };
        }
      });

      const alignedMacdData = fullTimeArray.map(t => {
        return { time: t, value: macdMap.has(t) ? macdMap.get(t)! : NaN };
      });

      const alignedSignalData = fullTimeArray.map(t => {
        return { time: t, value: signalMap.has(t) ? signalMap.get(t)! : NaN };
      });

      const alignedHistogramData = fullTimeArray.map(t => {
        if (histMap.has(t)) {
          const entry = histMap.get(t)!;
          return { time: t, value: entry.value, color: entry.color };
        } else {
          return { time: t, value: NaN };
        }
      });

      await page.setContent(
        `<!DOCTYPE html>
        <html>
          <head>
            <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
            <style>
              body {
                background-color: #131722;
                margin: 0;
                padding: 20px;
              }
              .chart-container {
                display: flex;
                flex-direction: column;
                gap: 4px;
                width: 1200px;
              }
              .chart-section {
                position: relative;
                background-color: #131722;
              }
              .chart-title {
                position: absolute;
                left: 12px;
                top: 12px;
                z-index: 2;
                color: #787B86;
                font-size: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
              }
              .price-info {
                display: inline-block;
                margin-left: 12px;
              }
              .value {
                color: #ef5350;
              }
              #price_chart { height: 600px; }
              #rsi_chart { height: 100px; }
              #macd_chart { height: 100px; }
            </style>
          </head>
          <body>
            <div class="chart-container">
              <div id="price_chart" class="chart-section">
                <div class="chart-title">
                  ${tokenName} · ${timeframe}, GMGN.AI
                  <span class="price-info">
                    O: <span class="value">${chartData[chartData.length-1].open.toFixed(8)}</span>
                    H: <span class="value">${chartData[chartData.length-1].high.toFixed(8)}</span>
                    L: <span class="value">${chartData[chartData.length-1].low.toFixed(8)}</span>
                    C: <span class="value">${chartData[chartData.length-1].close.toFixed(8)}</span>
                  </span>
                </div>
              </div>
              <div id="rsi_chart" class="chart-section">
                <div class="chart-title">RSI (14)</div>
              </div>
              <div id="macd_chart" class="chart-section">
                <div class="chart-title">MACD (12, 26, 9)</div>
              </div>
            </div>
            <script>
              const chartConfig = {
                width: 1200,
                layout: {
                  background: { color: '#131722' },
                  textColor: '#d1d4dc',
                },
                grid: {
                  vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                  horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
                },
                timeScale: {
                  borderColor: 'rgba(197, 203, 206, 0.8)',
                  timeVisible: true,
                  secondsVisible: false,
                  fixLeftEdge: true,
                  fixRightEdge: true,
                  rightOffset: 20,
                  barSpacing: 2,
                },
                rightPriceScale: {
                  borderColor: 'rgba(197, 203, 206, 0.8)',
                  borderVisible: true,
                  entireTextOnly: true,
                },
              };

              const priceChart = LightweightCharts.createChart(document.getElementById('price_chart'), {
                ...chartConfig,
                height: 600,
                watermark: {
                  text: '@CHAT_AS_PNG',
                  visible: true,
                  fontSize: 48,
                  horzAlign: 'center',
                  vertAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.1)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
                },
                rightPriceScale: {
                  ...chartConfig.rightPriceScale,
                  precision: 6,
                  mode: 0,
                  autoScale: true,
                  scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                  },
                  format: price => price.toFixed(6),
                },
              });

              const mainSeries = priceChart.addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
                priceFormat: {
                  type: 'custom',
                  formatter: price => price.toFixed(6),
                  minMove: 0.000001,
                },
              });

              const volumeSeries = priceChart.addHistogramSeries({
                color: '#26a69a',
                priceFormat: { type: 'volume' },
                priceScaleId: ''
              });

              priceChart.priceScale('').applyOptions({
                scaleMargins: {
                  top: 0.8,
                  bottom: 0,
                },
              });

              const rsiChart = LightweightCharts.createChart(document.getElementById('rsi_chart'), {
                ...chartConfig,
                height: 100,
                rightPriceScale: {
                  ...chartConfig.rightPriceScale,
                  scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                  },
                },
              });
              const rsiSeries = rsiChart.addLineSeries({
                color: '#2962FF',
                lineWidth: 2,
              });

              const macdChart = LightweightCharts.createChart(document.getElementById('macd_chart'), {
                ...chartConfig,
                height: 100,
                rightPriceScale: {
                  ...chartConfig.rightPriceScale,
                  scaleMargins: {
                    top: 0.3,
                    bottom: 0.25,
                  },
                  format: '{value}',
                  precision: 8,
                },
              });

              const macdLineSeries = macdChart.addLineSeries({
                color: '#2962FF',
                lineWidth: 2,
                title: 'MACD',
              });

              const signalLineSeries = macdChart.addLineSeries({
                color: '#FF6B6B',
                lineWidth: 2,
                title: 'Signal',
              });

              const histogramSeries = macdChart.addHistogramSeries({
                title: 'Histogram',
              });

              const chartData = ${JSON.stringify(chartData)};
              const alignedRsiData = ${JSON.stringify(alignedRsiData)};
              const alignedMacdData = ${JSON.stringify(alignedMacdData)};
              const alignedSignalData = ${JSON.stringify(alignedSignalData)};
              const alignedHistogramData = ${JSON.stringify(alignedHistogramData)};

              mainSeries.setData(chartData);
              volumeSeries.setData(chartData.map(item => ({
                time: item.time,
                value: item.volume,
                color: item.close >= item.open ? '#26a69a' : '#ef5350'
              })));

              rsiSeries.setData(alignedRsiData);
              macdLineSeries.setData(alignedMacdData);
              signalLineSeries.setData(alignedSignalData);
              histogramSeries.setData(alignedHistogramData);

              const charts = [priceChart, rsiChart, macdChart];
              charts.forEach(chart => {
                chart.timeScale().fitContent();
              });

              // Sync visible range across all charts
              charts.forEach((chart, index) => {
                chart.timeScale().subscribeVisibleTimeRangeChange(() => {
                  const timeRange = chart.timeScale().getVisibleRange();
                  if (!timeRange) return;
                  charts.forEach((otherChart, otherIndex) => {
                    if (index !== otherIndex) {
                      otherChart.timeScale().setVisibleRange(timeRange);
                    }
                  });
                });
              });
            </script>
          </body>
        </html>`
      );

      await new Promise(resolve => setTimeout(resolve, 3500));

      const screenshot = await page.screenshot({
        encoding: 'binary',
        type: 'png',
        fullPage: true
      });

      return Buffer.from(screenshot as Buffer);
    } catch (error: any) {
      const e: any = new Error(`Failed to generate chart: ${error.message}`);
      e.statusCode = 500;
      throw e;
    } finally {
      if (browser) await browser.close();
    }
  }
}
import { createCanvas } from "canvas";
import { createChart, HorzAlign, LineStyle, Time, VertAlign } from 'lightweight-charts';
const { JSDOM } = require('jsdom');
const sharp = require('sharp');
import { OHLCV } from '../types';

const Consts = {
  WATER_MARK_TITLE: "ZZZ",
  WATER_MARK_FONT_FAMILY: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
  
  PRIMARY_CHART_HEIGHT: 600,
  RSI_CHART_HEIGHT: 100,
  MACD_CHART_HEIGHT: 100,
  CHART_WIDTH: 1200,
  CHART_PADDING_HEIGHT: 12,
  CHART_PADDING_LEFT: 20,
  CHART_PADDING_RIGHT: 4,
  CHART_ITEM_GAP: 4,
  
  CHART_RIGHT_PANEL_WIDTH: 70,
  
  TITLE_FONT_SIZE: 12,
  TITLE_FONT_FAMILY: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
  TITLE_FONT_COLOR: '#787B86',
  TITLE_VALUE_FONT_COLOR: '#ef5350',
  
  CHART_BACKGROUND_COLOR: '#131722',
  CHART_TEXT_COLOR: '#d1d4dc',
};

const totalWidth = Consts.CHART_WIDTH;
const totalHeight = Consts.PRIMARY_CHART_HEIGHT + Consts.RSI_CHART_HEIGHT + Consts.MACD_CHART_HEIGHT;

const chartWidth = totalWidth - Consts.CHART_PADDING_LEFT - Consts.CHART_PADDING_RIGHT;

const tops = [
  Consts.CHART_PADDING_HEIGHT, 
  Consts.PRIMARY_CHART_HEIGHT + (Consts.CHART_ITEM_GAP / 2), 
  Consts.PRIMARY_CHART_HEIGHT + Consts.RSI_CHART_HEIGHT + (Consts.CHART_ITEM_GAP / 2)
];

export const getChatData = (data: OHLCV[]) => {
  // Sort and map incoming data
  const chartData = data
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(item => ({
      time: item.timestamp as Time,
      open: Number(item.open),
      high: Number(item.high),
      low: Number(item.low),
      close: Number(item.close),
      volume: Number(item.volume)
    }));

  // Compute RSI
  function calculateRSI(data: { time: Time; close: number; }[], period = 14) {
    const closes = data.map(d => d.close);
    const gains: number[] = [];
    const losses: number[] = [];
    const rsiData: { time: Time; value: number }[] = [];

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
  function calculateMACD(data: { time: Time; close: number; }[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
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

    const start = slowPeriod - 1; // first MACD value index in original data
    const macdData: { time: Time; value: number }[] = [];
    const signalData: { time: Time; value: number }[] = [];
    const histogramData: { time: Time; value: number; color: string }[] = [];

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

  return {
    data: chartData,
    rsi: alignedRsiData,
    macd: alignedMacdData,
    signal: alignedSignalData,
    histogram: alignedHistogramData
  };
};

export class ChartService {
  async generateChart(data: OHLCV[], tokenName: string, timeFrame: string) {
    const chartImagesByBuffer = await this.generateChartImage(data);
    const chartImage = await this.combineImagesVertically(chartImagesByBuffer);
    const finalImage = await this.addTextToImage(chartImage, getChatData(data).data, tokenName, timeFrame, {});
    return finalImage;
  }

  async generateChartImage(data: OHLCV[]) {
    try {
      const setSystemConfigure = (dom: any) => {
        const window = global.window = dom.window;
        globalThis.window = window;
        globalThis.document = window.document;
        globalThis.navigator = {
          userAgent: "node.js",
          clipboard: undefined,
          credentials: undefined,
          doNotTrack: null,
          geolocation: undefined,
          hardwareConcurrency: 4,
          language: "en-US",
          languages: ["en-US"],
          maxTouchPoints: 0,
          mediaCapabilities: undefined,
          mediaDevices: undefined,
          onLine: true,
          permissions: undefined,
          platform: "Win32",
          product: "Gecko",
          productSub: "20030107",
          serviceWorker: undefined,
          storage: undefined,
          userActivation: undefined,
          vendor: "Google Inc.",
          vendorSub: "",
          webdriver: false,
          deviceMemory: 8,
        } as unknown as Navigator; 
        globalThis.location = window.location;
        
        window.matchMedia = (str: string) => {
          const ddpx = str.split('all and (resolution: ')[1].split('dppx)')[0];
          return {
            matches: true,
            media: 'all and (resolution: ' + ddpx + 'dppx)',
            addListener: () => {},
          };
        }
  
        global.document = dom.window.document;
      };

      const createDom = (height: number) => {
        return new JSDOM(
          `
            <!DOCTYPE html>
            <div style="height: ${height}px;" id="ChatContainer">
              <div id="price_chart" class="chart-section"></div>
              <div id="rsi_chart" class="chart-section"></div>
              <div id="macd_chart" class="chart-section"></div>
            </div>
          `,
          {
            pretendToBeVisual: true,
            url: "http://localhost/",
          }
        );
      };

      const getChartConfig = () => (
        {
          layout: {
            background: { color: Consts.CHART_BACKGROUND_COLOR },
            textColor: Consts.CHART_TEXT_COLOR,
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
        }
      );

      const getChartWaterMark = () => (
        {
          text: Consts.WATER_MARK_TITLE,
          visible: true,
          fontSize: 48,
          horzAlign: 'center' as HorzAlign,
          vertAlign: 'center' as VertAlign,
          color: 'rgba(255, 255, 255, 0.1)',
          fontFamily: Consts.WATER_MARK_FONT_FAMILY,
        }
      );

      const base64ToBuffer = (base64String: string) => {
        const base64Data = base64String.replace(/^data:image\/png;base64,/, '');
        return Buffer.from(base64Data, 'base64');
      };

      const chartData = getChatData(data);
      const dom = createDom(totalHeight);
      setSystemConfigure(dom);

      const containerElement = document.getElementById('ChatContainer');
      const chartElement = document.getElementById('price_chart');
      const rsiElement = document.getElementById('rsi_chart');
      const macdElement = document.getElementById('macd_chart');

      if (!containerElement || !chartElement || !rsiElement || !macdElement) return "";

      // Primary (Price) Chart
      const primaryChart = createChart(
        chartElement, 
        {
          ...getChartConfig(),
          width: chartWidth,
          height: Consts.PRIMARY_CHART_HEIGHT - Consts.CHART_PADDING_HEIGHT - (Consts.CHART_ITEM_GAP / 2), 
          watermark: getChartWaterMark(),
          rightPriceScale: {
            ...getChartConfig().rightPriceScale,
            minimumWidth: Consts.CHART_RIGHT_PANEL_WIDTH,
            mode: 0,
            autoScale: true,
            scaleMargins: {
              top: 0.1,
              bottom: 0.1,
            },
          },
          localization: { locale: 'en-US' },
        }
      );

      const mainSeries = primaryChart.addCandlestickSeries({
        upColor: '#88d693',
        downColor: '#f04866',
        borderVisible: false,
        wickUpColor: '#88d693',
        wickDownColor: '#f04866',
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => price.toFixed(6),
          minMove: 0.000001,
        },
      });

      const volumeSeries = primaryChart.addHistogramSeries({
        color: '#22ab94',
        priceFormat: { type: 'volume' },
        priceScaleId: ''
      });

      primaryChart.priceScale('').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      // RSI Chart
      const rsiChart = createChart(rsiElement, {
        ...getChartConfig(),
        width: chartWidth,
        height: Consts.RSI_CHART_HEIGHT - Consts.CHART_ITEM_GAP,
        rightPriceScale: {
          ...getChartConfig().rightPriceScale,
          minimumWidth: Consts.CHART_RIGHT_PANEL_WIDTH,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        localization: { locale: 'en-US' },
      });

      // Add a baseline series for RSI background shading
      const rsiBackgroundSeries = rsiChart.addBaselineSeries({
        baseValue: { type: 'price', price: 30 },
        topLineColor: 'transparent',
        bottomLineColor: 'transparent',
        topFillColor1: '#1c1823',
        topFillColor2: '#1c1823',
        bottomFillColor1: 'transparent',
        bottomFillColor2: 'transparent',
        lineWidth: 1,
      });

      // Hide last value and price line from baseline
      rsiBackgroundSeries.applyOptions({
        lastValueVisible: false,
        priceLineVisible: false,
      });

      const rsiSeries = rsiChart.addLineSeries({
        color: '#8054c4',
        lineWidth: 2,
        priceLineVisible: false,
      });

      [30, 50, 70].forEach(v => {
        rsiSeries.createPriceLine({
          price: v,
          color: '#8054c499',
          axisLabelVisible: false,
          lineWidth: 1,
          lineStyle: LineStyle.LargeDashed,
        });
      });

      // MACD Chart
      const macdChart = createChart(macdElement, {
        ...getChartConfig(),
        width: chartWidth,
        height: Consts.MACD_CHART_HEIGHT - Consts.CHART_ITEM_GAP,
        rightPriceScale: {
          ...getChartConfig().rightPriceScale,
          minimumWidth: Consts.CHART_RIGHT_PANEL_WIDTH,
          scaleMargins: {
            top: 0.3,
            bottom: 0.25,
          },
        },
        localization: { locale: 'en-US' },
      });

      const macdLineSeries = macdChart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
        title: 'MACD',
      });

      const signalLineSeries = macdChart.addLineSeries({
        color: '#22ab94',
        lineWidth: 2,
        title: 'Signal',
      });

      const histogramSeries = macdChart.addHistogramSeries({
        title: 'Histogram',
      });

      // Set chart data
      mainSeries.setData(chartData.data);
      volumeSeries.setData(chartData.data.map(item => ({
        time: item.time,
        value: item.volume,
        color: item.close >= item.open ? '#26a69a' : '#ef5350'
      })));

      rsiSeries.setData(chartData.rsi);
      macdLineSeries.setData(chartData.macd);
      signalLineSeries.setData(chartData.signal);
      histogramSeries.setData(chartData.histogram);

      // Set baseline series data for RSI shading (flat line at RSI=70)
      const rsiBackgroundData = chartData.rsi.map(d => ({
        time: d.time,
        value: 70,
      }));
      rsiBackgroundSeries.setData(rsiBackgroundData);

      [primaryChart, rsiChart, macdChart].forEach(c => c.timeScale().fitContent());
      [primaryChart, rsiChart, macdChart].forEach((c, index) => {
        c.timeScale().subscribeVisibleTimeRangeChange(() => {
          const timeRange = c.timeScale().getVisibleRange();
          if (!timeRange) return;
          [primaryChart, rsiChart, macdChart].forEach((otherChart, otherIndex) => {
            if (index !== otherIndex) {
              otherChart.timeScale().setVisibleRange(timeRange);
            }
          });
        });
      });

      // Take screenshots of each chart and convert to buffers
      return [primaryChart, rsiChart, macdChart]
        .map(chart => chart.takeScreenshot().toDataURL("image/png"))
        .map(base64ToBuffer);
    } catch (error: any) {
      const e: any = new Error(`Failed to generate chart: ${error.message}`);
      e.statusCode = 500;
      throw e;
    } finally {
      // if (dom) await dom.close();
    }
  }

  async addTextToImage(baseImageBuffer: any, chartData: any, tokenName: string, timeFrame: string, options: any) {
    const {
      width = Consts.CHART_WIDTH,
      height = Consts.PRIMARY_CHART_HEIGHT + Consts.RSI_CHART_HEIGHT + Consts.MACD_CHART_HEIGHT,
      fontSize = Consts.TITLE_FONT_SIZE,
      fontColor = Consts.TITLE_FONT_COLOR,
      textX = Consts.CHART_PADDING_LEFT + 12,
      textY = 20,
      fontFamily = Consts.TITLE_FONT_FAMILY,
    } = options;

    const textYs = [tops[0] + textY, tops[1] + textY, tops[2] + textY];
    const texts = [
      `${tokenName} · ${timeFrame}, GMGN.AI`,
      'RSI (14)',
      'MACD (12, 26, 9)',
    ];
    const lastChatData = chartData[chartData.length-1];
    const valueLabels = ['O:', 'H:', 'L:', 'C:'];
    const valueTexts = [
      lastChatData.open.toFixed(8), 
      lastChatData.high.toFixed(8), 
      lastChatData.low.toFixed(8), 
      lastChatData.close.toFixed(8)
    ];
  
    // Create a canvas to draw the text
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
  
    // Set background color to transparent
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, width, height);
  
    context.font = `${fontSize}px ${fontFamily}`;

    for (let i = 0; i < texts.length; i ++) {
      context.fillStyle = fontColor;
      context.fillText(texts[i], textX, textYs[i]);
    }

    // Remove the static rectangle overlay logic previously used for RSI background
    // No more context.fillStyle = 'rgba(128, 84, 196, 0.1)'; or fillRect here

    // Adjust value label positions as needed
    const startX = texts[0].length * 7;
    const gap = 16;
    const valueWidth = valueTexts[0].length * 8;

    for (let i = 0; i < valueLabels.length; i ++) {
      context.fillStyle = fontColor;
      context.fillText(valueLabels[i], textX + startX + (valueWidth * i) + 4 * i, textYs[0]);
      context.fillStyle = Consts.TITLE_VALUE_FONT_COLOR;
      context.fillText(valueTexts[i], textX + startX + gap + (valueWidth * i) + 4 * i, textYs[0]);
    }

    // Convert the canvas to a buffer
    const textOverlayBuffer = canvas.toBuffer('image/png');
  
    // Combine the base image and the text overlay
    const finalImage = await sharp(await baseImageBuffer.png().toBuffer())
      .composite([{ input: textOverlayBuffer, blend: 'over' }])
      .png()
      .toBuffer();
  
    return finalImage;
  }

  async combineImagesVertically(imagePaths: any) {
    try {
      // Combine images vertically
      return await sharp({
        create: {
          width: totalWidth,
          height: totalHeight,
          channels: 3,
          background: { r: 19, g: 23, b: 34 }
        }
      })
      .composite(imagePaths.map((img: any, i: number) => ({
        input: img,
        top: tops[i],
        left: Consts.CHART_PADDING_LEFT,
      })));
    } catch (err) {
      console.error('Error combining images:', err);
    }
  }
}

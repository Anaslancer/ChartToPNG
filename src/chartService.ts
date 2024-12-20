const { JSDOM } = require('jsdom');
import { createChart, HorzAlign, Time, VertAlign } from 'lightweight-charts';
import { OHLCV } from '../types';
import { CHART_BACKGROUND_COLOR, CHART_ITEM_GAP, CHART_PADDING_HEIGHT, CHART_PADDING_LEFT, CHART_PADDING_RIGHT, CHART_TEXT_COLOR, MACD_CHART_HEIGHT, PRIMARY_CHART_HEIGHT, RSI_CHART_HEIGHT, WATER_MARK_FONT_FAMILY, WATER_MARK_TITLE } from './consts';

export const getChatData = (data: OHLCV[]) => {
  // Sort and map incoming data
  const chartData = data
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(item => ({
      time: item.timestamp as Time,  // Ensure this is a valid time (UTCTimestamp)
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
    // Adjust indices if needed
    // macdLine starts at index (slowPeriod - 1)
    // We'll consider data from slowPeriod-1 to end for MACD

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
  async generateChart(data: OHLCV[], tokenName: string, timeFrame: string, width: number, height: number) {
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
        } as unknown as Navigator; // Cast it as Navigator to satisfy TypeScript
        globalThis.location = window.location;
        
        window.matchMedia = (str: string) => {
          const ddpx = str.split('all and (resolution: ')[1].split('dppx)')[0];
          return {
            matches: true,
            media: 'all and (resolution: '+ ddpx +'dppx)',
            addListener: () => {},
          };
        }
  
        global.document = dom.window.document;
      };

      const createDom = (chartData: any, height: number) => {
        return new JSDOM(
          `
            <!DOCTYPE html>
            <div style="height: ${height}px;" id="ChatContainer">
              <div id="price_chart" class="chart-section">
              </div>
              <div id="rsi_chart" class="chart-section">
              </div>
              <div id="macd_chart" class="chart-section">
              </div>
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
            background: { color: CHART_BACKGROUND_COLOR },
            textColor: CHART_TEXT_COLOR,
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
          text: WATER_MARK_TITLE,
          visible: true,
          fontSize: 48,
          horzAlign: 'center' as HorzAlign,
          vertAlign: 'center' as VertAlign,
          color: 'rgba(255, 255, 255, 0.1)',
          fontFamily: WATER_MARK_FONT_FAMILY,
        }
      );

      const base64ToBuffer = (base64String: string) => {
        const base64Data = base64String.replace(/^data:image\/png;base64,/, '');  // Remove prefix if present
        return Buffer.from(base64Data, 'base64');
      };

      const chartData = getChatData(data);
      const dom = createDom(chartData.data, height);
      setSystemConfigure(dom);

      console.log("Created dom and set configuration");

      const containerElement = document.getElementById('ChatContainer');
      const chartElement = document.getElementById('price_chart');
      const rsiElement = document.getElementById('rsi_chart');
      const macdElement = document.getElementById('macd_chart');

      if (!containerElement || !chartElement || !rsiElement || !macdElement) return "";

      console.log("Ready to draw main chart");
      const primaryChart = createChart(
        chartElement, 
        {
          ...getChartConfig(),
          width: width - CHART_PADDING_LEFT - CHART_PADDING_RIGHT,
          height: PRIMARY_CHART_HEIGHT - CHART_PADDING_HEIGHT - (CHART_ITEM_GAP / 2), 
          watermark: getChartWaterMark(),
          rightPriceScale: {
            ...getChartConfig().rightPriceScale,
            // precision: 6,
            mode: 0,
            autoScale: true,
            scaleMargins: {
              top: 0.1,
              bottom: 0.1,
            },
            // format: (price: number) => price.toFixed(6),
          },
          localization: { locale: 'en-US' },
        }
      );

      const mainSeries = primaryChart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => price.toFixed(6),
          minMove: 0.000001,
        },
      });

      const volumeSeries = primaryChart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: ''
      });

      primaryChart.priceScale('').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      console.log("Ready to draw RSI chart");
      const rsiChart = createChart(rsiElement, {
        ...getChartConfig(),
        width: width - CHART_PADDING_LEFT - CHART_PADDING_RIGHT,
        height: RSI_CHART_HEIGHT - CHART_ITEM_GAP,
        rightPriceScale: {
          ...getChartConfig().rightPriceScale,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        localization: { locale: 'en-US' },
      });

      const rsiSeries = rsiChart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
      });

      console.log("Ready to draw MACD chart");
      const macdChart = createChart(macdElement, {
        ...getChartConfig(),
        width: width - CHART_PADDING_LEFT - CHART_PADDING_RIGHT,
        height: MACD_CHART_HEIGHT - CHART_ITEM_GAP,
        rightPriceScale: {
          ...getChartConfig().rightPriceScale,
          scaleMargins: {
            top: 0.3,
            bottom: 0.25,
          },
          // format: '{value}',
          // precision: 8,
        },
        localization: { locale: 'en-US' },
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

      console.log("Completed drawing charts");

      // await new Promise(resolve => setTimeout(resolve, 3500));

      return [primaryChart, rsiChart, macdChart].map(chart => chart.takeScreenshot().toDataURL("image/png")).map(base64ToBuffer);
    } catch (error: any) {
      const e: any = new Error(`Failed to generate chart: ${error.message}`);
      e.statusCode = 500;
      throw e;
    } finally {
      // if (dom) await dom.close();
    }
  }
}
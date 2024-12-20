import { createCanvas } from "canvas";
import { CHART_ITEM_GAP, CHART_PADDING_HEIGHT, CHART_PADDING_LEFT, CHART_WIDTH, MACD_CHART_HEIGHT, PRIMARY_CHART_HEIGHT, RSI_CHART_HEIGHT, TITLE_FONT_COLOR, TITLE_FONT_FAMILY, TITLE_FONT_SIZE, TITLE_VALUE_FONT_COLOR } from "./consts";

const sharp = require('sharp');

const tops = [
  CHART_PADDING_HEIGHT, 
  PRIMARY_CHART_HEIGHT + (CHART_ITEM_GAP / 2), 
  PRIMARY_CHART_HEIGHT + RSI_CHART_HEIGHT + (CHART_ITEM_GAP / 2)
];

export class ImageService {
  async addTextToImage(baseImageBuffer: any, chartData: any, tokenName: string, timeFrame: string, options: any) {
    const {
      width = CHART_WIDTH,
      height = PRIMARY_CHART_HEIGHT + RSI_CHART_HEIGHT + MACD_CHART_HEIGHT,
      fontSize = TITLE_FONT_SIZE,
      fontColor = TITLE_FONT_COLOR,
      textX = CHART_PADDING_LEFT + 12,
      textY = 20,
      fontFamily = TITLE_FONT_FAMILY,
    } = options;

    const textYs = [tops[0] + textY, tops[1] + textY, tops[2] + textY];
    const texts = [
      `${tokenName} · ${timeFrame}, GMGN.AI`,
      'RSI (14)',
      'MACD (12, 26, 9)',
    ];
    const lastChatData = chartData[chartData.length-1];
    const valueLabels = ['O:', 'H:', 'L:', 'C:'];
    const valueTexts = [lastChatData.open.toFixed(8), lastChatData.high.toFixed(8), lastChatData.low.toFixed(8), lastChatData.close.toFixed(8)];
  
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

    const startX = 112;
    const gap = 16;
    const valueWidth = 84;

    for (let i = 0; i < valueLabels.length; i ++) {
      context.fillStyle = fontColor;
      context.fillText(valueLabels[i], textX + startX + (valueWidth * i), textYs[0]);
      context.fillStyle = TITLE_VALUE_FONT_COLOR;
      context.fillText(valueTexts[i], textX + startX + gap + (valueWidth * i), textYs[0]);
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
  
  async combineImagesVertically(imagePaths: any/*, outputPath: string*/, width: number, height: number) {
    try {
      // Combine images vertically
      return await sharp({
        create: {
          width: width,  // Set the width you want for the combined image
          height: height,  // Total height (sum of all chart heights)
          channels: 3,  // RGBA
          background: { r: 19, g: 23, b: 34 }
        }
      })
      .composite(imagePaths.map((img: any, i: number) => ({
        input: img,
        top: tops[i],  // Position each image vertically (adjust as needed)
        left: CHART_PADDING_LEFT,
      })));
      // .toFile(outputPath);  // Save the combined image
    } catch (err) {
      console.error('Error combining images:', err);
    }
  }
}
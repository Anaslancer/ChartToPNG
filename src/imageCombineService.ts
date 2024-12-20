import { createCanvas } from "canvas";

const sharp = require('sharp');

export class ImageService {
  async addTextToImage(text: string, options: any) {
    const {
      width = 1224,
      height = 824,
      fontSize = 12,
      fontColor = '#787B86',
      textX = 12,
      textY = 12,
      fontFamily = "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
    } = options;
  
    // Create a canvas to draw the text
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
  
    // Set background color to transparent
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, width, height);
  
    // Draw the text
    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = fontColor;
    context.fillText(text, textX, textY);
  
    // Convert the canvas to a buffer
    const textOverlayBuffer = canvas.toBuffer('image/png');
  
    // Combine the base image and the text overlay
    const finalImage = await sharp({
      create: {
        width: width,  // Set the width you want for the combined image
        height: height,  // Total height (sum of all chart heights)
        channels: 3,  // RGBA
        background: { r: 19, g: 23, b: 34 } // Background color (white)
      }
    })
      .composite([{ input: textOverlayBuffer, blend: 'over' }])
      .toBuffer();
  
    return finalImage;
  }
  
  async combineImagesVertically(imagePaths: any, outputPath: string, width: number, height: number) {
    try {
      // Combine images vertically
      await sharp({
        create: {
          width: width + 24,  // Set the width you want for the combined image
          height: height + 24,  // Total height (sum of all chart heights)
          channels: 3,  // RGBA
          background: { r: 19, g: 23, b: 34 } // Background color (white)
        }
      })
      .composite(imagePaths.map((img: any, i: number) => ({
        input: img,
        top: i === 0 ? 8 : i === 1 ? 612 : 716,  // Position each image vertically (adjust as needed)
        left: 16
      })))
      .toFile(outputPath);  // Save the combined image

      console.log('Combined image saved to', outputPath);
    } catch (err) {
      console.error('Error combining images:', err);
    }
  }
}
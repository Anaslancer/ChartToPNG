"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const chartService_1 = require("./chartService");
const ohlcvData_1 = require("./ohlcvData");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
(async () => {
    const service = new chartService_1.ChartService();
    // Token and Timeframe
    const tokenName = 'HAT';
    const timeframe = '1m';
    try {
        // Generate chart using OHLCV data
        const chart = await service.generateChart(ohlcvData_1.ohlcvData, tokenName, timeframe);
        // Save chart to a file in the project root
        const outputPath = path.resolve(process.cwd(), 'output.png'); // Use project root
        fs.writeFileSync(outputPath, chart);
        console.log(`Chart generated: ${outputPath}`);
    }
    catch (error) {
        console.error('Error generating chart:', error);
    }
})();

// src/types.ts

// Basic token and OHLCV interfaces
export interface TokenInfo {
    contractAddress: string;
    network: string;
  }
  
  export interface OHLCV {
    timestamp: number;  // Unix timestamp
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }
  
  // CoinGecko OHLCV Response
  export interface CoinGeckoOHLCVResponse {
    data: {
      attributes: {
        ohlcv_list: [number, number, number, number, number, number][];
      };
    };
    meta: {
      base: {
        symbol: string;
        name: string;
      };
      quote: {
        symbol: string;
        name: string;
      };
    };
  }
  
  // Pool and token interfaces (from original code)
  export interface PriceChangePercentage {
    m5?: string;
    h1?: string;
    h6?: string;
    h24?: string;
  }
  
  export interface TransactionsCount {
    buys: number;
    sells: number;
    buyers: number;
    sellers: number;
  }
  
  export interface Transactions {
    m5: TransactionsCount;
    m15: TransactionsCount;
    m30: TransactionsCount;
    h1: TransactionsCount;
    h24: TransactionsCount;
  }
  
  export interface VolumeUSD {
    m5: string;
    h1: string;
    h6: string;
    h24: string;
  }
  
  export interface PoolAttributes {
    base_token_price_usd: string;
    base_token_price_native_currency: string;
    quote_token_price_usd: string;
    quote_token_price_native_currency: string;
    base_token_price_quote_token: string;
    quote_token_price_base_token: string;
    address: string;
    name: string;
    pool_created_at: string;
    fdv_usd: string;
    market_cap_usd: string | null;
    price_change_percentage: PriceChangePercentage;
    transactions: Transactions;
    volume_usd: VolumeUSD;
    reserve_in_usd: string;
  }
  
  export interface PoolRelationships {
    base_token: {
      data: {
        id: string;
        type: string;
      }
    };
    quote_token: {
      data: {
        id: string;
        type: string;
      }
    };
    dex: {
      data: {
        id: string;
        type: string;
      }
    };
  }
  
  export interface PoolData {
    id: string;
    type: 'pool';
    attributes: PoolAttributes;
    relationships: PoolRelationships;
  }
  
  export interface TokenAttributes {
    address: string;
    name: string;
    symbol: string;
    image_url?: string;
    coingecko_coin_id?: string;
  }
  
  export interface IncludedTokenData {
    id: string;
    type: 'token';
    attributes: TokenAttributes;
  }
  
  // Used in tokenService
  export interface Pool {
    id: string;
    type: string;
    attributes: {
      address: string;
      reserve_in_usd: string;
      name: string;
      pool_created_at: string;
    };
    relationships: {
      base_token: {
        data: {
          id: string;
        }
      },
      dex: {
        data: {
          id: string;
        }
      }
    }
  }
  
  export interface IncludedToken {
    id: string;
    type: string;
    attributes: {
      address: string;
      name: string;
      symbol: string;
      image_url?: string;
      coingecko_coin_id?: string;
    };
  }
  
  export interface TokenSearchResult {
    contractAddress: string;
    symbol: string;
    name: string;
    network: string;
    poolAddress: string;
    dex: string;
    createdAt: number;
  }
  
  // Route-specific interfaces
  
  // Params for /chart/symbol/:symbol
  export interface ChartSymbolParams {
    symbol: string;
  }
  
  // For contract address route:
  export interface ChartCAParams {
    contractAddress: string;
  }
  
  export interface ChartSymbolQuery {
    timeframe?: string;
  }
  
  export interface ChartResponseData {
    token: {
      contractAddress: string;
      symbol: string;
      name: string;
      network: string;
      poolAddress: string;
      dex: string;
      createdAt: number;
    };
    timeframe: string;
    chartUrl: string;
  }
  
  export interface ChartResponse {
    success: boolean;
    data?: ChartResponseData;
    error?: string;
  }
export interface Asset {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  price: number;
  change24h: number;
  type: 'stock' | 'crypto' | 'cash';
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'deposit' | 'withdraw';
  method: string;
}

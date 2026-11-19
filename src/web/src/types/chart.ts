export interface ChartDataset {
  label?: string;
  data: Array<number | string | null>;
  borderColor?: string;
  backgroundColor?: string | string[];
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  borderWidth?: number;
  [key: string]: unknown;
}

export interface ChartData {
  labels?: Array<string | number>;
  datasets: ChartDataset[];
}

export interface ChartOptions {
  cutout?: string | number;
  plugins?: {
    legend?: {
      position?: 'bottom' | 'left' | 'right' | 'top';
    };
  };
  [key: string]: unknown;
}

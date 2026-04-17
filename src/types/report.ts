// Report types
export interface FarmBaseInfo {
  region: string;
  areaPyeong: number;
  cropName: string;
  cropVariety?: string;
}

export interface GreenhouseSetup {
  houseCount?: number;
  areaPerHousePyeong?: number;
  beeType: string;
  boxesPerHouse: number;
  replacementCycleWeeks: number;
  annualYieldKg: number;
}

export interface EnvironmentData {
  temperature: number;
  humidity: number;
}

export interface ReportRequest {
  farmBaseInfo: FarmBaseInfo;
  greenhouseSetup: GreenhouseSetup;
  environmentData: EnvironmentData;
}

export type FacilityType = 'greenhouse' | 'farmland';

// Report result types
export interface BrandInfo {
  name: string;
  price?: number;
  replacementCycleWeeks?: number;
  activityRate?: number;
  optimalTemperature?: { min: number; max: number };
  features: string[];
}

export interface RevenueAnalysis {
  currentRevenue: number;
  currentYield: number;
  currentRate: number;
  improvedRate: number;
  additionalYield: number;
  additionalRevenue: number;
}

export interface ReportInput {
  crop?: string;
  cropVariety?: string;
  beeBrand?: string;
  boxesPerHouse?: number;
  greenhouseSize?: number;
  hasSmartFarm?: boolean;
  averageTemperature?: number;
  averageHumidity?: number;
  replacementWeeks?: number;
  annualKg?: number;
}

export interface BrandComparison {
  brand1: BrandInfo;
  brand2: BrandInfo;
  brand3?: BrandInfo;
}

export interface ManagementAction {
  title: string;
  target: string;
}

export interface ControlGuide {
  recommendedRange?: string;
  actions?: string[];
}

export interface PollinationManagement {
  placement?: string;
  replacementCycle?: string;
  additionalTips?: string[];
}

export interface ManagementGuide {
  temperatureControl?: ControlGuide;
  humidityControl?: ControlGuide;
  pollinationManagement?: PollinationManagement;
}

export interface RangeValue {
  min: number;
  max: number;
}

export interface EnvironmentRange {
  temperatureRange?: RangeValue;
  humidityRange?: RangeValue;
}

export interface ExpectedRevenue {
  additionalCost?: RangeValue;
  netGainRange?: RangeValue;
  roiPercentRange?: RangeValue;
}

export interface FinalConclusion {
  suitability?: string;
  expectedImprovementRate?: RangeValue;
  expectedAnnualRevenueIncrease?: RangeValue;
}

export interface ReportData {
  revenueAnalysis?: RevenueAnalysis;
  input?: ReportInput;
  brandComparison?: BrandComparison;
  managementActions?: ManagementAction[];
  managementGuide?: ManagementGuide;
  environment?: EnvironmentRange;
  expectedRevenue?: ExpectedRevenue;
  finalConclusion?: FinalConclusion;
}

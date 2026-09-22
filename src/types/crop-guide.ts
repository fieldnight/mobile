export interface CropCategory {
  category: string;
  crops: string[];
}

export interface Pollinator {
  insectType: string;
  durationDays: number;
  inputTiming: string;
  releaseQuantity: string;
  installationSteps: string[];
}

export interface CropGuide {
  name: string;
  category: string;
  menuId: string;
  cntntsNo: string;
  applicableVarieties: string[];
  usagePeriod: string;
  pollinators: Pollinator[];
  precautions: {
    colonyManagement: string[];
    temperature: string[];
    pesticideSafety: string[];
  };
  effectiveness: {
    source: string;
    highlights: string[];
  };
}

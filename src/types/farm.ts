// Farm types
export type CultivationType = 'CONTROLLED' | 'OPEN_FIELD';

export interface UserCropCreateRequest {
  name?: string;
  variety?: string;
  cultivationType: CultivationType;
  cultivationAddress?: string;
  cultivationArea: number;
  plantingDate: string;
}

export interface UserCrop {
  id: number;
  name: string | null;
  variety: string | null;
  cultivationType: CultivationType;
  cultivationAddress: string | null;
  cultivationArea: number;
  plantingDate: string;
  createdAt?: string;
}

export type BoxId = "0201" | "0215" | "0422" | "0427" | "0470";

export type Dims = {
  L: number;
  W: number;
  H: number;
  G: number;
};

export type Stage = {
  title: string;
  detail: string;
  at: number;
};

export type BoxMeta = {
  id: BoxId;
  code: string;
  title: string;
  group: string;
  summary: string;
  selfAssembly: boolean;
  formula: string;
  defaults: Dims;
  stages: Stage[];
};

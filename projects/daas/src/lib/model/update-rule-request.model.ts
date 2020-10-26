export interface UpdateRuleRequestModel {
  id?: string;
  upsert?: boolean;
  filter?: any;
  update: { [K: string]: any };
  return?: string[];
}

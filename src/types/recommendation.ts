import { AssociationList } from "../types";

export interface ListRecommendation {
  list: AssociationList;
  score: number;
  reasons: string[];
}

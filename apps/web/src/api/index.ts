import * as analyticsApi from "./analyticsApi";
import * as authApi from "./authApi";
import * as billsApi from "./billsApi";
import * as jobsApi from "./jobsApi";
import * as reviewApi from "./reviewApi";

export const api = {
  ...authApi,
  ...analyticsApi,
  ...billsApi,
  ...jobsApi,
  ...reviewApi,
};

import axios from "axios";

const client = axios.create({ baseURL: "/api" });

export const getNationalSummary = () => client.get("/districts/summary").then((r) => r.data);
export const getDistrictsMap = () => client.get("/districts/map").then((r) => r.data);
export const getDistricts = () => client.get("/districts").then((r) => r.data);
export const getDistrictForecast = (id, horizonDays = 30) =>
  client.get(`/forecast/${id}`, { params: { horizon_days: horizonDays } }).then((r) => r.data);
export const getClimateContext = () => client.get("/forecast/climate").then((r) => r.data);
export const getDistrictAdvisory = (id) => client.get(`/advisory/${id}`).then((r) => r.data);
export const getAdvisoryFeed = (limit = 12) =>
  client.get("/advisory", { params: { limit } }).then((r) => r.data);

import axios from "axios";

// In dev, Vite proxies /api -> localhost:8000 (see vite.config.js).
// In production there's no dev proxy, so VITE_API_BASE_URL must point at
// the deployed backend's URL (set this as an env var on Render).
const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : "/api";

const client = axios.create({ baseURL });

export const getNationalSummary = () => client.get("/districts/summary").then((r) => r.data);
export const getDistrictsMap = () => client.get("/districts/map").then((r) => r.data);
export const getDistricts = () => client.get("/districts").then((r) => r.data);
export const getDistrictForecast = (id, horizonDays = 30) =>
  client.get(`/forecast/${id}`, { params: { horizon_days: horizonDays } }).then((r) => r.data);
export const getClimateContext = () => client.get("/forecast/climate").then((r) => r.data);
export const getDistrictAdvisory = (id) => client.get(`/advisory/${id}`).then((r) => r.data);
export const getDistrictFarmers = (id) => client.get(`/districts/${id}/farmers`).then((r) => r.data);
export const getAdvisoryFeed = (limit = 12) =>
  client.get("/advisory", { params: { limit } }).then((r) => r.data);

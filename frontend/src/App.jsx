import { useEffect, useState } from "react";
import CursorGlow from "./components/CursorGlow";
import ScrollProgress from "./components/ScrollProgress";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ClimateBar from "./components/ClimateBar";
import RiskMap from "./components/RiskMap";
import ForecastPanel from "./components/ForecastPanel";
import AdvisoryFeed from "./components/AdvisoryFeed";
import ModelStack from "./components/ModelStack";
import Footer from "./components/Footer";
import { getAdvisoryFeed, getClimateContext, getDistrictsMap, getNationalSummary } from "./lib/api";

export default function App() {
  const [summary, setSummary] = useState(null);
  const [climate, setClimate] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [advisoryFeed, setAdvisoryFeed] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    getNationalSummary().then(setSummary);
    getClimateContext().then(setClimate);
    getDistrictsMap().then((data) => {
      setDistricts(data);
      if (data.length) setSelectedId(data[0].district_id);
    });
    getAdvisoryFeed(9).then(setAdvisoryFeed);
  }, []);

  const handleSelect = (id) => {
    setSelectedId(id);
    requestAnimationFrame(() => {
      document.getElementById("forecast")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="relative">
      <div className="noise-overlay" />
      <ScrollProgress />
      <CursorGlow />
      <Navbar />
      <main>
        <Hero summary={summary} climate={climate} />
        <ClimateBar climate={climate} />
        <RiskMap districts={districts} selectedId={selectedId} onSelect={handleSelect} />
        <ForecastPanel districtId={selectedId} />
        <AdvisoryFeed items={advisoryFeed} onSelect={handleSelect} />
        <ModelStack />
      </main>
      <Footer />
    </div>
  );
}

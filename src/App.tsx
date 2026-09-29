import { Route, Routes } from "react-router";
import Home from "./pages/Home";
import IndexTargetCalculator from "./pages/IndexTargetCalculator";
import ChanKline from "./pages/ChanKline";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tools/index-target" element={<IndexTargetCalculator />} />
      <Route path="/tools/chan-kline" element={<ChanKline />} />
    </Routes>
  );
}

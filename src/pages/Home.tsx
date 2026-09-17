import { Link } from "react-router";

type Tool = {
  path: string;
  icon: string;
  title: string;
  desc: string;
  disabled?: boolean;
};

const TOOLS: Tool[] = [
  {
    path: "/tools/index-target",
    icon: "📈",
    title: "指数目标价计算器",
    desc: "由杠杆 ETF 目标价反推指数需要的涨跌幅，支持做多 / 做空方向。",
  },
];

export default function Home() {
  return (
    <div className="home">
      <h1>工具箱</h1>
      <p className="subtitle">选择一个功能开始使用</p>
      <div className="grid">
        {TOOLS.map((t) => (
          <Link
            key={t.path}
            to={t.disabled ? "#" : t.path}
            className={`tool-card${t.disabled ? " disabled" : ""}`}
          >
            <span className="tool-icon">{t.icon}</span>
            <span className="tool-title">{t.title}</span>
            <span className="tool-desc">{t.desc}</span>
            <span className="tool-link">进入 →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

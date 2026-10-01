import React from "react"
import { Mark } from "../ui/Icons"

export function Dashboard() {
  return (
    <div className="dashboard" aria-hidden="true">
      <div className="dash-sidebar">
        <Mark />
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={i === 0 ? "active" : ""} />
        ))}
      </div>
      <div className="dash-main">
        <div className="dash-top">
          <div>
            <small>Good morning</small>
            <b>Operations overview</b>
          </div>
          <span className="avatar">AK</span>
        </div>
        <div className="metric-row">
          <div>
            <small>Active shipments</small>
            <b>248</b>
            <em>+12.4%</em>
          </div>
          <div>
            <small>On-time delivery</small>
            <b>96.8%</b>
            <em>+2.1%</em>
          </div>
          <div>
            <small>Fleet utilization</small>
            <b>84%</b>
            <em>Live</em>
          </div>
        </div>
        <div className="chart-area">
          <div className="chart-heading">
            <b>Shipment performance</b>
            <small>Last 30 days</small>
          </div>
          <svg
            viewBox="0 0 600 180"
            preserveAspectRatio="none"
            aria-label="Performance chart"
          >
            <defs>
              <linearGradient id="chartfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#00CCFF" stopOpacity=".32" />
                <stop offset="1" stopColor="#00CCFF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="area"
              d="M0,150 C70,130 100,145 155,92 C210,40 250,120 315,74 C390,20 420,95 480,58 C530,30 565,45 600,18 L600,180 L0,180Z"
            />
            <path
              className="line"
              d="M0,150 C70,130 100,145 155,92 C210,40 250,120 315,74 C390,20 420,95 480,58 C530,30 565,45 600,18"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

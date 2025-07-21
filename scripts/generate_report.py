#!/usr/bin/env python3
"""Script for generating performance reports from database."""

import sys
import os

sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
)

import argparse
import logging
from datetime import datetime, timedelta
from volatility_filter.database import DatabaseManager
import pandas as pd
import json

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def generate_html_report(db_manager, output_file="volatility_report.html"):
    """Generate comprehensive HTML report."""

    # Get data from database
    logger.info("Fetching data from database...")

    # Performance summaries
    perf_1h = db_manager.get_performance_summary(hours=1)
    perf_24h = db_manager.get_performance_summary(hours=24)
    perf_7d = db_manager.get_performance_summary(hours=168)
    perf_30d = db_manager.get_performance_summary(hours=720)

    # Recent events
    vol_events = db_manager.get_volatility_events()
    recent_trades = db_manager.get_recent_trades(limit=100)

    # Calculate additional statistics
    if len(vol_events) > 0:
        avg_excess = (vol_events["volatility"] / vol_events["threshold"]).mean()
        max_volatility_event = vol_events.loc[vol_events["volatility"].idxmax()]
    else:
        avg_excess = 0
        max_volatility_event = None

    # Create HTML report
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Volatility Filter Report - {
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #34495e;
            margin-top: 30px;
        }}
        .metric-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .metric-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .metric-card h3 {{
            margin: 0 0 10px 0;
            font-size: 1.1em;
            opacity: 0.9;
        }}
        .metric-value {{
            font-size: 2em;
            font-weight: bold;
            margin: 5px 0;
        }}
        .metric-label {{
            font-size: 0.9em;
            opacity: 0.8;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }}
        tr:hover {{
            background-color: #f8f9fa;
        }}
        .warning {{
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }}
        .success {{
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }}
        .chart-placeholder {{
            background-color: #f8f9fa;
            border: 2px dashed #dee2e6;
            padding: 40px;
            text-align: center;
            color: #6c757d;
            border-radius: 5px;
            margin: 20px 0;
        }}
        .timestamp {{
            color: #6c757d;
            font-size: 0.9em;
        }}
        .direction-buy {{
            color: #28a745;
            font-weight: bold;
        }}
        .direction-sell {{
            color: #dc3545;
            font-weight: bold;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Volatility Filter Performance Report</h1>
        <p class="timestamp">Generated: {
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }</p>
        
        <h2>Performance Overview</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <h3>Last Hour</h3>
                <div class="metric-value">{perf_1h["volatility_events"]}</div>
                <div class="metric-label">Volatility Events</div>
                <div style="margin-top: 10px;">
                    <small>Filter Ratio: {perf_1h["filter_ratio"]:.2%}</small>
                </div>
            </div>
            
            <div class="metric-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                <h3>Last 24 Hours</h3>
                <div class="metric-value">{perf_24h["volatility_events"]}</div>
                <div class="metric-label">Volatility Events</div>
                <div style="margin-top: 10px;">
                    <small>Filter Ratio: {perf_24h["filter_ratio"]:.2%}</small>
                </div>
            </div>
            
            <div class="metric-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                <h3>Last 7 Days</h3>
                <div class="metric-value">{perf_7d["volatility_events"]}</div>
                <div class="metric-label">Volatility Events</div>
                <div style="margin-top: 10px;">
                    <small>Filter Ratio: {perf_7d["filter_ratio"]:.2%}</small>
                </div>
            </div>
            
            <div class="metric-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                <h3>Last 30 Days</h3>
                <div class="metric-value">{perf_30d["volatility_events"]}</div>
                <div class="metric-label">Volatility Events</div>
                <div style="margin-top: 10px;">
                    <small>Filter Ratio: {perf_30d["filter_ratio"]:.2%}</small>
                </div>
            </div>
        </div>
        
        <h2>Volatility Statistics (24h)</h2>
        <div class="metric-grid">
            <div class="metric-card" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);">
                <h3>Average Volatility</h3>
                <div class="metric-value">{perf_24h["avg_volatility"]:.4f}</div>
                <div class="metric-label">AR(1) Residual Std</div>
            </div>
            
            <div class="metric-card" style="background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%);">
                <h3>Max Volatility</h3>
                <div class="metric-value">{perf_24h["max_volatility"]:.4f}</div>
                <div class="metric-label">Peak Value</div>
            </div>
            
            <div class="metric-card" style="background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%);">
                <h3>Total Trades</h3>
                <div class="metric-value">{perf_24h["total_trades"]:,}</div>
                <div class="metric-label">Processed</div>
            </div>
        </div>
        
        {
        f'''
        <div class="warning">
            <strong>High Activity Alert!</strong> 
            Average volatility excess: {avg_excess:.2f}x threshold
        </div>
        '''
        if avg_excess > 2
        else ""
    }
        
        <h2>Recent Volatility Events</h2>
        <p>Last 20 threshold breaches:</p>
        <table>
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Direction</th>
                    <th>Volatility</th>
                    <th>Threshold</th>
                    <th>Excess</th>
                </tr>
            </thead>
            <tbody>
    """

    # Add volatility events to table
    for _, event in vol_events.head(20).iterrows():
        excess = event["volatility"] / event["threshold"]
        direction_class = f"direction-{event['direction']}"

        html_content += f"""
                <tr>
                    <td>{event["datetime"]}</td>
                    <td>${event["price"]:,.2f}</td>
                    <td>{event["amount"]:.4f}</td>
                    <td class="{direction_class}">{event["direction"].upper()}</td>
                    <td>{event["volatility"]:.4f}</td>
                    <td>{event["threshold"]:.4f}</td>
                    <td>{excess:.2f}x</td>
                </tr>
        """

    html_content += """
            </tbody>
        </table>
        
        <h2>Visualizations</h2>
        <div class="chart-placeholder">
            <p>Volatility Time Series Chart</p>
            <small>To add interactive charts, integrate with Plotly or Chart.js</small>
        </div>
        
        <div class="chart-placeholder">
            <p>Event Distribution Histogram</p>
            <small>Shows frequency of volatility events by hour of day</small>
        </div>
    """

    # Add maximum volatility event if exists
    if max_volatility_event is not None:
        html_content += f"""
        <h2>Maximum Volatility Event</h2>
        <div class="warning">
            <strong>Highest Volatility Detected:</strong><br>
            Date: {max_volatility_event["datetime"]}<br>
            Price: ${max_volatility_event["price"]:,.2f}<br>
            Volatility: {max_volatility_event["volatility"]:.4f}<br>
            Excess: {max_volatility_event["volatility"] / max_volatility_event["threshold"]:.2f}x threshold
        </div>
        """

    html_content += """
        <h2>Export Options</h2>
        <p>Data from this report can be exported in the following formats:</p>
        <ul>
            <li>CSV: Use <code>python scripts/export_data.py --format csv</code></li>
            <li>JSON: Use <code>python scripts/export_data.py --format json</code></li>
            <li>Excel: Use <code>python scripts/export_data.py --format xlsx</code></li>
        </ul>
        
        <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 0.9em;">
            <p>Deribit Volatility Filter v1.0.0 | AR(1) Process Implementation</p>
        </footer>
    </div>
</body>
</html>
    """

    # Save report
    with open(output_file, "w") as f:
        f.write(html_content)

    logger.info(f"Report saved to: {output_file}")
    return output_file


def generate_json_report(db_manager, output_file="volatility_report.json"):
    """Generate JSON report for programmatic access."""

    # Collect all data
    report_data = {
        "generated_at": datetime.now().isoformat(),
        "performance": {
            "1h": db_manager.get_performance_summary(hours=1),
            "24h": db_manager.get_performance_summary(hours=24),
            "7d": db_manager.get_performance_summary(hours=168),
            "30d": db_manager.get_performance_summary(hours=720),
        },
        "recent_events": db_manager.get_volatility_events()
        .head(100)
        .to_dict("records"),
        "statistics": {
            "total_events": len(db_manager.get_volatility_events()),
            "total_trades": len(
                db_manager.get_recent_trades(table="realtime_trades", limit=100000)
            ),
        },
    }

    # Save JSON
    with open(output_file, "w") as f:
        json.dump(report_data, f, indent=2, default=str)

    logger.info(f"JSON report saved to: {output_file}")
    return output_file


def main():
    parser = argparse.ArgumentParser(
        description="Generate performance report from database"
    )
    parser.add_argument(
        "--format",
        choices=["html", "json", "both"],
        default="html",
        help="Report format",
    )
    parser.add_argument("--output", type=str, help="Output file path")
    parser.add_argument(
        "--db-path", type=str, default="volatility_filter.db", help="Database file path"
    )

    args = parser.parse_args()

    # Connect to database
    db_manager = DatabaseManager(args.db_path)

    # Generate reports
    if args.format in ["html", "both"]:
        output_file = args.output or "volatility_report.html"
        generate_html_report(db_manager, output_file)

    if args.format in ["json", "both"]:
        output_file = args.output or "volatility_report.json"
        generate_json_report(db_manager, output_file)


if __name__ == "__main__":
    main()

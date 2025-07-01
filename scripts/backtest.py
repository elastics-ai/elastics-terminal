#!/usr/bin/env python3
"""Script for running backtests on historical data."""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

import argparse
import logging
from datetime import datetime, timedelta
from volatility_filter.data_fetcher import HistoricalDataFetcher
from volatility_filter.optimizer import VolatilityFilterOptimizer
from volatility_filter.database import DatabaseManager
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_backtest(days=14, window_size=100, save_to_db=True, db_path='volatility_filter.db'):
    """Run backtest on historical data."""
    
    # Fetch historical data
    logger.info(f"Fetching {days} days of historical data...")
    fetcher = HistoricalDataFetcher()
    end_time = int(datetime.now().timestamp() * 1000)
    start_time = end_time - (days * 24 * 60 * 60 * 1000)
    
    trades = fetcher.fetch_trades(
        instrument="BTC-PERPETUAL",
        start_timestamp=start_time,
        end_timestamp=end_time,
        max_trades=50000  # Increase limit for longer backtests
    )
    
    logger.info(f"Fetched {len(trades)} trades")
    
    # Store in database if requested
    if save_to_db:
        db_manager = DatabaseManager(db_path)
        rows = db_manager.insert_historical_trades(trades)
        logger.info(f"Stored {rows} trades in database")
    
    # Run optimization
    logger.info("Running optimization...")
    optimizer = VolatilityFilterOptimizer(window_size=window_size)
    optimizer.prepare_historical_data(trades)
    
    # Test multiple optimization methods
    results = {}
    
    for method in ['grid_search', 'scipy_optimize']:
        logger.info(f"\nOptimization method: {method}")
        optimized_threshold = optimizer.optimize_threshold(method=method)
        
        # Get volatility distribution
        vol_dist = optimizer.get_volatility_distribution()
        
        # Test different thresholds
        test_thresholds = [
            vol_dist['percentiles']['75%'],  # 75th percentile
            vol_dist['percentiles']['80%'],  # 80th percentile
            vol_dist['percentiles']['85%'],  # 85th percentile
            vol_dist['percentiles']['90%'],  # 90th percentile
            vol_dist['percentiles']['95%'],  # 95th percentile
            optimized_threshold              # Optimized value
        ]
        
        # Remove duplicates and sort
        test_thresholds = sorted(list(set(test_thresholds)))
        
        # Compare thresholds
        comparison_df = optimizer.compare_thresholds(test_thresholds)
        results[method] = {
            'optimized_threshold': optimized_threshold,
            'comparison': comparison_df,
            'volatility_distribution': vol_dist
        }
        
        # Print results
        print(f"\n{'='*80}")
        print(f"Method: {method}")
        print(f"Optimized threshold: {optimized_threshold:.4f}")
        print(f"\nVolatility Distribution:")
        print(f"  Mean: {vol_dist['mean']:.4f}")
        print(f"  Std: {vol_dist['std']:.4f}")
        print(f"  Range: {vol_dist['min']:.4f} - {vol_dist['max']:.4f}")
        
        print(f"\nThreshold Comparison:")
        print(comparison_df.to_string(index=False))
        
    # Save optimization results
    optimizer.save_optimization_results()
    
    # Generate summary report
    generate_backtest_report(results, trades, days)
    
    return results


def generate_backtest_report(results, trades, days):
    """Generate a detailed backtest report."""
    
    # Create report
    report = f"""
    Backtest Report
    ===============
    
    Period: {days} days
    Total trades analyzed: {len(trades):,}
    
    Price Statistics:
    - Min: ${min(t['price'] for t in trades):,.2f}
    - Max: ${max(t['price'] for t in trades):,.2f}
    - Mean: ${sum(t['price'] for t in trades) / len(trades):,.2f}
    
    Optimization Results:
    """
    
    for method, res in results.items():
        report += f"""
    
    Method: {method}
    -----------------
    Optimized Threshold: {res['optimized_threshold']:.4f}
    
    Best Performing Threshold:
    """
        best_row = res['comparison'].iloc[0]
        report += f"""
    - Threshold: {best_row['threshold']:.4f}
    - Precision: {best_row['precision']:.3f}
    - Recall: {best_row['recall']:.3f}
    - F1 Score: {best_row['f1_score']:.3f}
    - Positive Rate: {best_row['positive_rate']:.1%}
    """
    
    # Save report
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = f'backtest_report_{timestamp}.txt'
    
    with open(report_file, 'w') as f:
        f.write(report)
        
    logger.info(f"Report saved to: {report_file}")


def main():
    parser = argparse.ArgumentParser(description='Run backtest on historical data')
    parser.add_argument('--days', type=int, default=14, 
                       help='Number of days of historical data to use')
    parser.add_argument('--window', type=int, default=100,
                       help='Window size for rolling calculations')
    parser.add_argument('--no-db', action='store_true',
                       help='Do not save results to database')
    parser.add_argument('--db-path', type=str, default='volatility_filter.db',
                       help='Database file path')
    parser.add_argument('--compare-only', action='store_true',
                       help='Only compare preset thresholds without optimization')
    
    args = parser.parse_args()
    
    logger.info(f"Starting backtest for {args.days} days with window size {args.window}")
    
    if args.compare_only:
        # Quick comparison without full optimization
        fetcher = HistoricalDataFetcher()
        trades = fetcher.fetch_recent_trades(hours=args.days * 24)
        
        optimizer = VolatilityFilterOptimizer(window_size=args.window)
        optimizer.prepare_historical_data(trades)
        
        # Test common thresholds
        thresholds = [0.010, 0.015, 0.020, 0.025, 0.030]
        comparison = optimizer.compare_thresholds(thresholds)
        
        print("\nThreshold Comparison:")
        print(comparison.to_string(index=False))
    else:
        # Run full backtest
        run_backtest(
            days=args.days,
            window_size=args.window,
            save_to_db=not args.no_db,
            db_path=args.db_path
        )


if __name__ == '__main__':
    main()
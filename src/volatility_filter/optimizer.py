"""Module for optimizing volatility filter parameters."""

import numpy as np
import pandas as pd
from statsmodels.tsa.ar_model import AutoReg
from scipy import optimize
from typing import Dict, Any, List, Tuple, Optional
import pickle
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class VolatilityFilterOptimizer:
    """Optimize volatility threshold using historical data."""

    def __init__(self, window_size: int = 100, ar_lag: int = 1):
        self.window_size = window_size
        self.ar_lag = ar_lag
        self.historical_data = None
        self.optimization_results = {}

    def prepare_historical_data(self, trades: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        Prepare historical trade data for backtesting.

        Args:
            trades: List of trade dictionaries

        Returns:
            DataFrame with prepared data
        """
        # Convert to DataFrame
        df = pd.DataFrame(trades)
        df["datetime"] = pd.to_datetime(df["timestamp"], unit="ms")
        df = df.sort_values("timestamp").reset_index(drop=True)

        # Calculate returns
        df["log_return"] = np.log(df["price"] / df["price"].shift(1))
        df = df.dropna()

        # Calculate rolling volatility metrics
        df["realized_vol"] = df["log_return"].rolling(20).std()
        df["volume_usd"] = df["amount"] * df["price"]

        # Mark high volatility periods (for ground truth)
        vol_threshold_percentile = 80  # Top 20% volatility
        df["high_vol"] = df["realized_vol"] > df["realized_vol"].quantile(
            vol_threshold_percentile / 100
        )

        # Calculate additional features
        df["price_change"] = df["price"].pct_change()
        df["volume_ma"] = df["volume_usd"].rolling(20).mean()

        self.historical_data = df
        logger.info(f"Prepared {len(df)} trades for optimization")
        return df

    def calculate_ar_volatility(
        self, returns: np.ndarray, min_size: int = 20
    ) -> List[float]:
        """
        Calculate AR(1) based volatility for a series of returns.

        Args:
            returns: Array of log returns
            min_size: Minimum window size for AR model

        Returns:
            List of volatility values
        """
        volatilities = []

        for i in range(min_size, len(returns)):
            window_returns = returns[max(0, i - self.window_size) : i]

            try:
                if len(window_returns) >= min_size:
                    model = AutoReg(window_returns, lags=self.ar_lag, trend="c")
                    fitted_model = model.fit()
                    residuals = fitted_model.resid

                    if len(residuals) >= 10:
                        vol = np.std(residuals[-10:])
                        volatilities.append(vol)
                    else:
                        volatilities.append(np.nan)
                else:
                    volatilities.append(np.nan)
            except Exception as e:
                logger.debug(f"AR model error at index {i}: {e}")
                volatilities.append(np.nan)

        return volatilities

    def objective_function(
        self, threshold: float, returns: np.ndarray, ground_truth: np.ndarray
    ) -> float:
        """
        Objective function for optimization (maximize F1 score).

        Args:
            threshold: Volatility threshold to test
            returns: Array of log returns
            ground_truth: Boolean array of high volatility periods

        Returns:
            Negative F1 score (for minimization)
        """
        # Calculate AR volatilities
        ar_vols = self.calculate_ar_volatility(returns)

        # Apply threshold
        predictions = np.array(ar_vols) > threshold

        # Remove NaN values
        mask = ~np.isnan(ar_vols)
        predictions = predictions[mask]
        true_labels = ground_truth[-len(predictions) :][mask]

        if len(predictions) == 0 or len(np.unique(true_labels)) < 2:
            return 1.0  # Return worst score

        # Calculate F1 score
        tp = np.sum((predictions == 1) & (true_labels == 1))
        fp = np.sum((predictions == 1) & (true_labels == 0))
        fn = np.sum((predictions == 0) & (true_labels == 1))

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = (
            2 * (precision * recall) / (precision + recall)
            if (precision + recall) > 0
            else 0
        )

        return -f1  # Negative because we minimize

    def optimize_threshold(self, method: str = "grid_search") -> float:
        """
        Optimize the volatility threshold using historical data.

        Args:
            method: Optimization method ('grid_search' or 'scipy_optimize')

        Returns:
            Optimal threshold value
        """
        if self.historical_data is None:
            raise ValueError(
                "No historical data available. Call prepare_historical_data first."
            )

        returns = self.historical_data["log_return"].values
        ground_truth = self.historical_data["high_vol"].values

        logger.info(f"Starting threshold optimization using {method}")

        if method == "grid_search":
            # Grid search
            thresholds = np.linspace(0.001, 0.1, 100)
            scores = []

            for i, threshold in enumerate(thresholds):
                score = -self.objective_function(threshold, returns, ground_truth)
                scores.append(score)

                if i % 20 == 0:
                    logger.debug(
                        f"Grid search progress: {i / len(thresholds) * 100:.0f}%"
                    )

            best_idx = np.argmax(scores)
            best_threshold = thresholds[best_idx]
            best_score = scores[best_idx]

            self.optimization_results = {
                "method": "grid_search",
                "best_threshold": best_threshold,
                "best_f1_score": best_score,
                "all_thresholds": thresholds.tolist(),
                "all_scores": scores,
            }

        elif method == "scipy_optimize":
            # Scipy optimization
            result = optimize.minimize_scalar(
                lambda x: self.objective_function(x, returns, ground_truth),
                bounds=(0.001, 0.1),
                method="bounded",
                options={"maxiter": 100},
            )

            best_threshold = result.x
            best_score = -result.fun

            self.optimization_results = {
                "method": "scipy_optimize",
                "best_threshold": best_threshold,
                "best_f1_score": best_score,
                "optimization_result": {
                    "success": result.success,
                    "nfev": result.nfev,
                    "message": result.message,
                },
            }
        else:
            raise ValueError(f"Unknown optimization method: {method}")

        logger.info(
            f"Optimization complete. Best threshold: {best_threshold:.4f}, F1 score: {best_score:.3f}"
        )
        return best_threshold

    def backtest_threshold(self, threshold: float) -> Dict[str, Any]:
        """
        Backtest a specific threshold on historical data.

        Args:
            threshold: Volatility threshold to test

        Returns:
            Dictionary of performance metrics
        """
        if self.historical_data is None:
            raise ValueError("No historical data available.")

        returns = self.historical_data["log_return"].values
        ar_vols = self.calculate_ar_volatility(returns)

        # Apply threshold
        predictions = np.array(ar_vols) > threshold

        # Calculate metrics
        mask = ~np.isnan(ar_vols)
        predictions = predictions[mask]
        true_labels = self.historical_data["high_vol"].values[-len(predictions) :][mask]

        tp = np.sum((predictions == 1) & (true_labels == 1))
        fp = np.sum((predictions == 1) & (true_labels == 0))
        fn = np.sum((predictions == 0) & (true_labels == 1))
        tn = np.sum((predictions == 0) & (true_labels == 0))

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = (
            2 * precision * recall / (precision + recall)
            if (precision + recall) > 0
            else 0
        )
        accuracy = (tp + tn) / (tp + fp + fn + tn) if (tp + fp + fn + tn) > 0 else 0

        metrics = {
            "threshold": threshold,
            "true_positives": int(tp),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_negatives": int(tn),
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "accuracy": accuracy,
            "total_predictions": len(predictions),
            "positive_rate": np.sum(predictions) / len(predictions)
            if len(predictions) > 0
            else 0,
        }

        return metrics

    def compare_thresholds(self, thresholds: List[float]) -> pd.DataFrame:
        """
        Compare multiple threshold values.

        Args:
            thresholds: List of thresholds to compare

        Returns:
            DataFrame with comparison results
        """
        results = []
        for threshold in thresholds:
            metrics = self.backtest_threshold(threshold)
            results.append(metrics)

        df = pd.DataFrame(results)
        df = df.sort_values("f1_score", ascending=False)
        return df

    def get_volatility_distribution(self) -> Dict[str, Any]:
        """Get statistics about the volatility distribution."""
        if self.historical_data is None:
            raise ValueError("No historical data available.")

        returns = self.historical_data["log_return"].values
        ar_vols = self.calculate_ar_volatility(returns)
        ar_vols_clean = [v for v in ar_vols if not np.isnan(v)]

        if not ar_vols_clean:
            return {}

        return {
            "mean": np.mean(ar_vols_clean),
            "std": np.std(ar_vols_clean),
            "min": np.min(ar_vols_clean),
            "max": np.max(ar_vols_clean),
            "percentiles": {
                "10%": np.percentile(ar_vols_clean, 10),
                "25%": np.percentile(ar_vols_clean, 25),
                "50%": np.percentile(ar_vols_clean, 50),
                "75%": np.percentile(ar_vols_clean, 75),
                "90%": np.percentile(ar_vols_clean, 90),
                "95%": np.percentile(ar_vols_clean, 95),
                "99%": np.percentile(ar_vols_clean, 99),
            },
        }

    def save_optimization_results(
        self, filename: str = "vol_threshold_optimization.pkl"
    ):
        """Save optimization results to file."""
        data = {
            "optimization_results": self.optimization_results,
            "window_size": self.window_size,
            "ar_lag": self.ar_lag,
            "timestamp": datetime.now(),
            "volatility_stats": self.get_volatility_distribution(),
        }

        with open(filename, "wb") as f:
            pickle.dump(data, f)

        logger.info(f"Optimization results saved to {filename}")

    def load_optimization_results(
        self, filename: str = "vol_threshold_optimization.pkl"
    ) -> Dict[str, Any]:
        """Load optimization results from file."""
        with open(filename, "rb") as f:
            data = pickle.load(f)
            self.optimization_results = data["optimization_results"]
            return data

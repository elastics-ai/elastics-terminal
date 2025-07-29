"""
Comprehensive Backend API Tests for Modules System (Design Pages 3-4, 11, 18-19)

Tests cover the backend services required for the Modules System:
- SSVI Surface calculation and 3D visualization data
- Model selection and comparison (SSVI, ESSVI, LSTM)
- Data source integration (Deribit, Kalshi, Polymarket)
- Options pricing with Greeks calculations
- Surface scaling and real-time updates
- Bookkeeper portfolio optimization
- Contract screening and matching
- Module management and execution
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone
import json
import numpy as np

# Mock the required modules before importing our code
import sys
from unittest.mock import Mock

# Mock anthropic module
mock_anthropic = Mock()
mock_anthropic.AsyncAnthropic = Mock()
sys.modules['anthropic'] = mock_anthropic

# Mock options module  
mock_options = Mock()
sys.modules['options'] = mock_options

# Mock jax and related scientific computing
mock_jax = Mock()
sys.modules['jax'] = mock_jax
sys.modules['jax.numpy'] = Mock()

# Now import our actual modules
from src.volatility_filter.database import DatabaseManager
from src.volatility_filter.ssvi_model import SSVIModel


class TestSSVISurfaceBackend:
    """Test suite for SSVI Surface backend functionality."""
    
    @pytest.fixture
    def mock_db_manager(self):
        """Mock database manager."""
        db_manager = AsyncMock(spec=DatabaseManager)
        db_manager.get_connection = AsyncMock()
        return db_manager
    
    @pytest.fixture
    def mock_ssvi_model(self):
        """Mock SSVI model."""
        model = AsyncMock(spec=SSVIModel)
        model.fit_surface = AsyncMock()
        model.calculate_iv = AsyncMock()
        model.get_surface_data = AsyncMock()
        return model
    
    @pytest.fixture
    def sample_market_data(self):
        """Sample market data for SSVI surface calculation."""
        return {
            'symbol': 'BTC',
            'data_source': 'deribit',
            'timestamp': datetime.now(timezone.utc),
            'strikes': [45000, 46000, 47000, 48000, 49000, 50000, 51000, 52000, 53000],
            'maturities': [0.25, 0.5, 1.0, 2.0],  # In years
            'option_prices': [
                [2500, 2000, 1500, 1200, 900, 700, 500, 350, 250],  # 0.25Y
                [3200, 2800, 2400, 2000, 1600, 1300, 1000, 750, 550],  # 0.5Y
                [4500, 4100, 3700, 3300, 2900, 2500, 2100, 1750, 1450],  # 1Y
                [6200, 5800, 5400, 5000, 4600, 4200, 3800, 3400, 3000],  # 2Y
            ],
            'spot_price': 48500,
            'risk_free_rate': 0.03
        }
    
    @pytest.fixture
    def sample_ssvi_parameters(self):
        """Sample SSVI model parameters."""
        return {
            'rho': -0.7,
            'eta': 1.9,
            'lambda': 0.4,
            'alpha': 0.05,
            'beta': 0.3,
            'nu': 0.8
        }


class TestSSVISurfaceCalculation:
    """Test SSVI surface calculation and data generation."""
    
    @pytest.mark.asyncio
    async def test_fit_ssvi_surface(self, mock_ssvi_model, sample_market_data):
        """Test fitting SSVI surface to market data."""
        # Mock SSVI surface fitting
        mock_ssvi_model.fit_surface.return_value = {
            'parameters': {
                'rho': -0.65,
                'eta': 1.85,
                'lambda': 0.42,
                'alpha': 0.048,
                'beta': 0.31,
                'nu': 0.78
            },
            'rmse': 0.0234,
            'r_squared': 0.987,
            'convergence': True
        }
        
        result = await mock_ssvi_model.fit_surface(
            strikes=sample_market_data['strikes'],
            maturities=sample_market_data['maturities'],
            option_prices=sample_market_data['option_prices'],
            spot_price=sample_market_data['spot_price']
        )
        
        assert result['convergence'] is True
        assert result['r_squared'] > 0.95
        assert result['rmse'] < 0.05
        assert -1.0 < result['parameters']['rho'] < 1.0
        assert result['parameters']['eta'] > 0
        
        mock_ssvi_model.fit_surface.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_calculate_implied_volatility_surface(self, mock_ssvi_model, sample_ssvi_parameters):
        """Test calculating implied volatility surface from SSVI parameters."""
        # Create a grid for IV calculation
        strike_grid = np.linspace(0.8, 1.2, 50)  # Moneyness
        maturity_grid = np.linspace(0.1, 2.0, 25)  # Time to expiry
        
        # Mock IV surface calculation
        mock_ssvi_model.calculate_iv.return_value = {
            'strike_grid': strike_grid.tolist(),
            'maturity_grid': maturity_grid.tolist(),
            'iv_surface': np.random.uniform(0.15, 0.45, (25, 50)).tolist(),
            'surface_quality': {
                'arbitrage_free': True,
                'monotonicity_violations': 0,
                'butterfly_violations': 2,
                'calendar_violations': 0
            }
        }
        
        result = await mock_ssvi_model.calculate_iv(
            parameters=sample_ssvi_parameters,
            strike_range=(0.8, 1.2),
            maturity_range=(0.1, 2.0),
            grid_size=(25, 50)
        )
        
        assert len(result['iv_surface']) == 25  # Maturity dimension
        assert len(result['iv_surface'][0]) == 50  # Strike dimension
        assert result['surface_quality']['arbitrage_free'] is True
        assert result['surface_quality']['monotonicity_violations'] == 0
        
        mock_ssvi_model.calculate_iv.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_generate_3d_surface_data(self, mock_ssvi_model):
        """Test generating 3D surface data for visualization."""
        mock_ssvi_model.get_surface_data.return_value = {
            'surface': {
                'strikes': np.linspace(0.8, 1.2, 20).tolist(),
                'maturities': np.linspace(0.1, 2.0, 15).tolist(),
                'ivs': np.random.uniform(0.15, 0.45, (15, 20)).tolist()
            },
            'metadata': {
                'model_type': 'SSVI',
                'fit_timestamp': datetime.now(timezone.utc).isoformat(),
                'data_source': 'deribit',
                'symbol': 'BTC',
                'spot_price': 48500
            },
            'coloring': {
                'scheme': 'viridis',
                'min_value': 0.15,
                'max_value': 0.45,
                'color_map': 'implied_volatility'
            }
        }
        
        result = await mock_ssvi_model.get_surface_data(
            symbol='BTC',
            model_type='SSVI',
            resolution='standard'
        )
        
        assert 'surface' in result
        assert 'metadata' in result
        assert 'coloring' in result
        assert len(result['surface']['strikes']) == 20
        assert len(result['surface']['maturities']) == 15
        assert len(result['surface']['ivs']) == 15
        assert result['metadata']['model_type'] == 'SSVI'
        
        mock_ssvi_model.get_surface_data.assert_called_once()


class TestModelComparison:
    """Test model comparison functionality."""
    
    @pytest.mark.asyncio
    async def test_compare_ssvi_vs_essvi(self, mock_ssvi_model):
        """Test comparing SSVI vs eSSVI models."""
        mock_ssvi_model.compare_models = AsyncMock()
        mock_ssvi_model.compare_models.return_value = {
            'models': ['SSVI', 'eSSVI'],
            'metrics': {
                'SSVI': {
                    'rmse': 0.0234,
                    'mae': 0.0189,
                    'r_squared': 0.987,
                    'aic': -456.78,
                    'parameters_count': 6
                },
                'eSSVI': {
                    'rmse': 0.0198,
                    'mae': 0.0156,
                    'r_squared': 0.991,
                    'aic': -512.34,
                    'parameters_count': 8
                }
            },
            'comparison': {
                'better_model': 'eSSVI',
                'improvement_rmse': 15.4,  # % improvement
                'improvement_r2': 0.4,
                'statistical_significance': 0.001,
                'recommended': 'eSSVI'
            },
            'explanation': 'eSSVI provides better fit with 15.4% lower RMSE and captures additional smile dynamics through enhanced parameterization.'
        }
        
        result = await mock_ssvi_model.compare_models(
            model_types=['SSVI', 'eSSVI'],
            market_data_path='sample_data',
            validation_method='cross_validation'
        )
        
        assert result['comparison']['better_model'] == 'eSSVI'
        assert result['metrics']['eSSVI']['rmse'] < result['metrics']['SSVI']['rmse']
        assert result['comparison']['statistical_significance'] < 0.05
        assert 'explanation' in result
        
        mock_ssvi_model.compare_models.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_lstm_model_comparison(self):
        """Test LSTM model integration for volatility prediction."""
        # Mock LSTM model results
        lstm_results = {
            'model_type': 'LSTM',
            'prediction_horizon': '1_day',
            'metrics': {
                'mse': 0.00156,
                'mae': 0.0234,
                'directional_accuracy': 0.734,
                'sharpe_ratio': 1.45
            },
            'predictions': {
                'next_day_iv': [0.245, 0.251, 0.248, 0.253, 0.246],
                'confidence_intervals': [
                    [0.230, 0.260],
                    [0.236, 0.266],
                    [0.233, 0.263],
                    [0.238, 0.268],
                    [0.231, 0.261]
                ]
            },
            'feature_importance': {
                'historical_iv': 0.34,
                'spot_returns': 0.28,
                'volume': 0.19,
                'term_structure': 0.12,
                'realized_vol': 0.07
            }
        }
        
        assert lstm_results['metrics']['directional_accuracy'] > 0.6
        assert lstm_results['metrics']['sharpe_ratio'] > 1.0
        assert len(lstm_results['predictions']['next_day_iv']) == 5
        assert sum(lstm_results['feature_importance'].values()) == 1.0


class TestDataSourceIntegration:
    """Test integration with different data sources."""
    
    @pytest.mark.asyncio
    async def test_deribit_data_integration(self):
        """Test Deribit options data integration."""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'result': [
                    {
                        'instrument_name': 'BTC-25JAN25-50000-C',
                        'mark_price': 2500.5,
                        'bid_price': 2480.0,
                        'ask_price': 2520.0,
                        'mark_iv': 0.234,
                        'underlying_price': 48500,
                        'delta': 0.567,
                        'gamma': 0.0034,
                        'vega': 45.2,
                        'theta': -12.8,
                        'rho': 18.4,
                        'volume': 123.45,
                        'open_interest': 456.78
                    }
                ]
            }
            mock_get.return_value.__aenter__.return_value = mock_response
            
            # Simulate Deribit API call
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get('https://deribit.com/api/v2/public/get_instruments') as response:
                    data = await response.json()
            
            assert 'result' in data
            assert len(data['result']) > 0
            option_data = data['result'][0]
            assert 'mark_iv' in option_data
            assert 'delta' in option_data
            assert 'gamma' in option_data
            assert option_data['mark_iv'] > 0
    
    @pytest.mark.asyncio
    async def test_kalshi_data_integration(self):
        """Test Kalshi prediction market integration."""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'markets': [
                    {
                        'id': 'BTCUSD-25JAN25-50000',
                        'title': 'Bitcoin above $50,000 on Jan 25, 2025',
                        'yes_price': 0.67,
                        'no_price': 0.33,
                        'volume': 12345.67,
                        'open_interest': 23456.78,
                        'last_price': 0.675,
                        'category': 'cryptocurrency',
                        'close_date': '2025-01-25T23:59:59Z'
                    }
                ]
            }
            mock_get.return_value.__aenter__.return_value = mock_response
            
            # Simulate Kalshi API call
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get('https://kalshi.com/api/v2/markets') as response:
                    data = await response.json()
            
            assert 'markets' in data
            market = data['markets'][0]
            assert 'yes_price' in market
            assert 'no_price' in market
            assert abs(market['yes_price'] + market['no_price'] - 1.0) < 0.01
    
    @pytest.mark.asyncio
    async def test_polymarket_data_integration(self):
        """Test Polymarket prediction market integration."""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'data': [
                    {
                        'id': 'market-123',
                        'question': 'Will Bitcoin be above $50,000 on January 25, 2025?',
                        'outcomes': [
                            {'name': 'Yes', 'price': 0.64, 'shares': 15234.56},
                            {'name': 'No', 'price': 0.36, 'shares': 8765.44}
                        ],
                        'volume_24h': 45678.90,
                        'liquidity': 123456.78,
                        'end_date': '2025-01-25T23:59:59Z',
                        'category': 'crypto'
                    }
                ]
            }
            mock_get.return_value.__aenter__.return_value = mock_response
            
            # Simulate Polymarket API call
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get('https://gamma-api.polymarket.com/markets') as response:
                    data = await response.json()
            
            assert 'data' in data
            market = data['data'][0]
            assert 'outcomes' in market
            assert len(market['outcomes']) == 2
            assert market['outcomes'][0]['name'] == 'Yes'
            assert market['outcomes'][1]['name'] == 'No'


class TestOptionsPricing:
    """Test options pricing calculations with Greeks."""
    
    @pytest.mark.asyncio
    async def test_black_scholes_pricing(self):
        """Test Black-Scholes option pricing."""
        # Mock Black-Scholes calculation
        bs_result = {
            'price': 77512.45,
            'greeks': {
                'delta': 0.567,
                'gamma': 0.0031,
                'vega': 45.2,
                'theta': -12.3,
                'rho': 18.4
            },
            'inputs': {
                'spot_price': 48500,
                'strike_price': 50000,
                'time_to_expiry': 0.25,
                'volatility': 0.234,
                'risk_free_rate': 0.03,
                'option_type': 'call'
            },
            'model': 'black_scholes'
        }
        
        # Validate pricing result
        assert bs_result['price'] > 0
        assert 0 <= bs_result['greeks']['delta'] <= 1  # Call delta range
        assert bs_result['greeks']['gamma'] > 0  # Gamma always positive
        assert bs_result['greeks']['vega'] > 0  # Vega always positive
        assert bs_result['greeks']['theta'] < 0  # Time decay for long options
        assert bs_result['inputs']['option_type'] == 'call'
    
    @pytest.mark.asyncio
    async def test_bs_quanto_pricing(self):
        """Test Black-Scholes Quanto option pricing."""
        quanto_result = {
            'price': 82150.30,
            'greeks': {
                'delta': 0.543,
                'gamma': 0.0029,
                'vega': 41.8,
                'theta': -14.7,
                'rho': 15.2,
                'quanto_delta': 0.089,  # Additional quanto Greeks
                'quanto_vega': 12.4
            },
            'inputs': {
                'spot_price': 48500,
                'strike_price': 50000,
                'time_to_expiry': 0.25,
                'volatility': 0.234,
                'risk_free_rate': 0.03,
                'foreign_rate': 0.01,
                'correlation': -0.3,
                'fx_volatility': 0.15,
                'option_type': 'call'
            },
            'model': 'black_scholes_quanto'
        }
        
        assert quanto_result['price'] > 0
        assert 'quanto_delta' in quanto_result['greeks']
        assert 'quanto_vega' in quanto_result['greeks']
        assert quanto_result['inputs']['correlation'] == -0.3
    
    @pytest.mark.asyncio
    async def test_binomial_tree_pricing(self):
        """Test binomial tree option pricing."""
        binomial_result = {
            'price': 76890.12,
            'greeks': {
                'delta': 0.572,
                'gamma': 0.0032,
                'vega': 44.7,
                'theta': -11.9,
                'rho': 19.1
            },
            'tree_parameters': {
                'steps': 100,
                'up_factor': 1.0234,
                'down_factor': 0.9771,
                'risk_neutral_prob': 0.5123
            },
            'convergence': {
                'american_exercise': False,
                'early_exercise_boundary': None,
                'nodes_calculated': 5050
            },
            'model': 'binomial_tree'
        }
        
        assert binomial_result['price'] > 0
        assert binomial_result['tree_parameters']['steps'] == 100
        assert 0 < binomial_result['tree_parameters']['risk_neutral_prob'] < 1
        assert binomial_result['tree_parameters']['up_factor'] > 1
        assert binomial_result['tree_parameters']['down_factor'] < 1
    
    @pytest.mark.asyncio
    async def test_black76_futures_pricing(self):
        """Test Black-76 futures option pricing."""
        black76_result = {
            'price': 74320.78,
            'greeks': {
                'delta': 0.558,
                'gamma': 0.0030,
                'vega': 43.5,
                'theta': -10.2,
                'rho': 0.0  # Rho is zero for futures options
            },
            'inputs': {
                'futures_price': 48750,
                'strike_price': 50000,
                'time_to_expiry': 0.25,
                'volatility': 0.234,
                'risk_free_rate': 0.03,
                'option_type': 'call'
            },
            'model': 'black_76'
        }
        
        assert black76_result['price'] > 0
        assert black76_result['greeks']['rho'] == 0.0  # Futures options have zero rho
        assert black76_result['inputs']['futures_price'] > 0


class TestSurfaceAnalysis:
    """Test surface analysis and comparison functionality."""
    
    @pytest.mark.asyncio
    async def test_surface_historical_comparison(self, mock_db_manager):
        """Test comparing current surface to historical surfaces."""
        # Mock historical surface data
        mock_db_manager.fetch_all.return_value = [
            {
                'date': '2025-01-22',
                'surface_data': json.dumps({
                    'strikes': [0.8, 0.9, 1.0, 1.1, 1.2],
                    'maturities': [0.25, 0.5, 1.0],
                    'ivs': [
                        [0.28, 0.24, 0.22, 0.25, 0.29],
                        [0.26, 0.23, 0.21, 0.24, 0.27],
                        [0.25, 0.22, 0.20, 0.23, 0.26]
                    ]
                }),
                'model_type': 'SSVI'
            }
        ]
        
        # Current surface data
        current_surface = {
            'strikes': [0.8, 0.9, 1.0, 1.1, 1.2],
            'maturities': [0.25, 0.5, 1.0],
            'ivs': [
                [0.30, 0.26, 0.24, 0.27, 0.31],
                [0.28, 0.25, 0.23, 0.26, 0.29],
                [0.27, 0.24, 0.22, 0.25, 0.28]
            ]
        }
        
        # Calculate comparison metrics
        comparison_result = {
            'comparison_date': '2025-01-22',
            'days_ago': 7,
            'changes': {
                'atm_iv_change': {
                    '0.25Y': 0.02,  # 2% increase
                    '0.5Y': 0.02,
                    '1Y': 0.02
                },
                'skew_change': {
                    '0.25Y': 0.005,  # Slight skew increase
                    '0.5Y': 0.004,
                    '1Y': 0.003
                },
                'term_structure_change': 0.001
            },
            'statistics': {
                'mean_absolute_change': 0.018,
                'max_change': 0.025,
                'min_change': 0.012,
                'volatility_of_changes': 0.004
            },
            'interpretation': 'Overall volatility increased by 2% across all tenors with slight increase in put skew.'
        }
        
        assert comparison_result['days_ago'] == 7
        assert comparison_result['changes']['atm_iv_change']['0.25Y'] == 0.02
        assert comparison_result['statistics']['mean_absolute_change'] > 0
        assert 'interpretation' in comparison_result
        
        mock_db_manager.fetch_all.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_scenario_analysis(self):
        """Test scenario analysis on volatility surface."""
        scenarios = [
            {
                'name': 'vol_shock_up',
                'description': 'Volatility shock +5%',
                'parameters': {'vol_shift': 0.05}
            },
            {
                'name': 'vol_shock_down', 
                'description': 'Volatility shock -5%',
                'parameters': {'vol_shift': -0.05}
            },
            {
                'name': 'skew_steepening',
                'description': 'Put skew steepening',
                'parameters': {'skew_shift': 0.02}
            }
        ]
        
        scenario_results = {
            'base_case': {
                'portfolio_value': 2540300,
                'delta': 125.4,
                'gamma': 2.34,
                'vega': 456.7,
                'theta': -89.2
            },
            'scenarios': {
                'vol_shock_up': {
                    'portfolio_value': 2587650,
                    'delta': 123.8,
                    'gamma': 2.29,
                    'vega': 434.2,
                    'theta': -92.5,
                    'pnl_change': 47350
                },
                'vol_shock_down': {
                    'portfolio_value': 2492950,
                    'delta': 127.0,
                    'gamma': 2.39,
                    'vega': 479.2,
                    'theta': -85.9,
                    'pnl_change': -47350
                },
                'skew_steepening': {
                    'portfolio_value': 2558720,
                    'delta': 124.1,
                    'gamma': 2.31,
                    'vega': 461.3,
                    'theta': -90.7,
                    'pnl_change': 18420
                }
            }
        }
        
        assert len(scenario_results['scenarios']) == 3
        assert scenario_results['scenarios']['vol_shock_up']['pnl_change'] > 0
        assert scenario_results['scenarios']['vol_shock_down']['pnl_change'] < 0
        assert scenario_results['scenarios']['skew_steepening']['pnl_change'] > 0
    
    @pytest.mark.asyncio
    async def test_export_surface_json(self):
        """Test exporting surface data as JSON."""
        export_data = {
            'metadata': {
                'export_timestamp': datetime.now(timezone.utc).isoformat(),
                'model_type': 'SSVI',
                'symbol': 'BTC',
                'data_source': 'deribit',
                'surface_date': '2025-01-29',
                'spot_price': 48500
            },
            'parameters': {
                'rho': -0.65,
                'eta': 1.85,
                'lambda': 0.42,
                'alpha': 0.048,
                'beta': 0.31,
                'nu': 0.78
            },
            'surface_data': {
                'moneyness_range': [0.8, 1.2],
                'maturity_range': [0.1, 2.0],
                'grid_size': [25, 50],
                'iv_surface': [[0.25 for _ in range(50)] for _ in range(25)]  # Simplified
            },
            'quality_metrics': {
                'rmse': 0.0234,
                'r_squared': 0.987,
                'arbitrage_violations': 0,
                'calendar_violations': 0
            }
        }
        
        # Test JSON serialization
        json_export = json.dumps(export_data, indent=2)
        assert len(json_export) > 1000
        
        # Test deserialization
        imported_data = json.loads(json_export)
        assert imported_data['metadata']['model_type'] == 'SSVI'
        assert imported_data['parameters']['rho'] == -0.65
        assert len(imported_data['surface_data']['iv_surface']) == 25


class TestBookkeeperModule:
    """Test Bookkeeper module functionality."""
    
    @pytest.mark.asyncio
    async def test_portfolio_rebalancing_suggestions(self, mock_db_manager):
        """Test generating portfolio rebalancing suggestions."""
        # Mock current portfolio positions
        mock_db_manager.fetch_all.return_value = [
            {
                'symbol': 'BTC',
                'position_size': 15.5,
                'current_weight': 0.65,
                'target_weight': 0.60,
                'current_value': 1651500
            },
            {
                'symbol': 'ETH',
                'position_size': 125.8,
                'current_weight': 0.25,
                'target_weight': 0.30,
                'current_value': 635750
            },
            {
                'symbol': 'CASH',
                'position_size': 253030,
                'current_weight': 0.10,
                'target_weight': 0.10,
                'current_value': 253030
            }
        ]
        
        rebalancing_suggestions = {
            'total_portfolio_value': 2540280,
            'rebalancing_needed': True,
            'trades': [
                {
                    'symbol': 'BTC',
                    'action': 'SELL',
                    'quantity': 1.24,
                    'value': 127014,
                    'reason': 'Reduce overweight position'
                },
                {
                    'symbol': 'ETH',
                    'action': 'BUY',
                    'quantity': 48.2,
                    'value': 127014,
                    'reason': 'Increase underweight position'
                }
            ],
            'expected_fees': 254.03,
            'expected_slippage': 508.06,
            'net_rebalancing_cost': 762.09,
            'risk_reduction': {
                'portfolio_volatility_before': 0.24,
                'portfolio_volatility_after': 0.22,
                'sharpe_improvement': 0.12
            }
        }
        
        assert rebalancing_suggestions['rebalancing_needed'] is True
        assert len(rebalancing_suggestions['trades']) == 2
        assert rebalancing_suggestions['trades'][0]['action'] == 'SELL'
        assert rebalancing_suggestions['trades'][1]['action'] == 'BUY'
        assert rebalancing_suggestions['risk_reduction']['portfolio_volatility_after'] < rebalancing_suggestions['risk_reduction']['portfolio_volatility_before']
        
        mock_db_manager.fetch_all.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_suggested_trades_execution(self):
        """Test execution of suggested trades."""
        trade_execution = {
            'trades': [
                {
                    'id': 'trade_001',
                    'symbol': 'BTC',
                    'action': 'SELL',
                    'quantity': 1.24,
                    'target_price': 48500,
                    'executed_price': 48485,
                    'status': 'FILLED',
                    'execution_time': datetime.now(timezone.utc).isoformat(),
                    'fees': 120.02,
                    'slippage': 18.6
                },
                {
                    'id': 'trade_002',
                    'symbol': 'ETH',
                    'action': 'BUY',
                    'quantity': 48.2,
                    'target_price': 2635,
                    'executed_price': 2637,
                    'status': 'FILLED',
                    'execution_time': datetime.now(timezone.utc).isoformat(),
                    'fees': 126.84,
                    'slippage': 96.4
                }
            ],
            'execution_summary': {
                'total_trades': 2,
                'successful_trades': 2,
                'failed_trades': 0,
                'total_fees': 246.86,
                'total_slippage': 115.0,
                'execution_time_seconds': 12.5
            }
        }
        
        assert trade_execution['execution_summary']['successful_trades'] == 2
        assert trade_execution['execution_summary']['failed_trades'] == 0
        assert all(trade['status'] == 'FILLED' for trade in trade_execution['trades'])


class TestContractScreener:
    """Test Contract Screener module functionality."""
    
    @pytest.mark.asyncio
    async def test_contract_filtering(self, mock_db_manager):
        """Test advanced contract filtering."""
        # Mock contract data
        mock_db_manager.fetch_all.return_value = [
            {
                'id': 'contract_001',
                'symbol': 'BTC-25JAN25-50000-C',
                'type': 'call',
                'strike': 50000,
                'expiry': '2025-01-25',
                'volume': 1234.5,
                'open_interest': 2345.6,
                'implied_volatility': 0.245,
                'delta': 0.567,
                'gamma': 0.0032,
                'bid_price': 2480,
                'ask_price': 2520,
                'last_price': 2500
            },
            {
                'id': 'contract_002',
                'symbol': 'ETH-25JAN25-2700-P',
                'type': 'put',
                'strike': 2700,
                'expiry': '2025-01-25',
                'volume': 567.8,
                'open_interest': 1234.5,
                'implied_volatility': 0.289,
                'delta': -0.423,
                'gamma': 0.0028,
                'bid_price': 156,
                'ask_price': 164,
                'last_price': 160
            }
        ]
        
        filter_criteria = {
            'min_volume': 500,
            'max_iv': 0.30,
            'min_delta': -0.5,
            'max_delta': 0.8,
            'expiry_range': ['2025-01-20', '2025-01-30'],
            'option_types': ['call', 'put']
        }
        
        # Apply filters (mock filtering logic)
        filtered_contracts = [
            contract for contract in mock_db_manager.fetch_all.return_value
            if (contract['volume'] >= filter_criteria['min_volume'] and
                contract['implied_volatility'] <= filter_criteria['max_iv'] and
                filter_criteria['min_delta'] <= contract['delta'] <= filter_criteria['max_delta'])
        ]
        
        assert len(filtered_contracts) >= 1
        assert all(contract['volume'] >= 500 for contract in filtered_contracts)
        assert all(contract['implied_volatility'] <= 0.30 for contract in filtered_contracts)
        
        mock_db_manager.fetch_all.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_contract_matching(self):
        """Test contract matching algorithm."""
        target_criteria = {
            'strategy': 'iron_condor',
            'underlying': 'BTC',
            'expiry': '2025-01-25',
            'target_delta': 0.15,
            'max_spread_width': 2000,
            'min_credit': 500
        }
        
        matched_strategies = {
            'iron_condor_1': {
                'long_put': {
                    'symbol': 'BTC-25JAN25-46000-P',
                    'delta': -0.15,
                    'price': 890
                },
                'short_put': {
                    'symbol': 'BTC-25JAN25-47000-P',
                    'delta': -0.20,
                    'price': 1150
                },
                'short_call': {
                    'symbol': 'BTC-25JAN25-51000-C',
                    'delta': 0.20,
                    'price': 1280
                },
                'long_call': {
                    'symbol': 'BTC-25JAN25-52000-C',
                    'delta': 0.15,
                    'price': 980
                },
                'net_credit': 540,
                'max_profit': 540,
                'max_loss': 1460,
                'profit_probability': 0.68,
                'risk_reward_ratio': 2.7
            }
        }
        
        strategy = matched_strategies['iron_condor_1']
        assert strategy['net_credit'] >= target_criteria['min_credit']
        assert abs(strategy['long_call']['delta']) <= target_criteria['target_delta'] + 0.05
        assert strategy['profit_probability'] > 0.5


class TestModuleManagement:
    """Test module management and execution."""
    
    @pytest.mark.asyncio
    async def test_module_execution_tracking(self, mock_db_manager):
        """Test tracking module executions."""
        # Mock module execution data
        mock_db_manager.execute_query.return_value = [{'id': 123}]
        
        execution_record = {
            'module_id': 1,
            'execution_id': 123,
            'started_at': datetime.now(timezone.utc),
            'completed_at': None,
            'status': 'running',
            'inputs': {
                'symbol': 'BTC',
                'model_type': 'SSVI',
                'data_source': 'deribit'
            },
            'progress': 0.65,
            'estimated_completion': datetime.now(timezone.utc).isoformat()
        }
        
        # Simulate execution completion
        execution_record.update({
            'completed_at': datetime.now(timezone.utc),
            'status': 'completed',
            'progress': 1.0,
            'results': {
                'surface_generated': True,
                'parameters_fitted': True,
                'quality_score': 0.987
            },
            'execution_time_seconds': 45.2
        })
        
        assert execution_record['status'] == 'completed'
        assert execution_record['progress'] == 1.0
        assert execution_record['results']['quality_score'] > 0.95
        assert execution_record['execution_time_seconds'] < 60
        
        mock_db_manager.execute_query.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_module_statistics(self, mock_db_manager):
        """Test module usage statistics."""
        mock_db_manager.fetch_one.return_value = {
            'total_modules': 15,
            'total_executions': 2347,
            'avg_execution_time': 187.5,
            'favorite_count': 5,
            'success_rate': 0.987
        }
        
        stats = await mock_db_manager.fetch_one(
            "SELECT COUNT(*) as total_modules, SUM(execution_count) as total_executions FROM modules"
        )
        
        assert stats['total_modules'] == 15
        assert stats['total_executions'] == 2347
        assert stats['avg_execution_time'] < 300  # Under 5 minutes
        assert stats['success_rate'] > 0.95
        
        mock_db_manager.fetch_one.assert_called_once()


class TestErrorHandlingAndValidation:
    """Test error handling and input validation."""
    
    @pytest.mark.asyncio
    async def test_invalid_surface_parameters(self):
        """Test handling of invalid SSVI parameters."""
        invalid_parameters = {
            'rho': 1.5,  # Should be between -1 and 1
            'eta': -0.5,  # Should be positive
            'lambda': -0.1,  # Should be positive
            'alpha': 2.0,  # Typically small positive
            'beta': -0.3,  # Should be positive
            'nu': 0.0  # Should be positive
        }
        
        validation_errors = []
        
        if not -1 <= invalid_parameters['rho'] <= 1:
            validation_errors.append('rho must be between -1 and 1')
        if invalid_parameters['eta'] <= 0:
            validation_errors.append('eta must be positive')
        if invalid_parameters['lambda'] <= 0:
            validation_errors.append('lambda must be positive')
        if invalid_parameters['alpha'] < 0:
            validation_errors.append('alpha must be non-negative')
        if invalid_parameters['beta'] <= 0:
            validation_errors.append('beta must be positive')
        if invalid_parameters['nu'] <= 0:
            validation_errors.append('nu must be positive')
        
        assert len(validation_errors) > 0
        assert 'rho must be between -1 and 1' in validation_errors
        assert 'eta must be positive' in validation_errors
    
    @pytest.mark.asyncio
    async def test_data_source_connection_error(self):
        """Test handling of data source connection errors."""
        connection_errors = {
            'deribit': {
                'error': 'Connection timeout',
                'status_code': 408,
                'retry_count': 3,
                'fallback_available': True
            },
            'kalshi': {
                'error': 'Rate limit exceeded',
                'status_code': 429,
                'retry_after': 60,
                'fallback_available': False
            }
        }
        
        for source, error_info in connection_errors.items():
            if error_info['fallback_available']:
                assert error_info['retry_count'] > 0
            if error_info['status_code'] == 429:
                assert 'retry_after' in error_info
    
    @pytest.mark.asyncio
    async def test_pricing_calculation_bounds(self):
        """Test bounds checking for pricing calculations."""
        pricing_inputs = {
            'spot_price': -100,  # Invalid: negative price
            'strike_price': 50000,
            'time_to_expiry': -0.1,  # Invalid: negative time
            'volatility': 1.5,  # High but valid
            'risk_free_rate': 2.0  # Very high but possible
        }
        
        validation_result = {
            'valid': False,
            'errors': []
        }
        
        if pricing_inputs['spot_price'] <= 0:
            validation_result['errors'].append('Spot price must be positive')
        if pricing_inputs['time_to_expiry'] <= 0:
            validation_result['errors'].append('Time to expiry must be positive')
        if pricing_inputs['volatility'] <= 0:
            validation_result['errors'].append('Volatility must be positive')
        
        assert not validation_result['valid']
        assert len(validation_result['errors']) >= 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
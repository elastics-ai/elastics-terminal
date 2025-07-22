# Risk Management API Routes


@app.get("/api/risk/overview", response_model=RiskOverview)
async def get_risk_overview() -> RiskOverview:
    """Get comprehensive risk overview for the dashboard."""
    try:
        # Get aggregate Greeks
        async with get_db() as conn:
            cursor = await conn.execute("""
                SELECT 
                    SUM(position_delta) as total_delta,
                    SUM(gamma * quantity * 100) as total_gamma,
                    SUM(vega * quantity * 100) as total_vega,
                    SUM(theta * quantity * 100) as total_theta,
                    SUM(ABS(position_value)) as total_notional
                FROM positions
                WHERE is_active = 1
            """)
            greeks_data = await cursor.fetchone()
            
            aggregate_greeks = AggregateGreeks(
                delta=greeks_data["total_delta"] or 0,
                gamma=greeks_data["total_gamma"] or 0,
                vega=greeks_data["total_vega"] or 0,
                theta=greeks_data["total_theta"] or 0,
                total_notional=greeks_data["total_notional"] or 0
            )
            
        # Calculate VaR and CVaR (simplified - in production use proper risk models)
        var_95 = aggregate_greeks.total_notional * 0.05  # 5% VaR
        var_99 = aggregate_greeks.total_notional * 0.10  # 10% VaR
        cvar_95 = var_95 * 1.5  # Simplified CVaR
        
        # Get strategy health data
        strategy_health = [
            StrategyHealth(
                strategy_name="BTC Momentum Div",
                health_score=76,
                total_returns=48.5,
                exposure=5.2,
                volatility=36.6,
                over_herd=8.0,
                max_drawdown=-18.9,
                exposure_time=91.2,
                alpha=0.024,
                beta=0.84,
                tags=["BTC", "Momentum"]
            ),
            StrategyHealth(
                strategy_name="Prediction Market M",
                health_score=78,
                total_returns=16.3,
                exposure=6.0,
                volatility=22.2,
                over_herd=1.7,
                max_drawdown=-6.8,
                exposure_time=88.0,
                alpha=0.014,
                beta=0.34,
                tags=["Prediction", "Multi-Asset"]
            ),
            StrategyHealth(
                strategy_name="Volatility Trend Global",
                health_score=0,
                active=False,
                total_returns=-21.1,
                exposure=4.0,
                volatility=45.3,
                over_herd=-6.1,
                max_drawdown=-29.1,
                exposure_time=82.5,
                alpha=-0.009,
                beta=1.09,
                tags=["Volatility", "Global"]
            ),
        ]
        
        # Risk breakdowns
        risk_breakdowns = [
            RiskBreakdown(
                factor="BTC: Momentum Returns",
                btc_correlation=0.8,
                eth_correlation=0.3,
                volatility_correlation=0.2,
                spx_correlation=0.1,
                pairs_correlation=0.15
            ),
            RiskBreakdown(
                factor="BTC: Vol Returns Pearson",
                btc_correlation=0.9,
                eth_correlation=0.4,
                volatility_correlation=0.7,
                spx_correlation=0.2,
                pairs_correlation=0.1
            ),
        ]
        
        # Factor trends
        factor_trends = []
        base_date = datetime.now()
        for i in range(12):
            factor_trends.append(FactorDecaying(
                timestamp=base_date - timedelta(days=i*30),
                credit_threshold=55 - i*0.5,
                max_daily_loss=45 - i*0.8,
                minimal_profit_factor=30 - i*0.6
            ))
        
        # Risk limits
        risk_limits = [
            RiskLimit(
                metric="Credit (BNN) Threshold",
                current_value=55,
                limit_value=60,
                threshold_percent=91.7,
                status="warning"
            ),
            RiskLimit(
                metric="Max Daily Loss",
                current_value=2,
                limit_value=3,
                threshold_percent=66.7,
                status="normal"
            ),
            RiskLimit(
                metric="Max Drawdown",
                current_value=15,
                limit_value=20,
                threshold_percent=75,
                status="normal"
            ),
        ]
        
        return RiskOverview(
            var_95=var_95,
            var_99=var_99,
            cvar_95=cvar_95,
            max_drawdown=-15.0,
            current_drawdown=-5.0,
            aggregate_greeks=aggregate_greeks,
            strategy_health=strategy_health,
            risk_breakdowns=risk_breakdowns,
            factor_trends=factor_trends,
            risk_limits=risk_limits,
            total_exposure=aggregate_greeks.total_notional,
            concentration_score=45.0,
            risk_score=68.0
        )
        
    except Exception as e:
        logger.error(f"Error fetching risk overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/risk/scenarios", response_model=ScenarioAnalysis)
async def run_scenario_analysis(
    scenario: str = "market_crash",
    parameters: Optional[Dict[str, float]] = None
) -> ScenarioAnalysis:
    """Run scenario analysis on the portfolio."""
    try:
        # Default parameters
        if parameters is None:
            parameters = {
                "price_shock": -0.20,  # 20% drop
                "volatility_shock": 0.50,  # 50% vol increase
                "correlation": 0.95  # High correlation
            }
        
        # Get current portfolio value
        async with get_db() as conn:
            cursor = await conn.execute("""
                SELECT SUM(position_value) as total_value
                FROM positions
                WHERE is_active = 1
            """)
            result = await cursor.fetchone()
            current_value = result["total_value"] or 0
        
        # Calculate impacts (simplified)
        portfolio_impact = current_value * parameters.get("price_shock", -0.20)
        portfolio_impact_percent = parameters.get("price_shock", -0.20) * 100
        
        return ScenarioAnalysis(
            scenario_name=scenario,
            description="Market crash scenario with correlated sell-off",
            parameters=parameters,
            portfolio_impact=portfolio_impact,
            portfolio_impact_percent=portfolio_impact_percent,
            var_impact=portfolio_impact * 0.5,
            position_impacts=[],
            strategy_impacts={
                "BTC Momentum": -25.5,
                "Volatility Arb": 15.2,
                "Market Neutral": -2.1
            },
            new_var_95=abs(portfolio_impact) * 1.2,
            new_var_99=abs(portfolio_impact) * 1.5,
            new_max_drawdown=portfolio_impact_percent * 1.3
        )
        
    except Exception as e:
        logger.error(f"Error running scenario analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/concentration", response_model=ConcentrationRisk)
async def get_concentration_risk() -> ConcentrationRisk:
    """Get concentration risk analysis."""
    try:
        async with get_db() as conn:
            # Get concentration by instrument type
            cursor = await conn.execute("""
                SELECT 
                    instrument_type,
                    SUM(ABS(position_value)) as total_value,
                    COUNT(*) as count
                FROM positions
                WHERE is_active = 1
                GROUP BY instrument_type
            """)
            
            instrument_concentration = {}
            total_value = 0
            
            async for row in cursor:
                value = row["total_value"] or 0
                instrument_concentration[row["instrument_type"]] = value
                total_value += value
            
            # Calculate percentages
            if total_value > 0:
                for key in instrument_concentration:
                    instrument_concentration[key] = (instrument_concentration[key] / total_value) * 100
            
            # Simplified Herfindahl index
            herfindahl = sum(v**2 for v in instrument_concentration.values())
            
            return ConcentrationRisk(
                instrument_concentration=instrument_concentration,
                underlying_concentration={"BTC": 65, "ETH": 25, "Others": 10},
                strategy_concentration={
                    "Momentum": 40,
                    "Volatility": 35,
                    "Market Neutral": 25
                },
                expiry_concentration={
                    "1W": 20,
                    "1M": 45,
                    "3M": 25,
                    "6M+": 10
                },
                herfindahl_index=herfindahl,
                top_exposures=[
                    {"name": "BTC-USD", "exposure": 45000, "percentage": 35},
                    {"name": "ETH-USD", "exposure": 28000, "percentage": 22},
                    {"name": "BTC Options", "exposure": 20000, "percentage": 16}
                ]
            )
            
    except Exception as e:
        logger.error(f"Error fetching concentration risk: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/historical", response_model=List[HistoricalRisk])
async def get_historical_risk(
    days: int = 30,
    interval: str = "daily"
) -> List[HistoricalRisk]:
    """Get historical risk metrics."""
    try:
        # Generate sample historical data
        historical_data = []
        base_date = datetime.now()
        
        for i in range(days):
            date = base_date - timedelta(days=i)
            historical_data.append(HistoricalRisk(
                timestamp=date,
                var_95=50000 + i * 1000,
                var_99=75000 + i * 1500,
                cvar_95=65000 + i * 1200,
                realized_volatility=25 + (i % 10) * 0.5,
                sharpe_ratio=1.5 - (i % 5) * 0.1,
                max_drawdown=-15 - (i % 7) * 0.5,
                current_drawdown=-5 - (i % 3) * 0.5,
                total_exposure=100000 + i * 2000,
                net_delta=1000 + i * 50,
                net_gamma=50 + i * 2,
                net_vega=200 + i * 10,
                net_theta=-100 - i * 5
            ))
        
        return historical_data
        
    except Exception as e:
        logger.error(f"Error fetching historical risk: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/alerts", response_model=List[RiskAlert])
async def get_risk_alerts(
    limit: int = 20,
    severity: Optional[str] = None
) -> List[RiskAlert]:
    """Get recent risk alerts."""
    try:
        alerts = []
        
        # Add some sample alerts
        alerts.append(RiskAlert(
            alert_id="alert_001",
            timestamp=datetime.now() - timedelta(hours=2),
            alert_type="limit_breach",
            severity="warning",
            metric="Credit Threshold",
            current_value=55,
            threshold_value=50,
            message="Credit threshold approaching limit (55% of 60%)",
            acknowledged=False
        ))
        
        alerts.append(RiskAlert(
            alert_id="alert_002",
            timestamp=datetime.now() - timedelta(hours=5),
            alert_type="concentration",
            severity="info",
            metric="BTC Concentration",
            current_value=65,
            threshold_value=70,
            message="BTC concentration at 65% of portfolio",
            acknowledged=True,
            acknowledged_by="system",
            acknowledged_at=datetime.now() - timedelta(hours=4)
        ))
        
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        
        return alerts[:limit]
        
    except Exception as e:
        logger.error(f"Error fetching risk alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))
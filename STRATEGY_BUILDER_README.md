# Strategy Builder System

A comprehensive AI-powered trading strategy creation system that allows users to build complex trading strategies through natural language chat commands with real-time visual feedback.

## 🌟 Features

### Core Capabilities
- **Natural Language Strategy Creation**: Describe strategies in plain English and get executable code
- **Visual Flow Builder**: Drag-and-drop interface with real-time synchronization 
- **Chat Command System**: Powerful command interface for precise control
- **Real-time Collaboration**: WebSocket-based live updates between chat and visual interfaces
- **AI Code Generation**: Automatic Python/SQL code generation using Claude AI
- **Multi-Node Strategies**: Support for complex multi-component trading systems

### Strategy Components
- **Data Sources**: Connect to exchanges (Deribit, Binance, etc.) and market feeds
- **Functions**: Technical indicators (RSI, MACD, Bollinger Bands), calculations
- **Strategy Logic**: Trading rules, signal generation, decision making
- **Risk Management**: Position sizing, stop losses, hedging systems
- **Execution**: Order management, smart routing, trade execution

### Advanced Features
- **SSVI Volatility Surface Modeling**: Advanced options pricing and volatility analysis
- **Greeks Calculations**: Delta, gamma, theta, vega management
- **Real-time Updates**: Live synchronization between chat and visual interfaces
- **Session Management**: Persistent strategy development across sessions
- **Code Generation**: Production-ready Python modules from strategy descriptions

## 🚀 Quick Start

### Basic Usage

1. **Navigate to Strategy Builder**:
   ```
   http://localhost:3000/strategy-builder
   ```

2. **Create a Simple Strategy**:
   ```
   Create a momentum strategy that buys BTC when RSI crosses above 70
   ```

3. **Use Chat Commands**:
   ```
   /add-node data BTC price feed from Deribit
   /add-node function Calculate 14-period RSI
   /add-node strategy Generate buy/sell signals
   /connect data_source to rsi_calculator
   ```

4. **Preview Generated Code**:
   ```
   /preview-code rsi_calculator
   ```

### Advanced Example

Create a comprehensive volatility arbitrage strategy:

```
/create-strategy "Volatility Arbitrage" 
Build SSVI volatility surface from Deribit options data, 
identify mispriced contracts, execute arbitrage trades 
with dynamic delta hedging
```

This will automatically create:
- Data source nodes for options market data
- SSVI surface calibration function
- Mispricing detection algorithm
- Trade execution engine
- Greeks-based hedging system

## 🏗️ Architecture

### Backend Components

#### 1. StrategyBuilderChatHandler
- Processes natural language commands and chat interactions
- Supports 10+ command types (/add-node, /create-strategy, etc.)
- Integrates with Claude AI for intelligent code generation
- Manages strategy flow state and database operations

#### 2. StrategyChatTranslator
- Advanced AI-powered translation of natural language to code
- Strategy-level understanding for complete system generation
- Context-aware code generation with trading domain knowledge
- Support for complex multi-node strategy planning

#### 3. RealTimeStrategyService
- WebSocket event broadcasting for real-time synchronization
- Session management and state tracking
- Event history and replay capabilities
- Performance monitoring and error handling

#### 4. Database Schema
- `strategy_flows`: Complete strategy definitions with metadata
- `node_properties`: Individual node configurations and generated code
- `node_templates`: Reusable component templates
- `strategy_modules`: Compiled executable strategy modules
- `translation_history`: AI translation tracking and analytics

### Frontend Components

#### 1. ChatIntegratedFlowBuilder
- Visual flow builder with real-time WebSocket updates
- Node highlighting and automatic positioning
- Connection validation and data flow visualization
- Performance optimizations for large strategies

#### 2. StrategyBuilderChatInterface
- Intelligent chat interface with command autocomplete
- Real-time feedback and error handling
- Context-aware suggestions and help system
- Command history and session persistence

#### 3. WebSocket Integration
- Custom hooks for real-time communication
- Automatic reconnection and error recovery
- Event filtering and session management
- Performance monitoring and connection status

## 📋 Available Commands

### Node Management
```bash
/add-node <type> <description>     # Add new node
/edit-node <id> <property> <desc>  # Edit node property  
/delete-node <id>                  # Remove node
/list-nodes [flow-id]              # List all nodes
```

### Strategy Operations
```bash
/create-strategy "name" <desc>     # Create complete strategy
/connect <node1> to <node2>        # Connect nodes
/show-flow <flow-id>               # Display flow structure
```

### Code & Testing
```bash
/preview-code <node-id>            # Show generated code
/test-strategy <strategy-id>       # Run simulation
/help [command]                    # Get help
```

### Node Types
- **data**: Market data sources, APIs, feeds
- **function**: Calculations, indicators, transformations
- **strategy**: Trading logic, signal generation
- **risk**: Position sizing, stop losses, hedging
- **execution**: Order management, trade routing

## 🧪 Testing

The system includes comprehensive test coverage:

### Test Categories
1. **Unit Tests**: Individual component testing
2. **Integration Tests**: Chat-to-visual synchronization
3. **End-to-End Tests**: Complete strategy creation workflows
4. **Performance Tests**: Load testing and optimization
5. **Edge Case Tests**: Error handling and recovery

### Running Tests
```bash
# Run all strategy builder tests
python -m pytest tests/test_strategy_builder* -v

# Run specific test categories
python -m pytest tests/test_chat_visual_flow_integration.py -v
python -m pytest tests/test_e2e_strategy_creation.py -v
python -m pytest tests/test_performance_strategy_builder.py -v
```

### Performance Benchmarks
- **Chat Command Processing**: < 0.5s per command
- **Concurrent Users**: 10+ users simultaneously
- **Large Strategies**: 50+ nodes supported
- **WebSocket Latency**: < 10ms average
- **Database Operations**: 10+ ops/second

## 💡 Example Strategies

### 1. Simple Momentum Strategy
```
Create a momentum strategy that:
- Monitors BTC price from Deribit
- Calculates 14-period RSI
- Buys when RSI < 30, sells when RSI > 70
- Uses 2% position sizing with stop losses
```

### 2. Options Volatility Arbitrage
```
/create-strategy "Vol Arb" 
Monitor BTC options, build SSVI surface, 
find IV mispricings, execute calendar spreads 
with delta-gamma hedging
```

### 3. Multi-Asset Pairs Trading
```
Build a pairs trading system for BTC/ETH that:
- Tracks price ratio and correlation
- Detects mean reversion opportunities  
- Executes spread trades with risk management
- Monitors performance and adjusts exposure
```

### 4. High-Frequency Market Making
```
/create-strategy "Market Maker"
Real-time order book analysis, optimal bid-ask 
spread calculation, inventory management, 
latency-optimized execution
```

## 🔧 Configuration

### Environment Variables
```bash
# Claude AI Configuration
ANTHROPIC_API_KEY=your_claude_api_key

# Database Configuration  
DATABASE_URL=volatility_filter.db

# WebSocket Configuration
WEBSOCKET_PORT=8765
WEBSOCKET_HOST=localhost

# Performance Settings
MAX_CONCURRENT_USERS=50
MAX_NODES_PER_STRATEGY=100
WEBSOCKET_TIMEOUT=30000
```

### Docker Deployment
```dockerfile
# Use the provided Docker configuration
docker-compose up -d

# Strategy builder will be available at:
# http://localhost:3000/strategy-builder
```

## 🎯 Best Practices

### Strategy Design
1. **Start Simple**: Begin with basic data → function → strategy → execution flow
2. **Add Risk Management**: Always include position sizing and stop losses
3. **Test Incrementally**: Use /test-strategy frequently during development
4. **Modular Design**: Break complex logic into multiple function nodes

### Performance Optimization
1. **Limit Node Count**: Keep strategies under 20 nodes for optimal performance
2. **Efficient Connections**: Minimize unnecessary node connections
3. **Code Quality**: Review generated code with /preview-code
4. **Session Management**: Use consistent session IDs for better caching

### Error Handling
1. **Validate Inputs**: Check node types and parameters before connections
2. **Handle Failures**: Include error handling in generated code
3. **Monitor Performance**: Watch for slow AI translation responses
4. **Backup Strategies**: Export important strategies regularly

## 🤝 Contributing

### Development Setup
```bash
# Install dependencies
pip install -r requirements.txt
npm install

# Run database migrations
python src/volatility_filter/migrations/apply_migrations.py

# Start development servers
docker-compose up -d
```

### Code Standards
- Follow PEP 8 for Python code
- Use TypeScript for all frontend components
- Include comprehensive tests for new features
- Document all public APIs and components

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Run full test suite
4. Update documentation
5. Submit PR with detailed description

## 📊 Monitoring & Analytics

### System Metrics
- Strategy creation rate and success rate
- AI translation performance and token usage
- WebSocket connection stability and latency
- Database performance and query optimization

### User Analytics
- Most popular strategy types and patterns
- Command usage frequency and error rates
- Session duration and engagement metrics
- Generated code quality and execution success

### Performance Monitoring
- Real-time latency tracking
- Concurrent user load testing
- Memory usage and optimization
- Error rate monitoring and alerting

## 🔒 Security Considerations

### Code Generation Safety
- Sandboxed execution environment for generated code
- Input validation and sanitization
- Resource limits and timeout controls
- Code review workflow for production strategies

### Data Protection
- Session isolation and user data encryption
- Secure WebSocket connections (WSS in production)
- API rate limiting and abuse prevention
- Audit logging for all strategy operations

## 🚀 Future Enhancements

### Planned Features
1. **Multi-Language Support**: Generate code in multiple programming languages
2. **Advanced Backtesting**: Comprehensive historical simulation engine
3. **Strategy Marketplace**: Share and discover community strategies
4. **Live Trading Integration**: Direct execution with broker APIs
5. **Advanced Analytics**: Performance attribution and risk analysis

### Research Areas
1. **Reinforcement Learning**: AI agents that learn from strategy performance
2. **Genetic Algorithms**: Evolution-based strategy optimization
3. **Multi-Modal AI**: Image and voice input for strategy creation
4. **Quantum Computing**: Advanced optimization for complex strategies

---

## 📞 Support

For questions, issues, or contributions:
- Create an issue in the GitHub repository
- Join the Discord community
- Email: support@strategy-builder.ai

**Happy Strategy Building!** 🎯📈
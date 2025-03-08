# HANA Cloud MCP Server API Usage Examples
# These examples use curl to interact with the MCP server API

# Set the base URL for the MCP server
MCP_SERVER="http://localhost:5000"

# 1. Health Check
echo "Checking MCP server health..."
curl -s $MCP_SERVER/health | jq

# 2. Model Management

# 2.1 Register a new model
echo -e "\nRegistering a new model..."
curl -s -X POST $MCP_SERVER/api/models \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "customer_churn_classifier",
    "model_metadata": {
      "version": "1.0.0",
      "type": "classification",
      "framework": "sklearn",
      "description": "Customer churn prediction model",
      "features": ["tenure", "monthly_charges", "total_charges", "contract_type", "payment_method"],
      "target": "churn",
      "metrics": {
        "accuracy": 0.85,
        "precision": 0.83,
        "recall": 0.79,
        "f1_score": 0.81
      },
      "active": true
    }
  }' | jq

# 2.2 List all models
echo -e "\nListing all models..."
curl -s $MCP_SERVER/api/models | jq

# 2.3 Get specific model
echo -e "\nGetting model details..."
curl -s $MCP_SERVER/api/models/customer_churn_classifier | jq

# 2.4 Update model status
echo -e "\nUpdating model status..."
curl -s -X PUT $MCP_SERVER/api/models/customer_churn_classifier/status \
  -H "Content-Type: application/json" \
  -d '{
    "active": true
  }' | jq

# 3. Context Management

# 3.1 Create a new context
echo -e "\nCreating a new context..."
curl -s -X POST $MCP_SERVER/api/contexts \
  -H "Content-Type: application/json" \
  -d '{
    "context_name": "churn_inference",
    "model_name": "customer_churn_classifier",
    "context_config": {
      "type": "inference",
      "batch_size": 100,
      "timeout_seconds": 30,
      "description": "Production inference context for churn prediction",
      "cache_results": true,
      "active": true
    }
  }' | jq

# 3.2 List all contexts
echo -e "\nListing all contexts..."
curl -s $MCP_SERVER/api/contexts | jq

# 3.3 Get specific context
echo -e "\nGetting context details..."
curl -s $MCP_SERVER/api/contexts/churn_inference | jq

# 3.4 Execute in context
echo -e "\nExecuting prediction in context..."
curl -s -X POST $MCP_SERVER/api/contexts/churn_inference/execute \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {
        "tenure": 45,
        "monthly_charges": 89.50,
        "total_charges": 4027.50,
        "contract_type": "month-to-month",
        "payment_method": "electronic_check"
      },
      {
        "tenure": 72,
        "monthly_charges": 110.25,
        "total_charges": 7938.00,
        "contract_type": "two_year",
        "payment_method": "credit_card"
      }
    ],
    "options": {
      "return_probability": true,
      "threshold": 0.5
    }
  }' | jq

# 4. Protocol Management

# 4.1 Register a new protocol
echo -e "\nRegistering a new protocol..."
curl -s -X POST $MCP_SERVER/api/protocols \
  -H "Content-Type: application/json" \
  -d '{
    "protocol_name": "hana_pal_classification",
    "protocol_type": "hana_inference",
    "implementation": {
      "handler_type": "sql",
      "sql_template": "CALL PAL_APPLY_MODEL({{model_name}}, {{input.data}})",
      "description": "Protocol for HANA PAL classification models",
      "active": true
    }
  }' | jq

# 4.2 List all protocols
echo -e "\nListing all protocols..."
curl -s $MCP_SERVER/api/protocols | jq

# 4.3 Get specific protocol
echo -e "\nGetting protocol details..."
curl -s $MCP_SERVER/api/protocols/hana_pal_classification | jq

# 5. Server Configuration

# 5.1 Get server configuration
echo -e "\nGetting server configuration..."
curl -s $MCP_SERVER/api/config | jq

# 5.2 Test database connection
echo -e "\nTesting database connection..."
curl -s $MCP_SERVER/api/config/test-connection | jq
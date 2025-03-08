"""
HANA Cloud MCP Server
---------------------
This implementation provides a Model Context Protocol (MCP) server for HANA Cloud DB
that can be integrated with Cursor IDE.
"""

import os
import json
import logging
from flask import Flask, request, jsonify
from hdbcli import dbapi
from contextlib import contextmanager
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# HANA Cloud connection configuration
HANA_CONFIG = {
    'address': os.environ.get('HANA_HOST'),
    'port': '443',
    'user': os.environ.get('HANA_USER'),
    'password': os.environ.get('HANA_PASSWORD'),
    'encrypt': True,  # Always use encryption for cloud connections
    'sslValidateCertificate': True
}

# MCP Server Configuration
MCP_CONFIG = {
    'MODEL_SCHEMA': os.environ.get('MODEL_SCHEMA', 'MCP_MODELS'),
    'CONTEXT_SCHEMA': os.environ.get('CONTEXT_SCHEMA', 'MCP_CONTEXTS'),
    'PROTOCOL_SCHEMA': os.environ.get('PROTOCOL_SCHEMA', 'MCP_PROTOCOLS'),
    'max_connections': int(os.environ.get('MAX_CONNECTIONS', '10')),
}

# --------- Connection Management ---------

@contextmanager
def get_hana_connection():
    """Context manager for HANA Cloud DB connections"""
    conn = None
    try:
        conn = dbapi.connect(
            address=HANA_CONFIG['address'],
            port=HANA_CONFIG['port'],
            user=HANA_CONFIG['user'],
            password=HANA_CONFIG['password'],
            encrypt=HANA_CONFIG['encrypt'],
            sslValidateCertificate=HANA_CONFIG['sslValidateCertificate']
        )
        logger.info(f"Connected to HANA Cloud at {HANA_CONFIG['address']}:{HANA_CONFIG['port']}")
        yield conn
    except dbapi.Error as e:
        logger.error(f"HANA connection error: {e}")
        raise
    finally:
        if conn:
            conn.close()
            logger.info("HANA connection closed")

# --------- Model Layer ---------

class ModelManager:
    """Manages predictive models and their metadata"""
    
    @staticmethod
    def register_model(model_name: str, model_metadata: Dict) -> bool:
        """
        Register a new model in the model registry
        
        Args:
            model_name: Name of the model
            model_metadata: Dictionary containing model structure and metadata
            
        Returns:
            bool: Success status
        """
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                
                # Check if model already exists
                cursor.execute(f"""
                    SELECT COUNT(*) FROM {MCP_CONFIG['MODEL_SCHEMA']}.MODEL_REGISTRY 
                    WHERE MODEL_NAME = ?
                """, (model_name,))
                
                if cursor.fetchone()[0] > 0:
                    logger.warning(f"Model {model_name} already exists")
                    return False
                
                # Create model entry
                cursor.execute(f"""
                    INSERT INTO {MCP_CONFIG['MODEL_SCHEMA']}.MODEL_REGISTRY 
                    (MODEL_NAME, MODEL_VERSION, MODEL_TYPE, FRAMEWORK, 
                     CREATION_DATE, METADATA, ACTIVE)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
                """, (
                    model_name,
                    model_metadata.get('version', '1.0.0'),
                    model_metadata.get('type', 'classification'),
                    model_metadata.get('framework', 'sklearn'),
                    json.dumps(model_metadata),
                    model_metadata.get('active', True)
                ))
                
                conn.commit()
                logger.info(f"Model {model_name} registered successfully")
                return True
                
        except Exception as e:
            logger.error(f"Error registering model {model_name}: {e}")
            return False
    
    @staticmethod
    def get_model(model_name: str) -> Optional[Dict]:
        """Retrieve a model by name"""
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"""
                    SELECT 
                        MODEL_NAME, MODEL_VERSION, MODEL_TYPE, FRAMEWORK, 
                        CREATION_DATE, METADATA, ACTIVE
                    FROM {MCP_CONFIG['MODEL_SCHEMA']}.MODEL_REGISTRY 
                    WHERE MODEL_NAME = ?
                """, (model_name,))
                
                result = cursor.fetchone()
                if not result:
                    return None
                
                return {
                    'model_name': result[0],
                    'version': result[1],
                    'type': result[2],
                    'framework': result[3],
                    'creation_date': result[4].isoformat() if result[4] else None,
                    'metadata': json.loads(result[5]) if result[5] else {},
                    'active': bool(result[6])
                }
                
        except Exception as e:
            logger.error(f"Error retrieving model {model_name}: {e}")
            return None
    
    @staticmethod
    def list_models(active_only: bool = False) -> List[Dict]:
        """List all registered models"""
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                
                query = f"""
                    SELECT 
                        MODEL_NAME, MODEL_VERSION, MODEL_TYPE, FRAMEWORK, 
                        CREATION_DATE, ACTIVE
                    FROM {MCP_CONFIG['MODEL_SCHEMA']}.MODEL_REGISTRY
                """
                
                if active_only:
                    query += " WHERE ACTIVE = TRUE"
                
                query += " ORDER BY MODEL_NAME"
                cursor.execute(query)
                
                models = []
                for row in cursor.fetchall():
                    models.append({
                        'model_name': row[0],
                        'version': row[1],
                        'type': row[2],
                        'framework': row[3],
                        'creation_date': row[4].isoformat() if row[4] else None,
                        'active': bool(row[5])
                    })
                
                return models
                
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            return []
    
    @staticmethod
    def update_model_status(model_name: str, active: bool) -> bool:
        """Update a model's active status"""
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"""
                    UPDATE {MCP_CONFIG['MODEL_SCHEMA']}.MODEL_REGISTRY 
                    SET ACTIVE = ?
                    WHERE MODEL_NAME = ?
                """, (active, model_name))
                
                if cursor.rowcount > 0:
                    conn.commit()
                    logger.info(f"Model {model_name} status updated to {'active' if active else 'inactive'}")
                    return True
                
                logger.warning(f"Model {model_name} not found for status update")
                return False
                
        except Exception as e:
            logger.error(f"Error updating model {model_name} status: {e}")
            return False
    
    @staticmethod
    def delete_model(model_name: str) -> bool:
        """Delete a model by name"""
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"""
                    DELETE FROM {MCP_CONFIG['MODEL_SCHEMA']}.MODEL_REGISTRY 
                    WHERE MODEL_NAME = ?
                """, (model_name,))
                
                if cursor.rowcount > 0:
                    conn.commit()
                    logger.info(f"Model {model_name} deleted successfully")
                    return True
                
                logger.warning(f"Model {model_name} not found for deletion")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting model {model_name}: {e}")
            return False

# --------- Context Layer ---------

class ContextManager:
    """Manages execution contexts for models"""
    
    @staticmethod
    def create_context(context_name: str, model_name: str, context_config: Dict) -> bool:
        """
        Create a new execution context for a model
        
        Args:
            context_name: Name of the context
            model_name: Reference to the registered model
            context_config: Configuration for context behavior
            
        Returns:
            bool: Success status
        """
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                
                # Check if context already exists
                cursor.execute(f"""
                    SELECT COUNT(*) FROM {MCP_CONFIG['CONTEXT_SCHEMA']}.CONTEXT_REGISTRY 
                    WHERE CONTEXT_NAME = ?
                """, (context_name,))
                
                if cursor.fetchone()[0] > 0:
                    logger.warning(f"Context {context_name} already exists")
                    return False
                
                # Check if model exists
                model = ModelManager.get_model(model_name)
                if not model:
                    logger.error(f"Model {model_name} not found")
                    return False
                
                # Create context entry
                cursor.execute(f"""
                    INSERT INTO {MCP_CONFIG['CONTEXT_SCHEMA']}.CONTEXT_REGISTRY 
                    (CONTEXT_NAME, MODEL_NAME, CONTEXT_TYPE, CONFIG, CREATED_AT, ACTIVE)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                """, (
                    context_name,
                    model_name,
                    context_config.get('type', 'inference'),
                    json.dumps(context_config),
                    context_config.get('active', True)
                ))
                
                conn.commit()
                logger.info(f"Context {context_name} created successfully")
                return True
                
        except Exception as e:
            logger.error(f"Error creating context {context_name}: {e}")
            return False
    
    @staticmethod
    def get_context(context_name: str) -> Optional[Dict]:
        """Retrieve context configuration by name"""
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"""
                    SELECT c.CONTEXT_NAME, c.MODEL_NAME, c.CONTEXT_TYPE, c.CONFIG, 
                           c.CREATED_AT, c.ACTIVE
                    FROM {MCP_CONFIG['CONTEXT_SCHEMA']}.CONTEXT_REGISTRY c
                    WHERE c.CONTEXT_NAME = ?
                """, (context_name,))
                
                result = cursor.fetchone()
                if not result:
                    return None
                    
                return {
                    'context_name': result[0],
                    'model_name': result[1],
                    'context_type': result[2],
                    'config': json.loads(result[3]) if result[3] else {},
                    'created_at': result[4].isoformat() if result[4] else None,
                    'active': bool(result[5])
                }
                
        except Exception as e:
            logger.error(f"Error retrieving context {context_name}: {e}")
            return None
    
    @staticmethod
    def list_contexts(active_only: bool = False) -> List[Dict]:
        """List all available contexts with basic info"""
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                
                query = f"""
                    SELECT CONTEXT_NAME, MODEL_NAME, CONTEXT_TYPE, CREATED_AT, ACTIVE
                    FROM {MCP_CONFIG['CONTEXT_SCHEMA']}.CONTEXT_REGISTRY
                """
                
                if active_only:
                    query += " WHERE ACTIVE = TRUE"
                
                query += " ORDER BY CONTEXT_NAME"
                cursor.execute(query)
                
                contexts = []
                for row in cursor.fetchall():
                    contexts.append({
                        'context_name': row[0],
                        'model_name': row[1],
                        'context_type': row[2],
                        'created_at': row[3].isoformat() if row[3] else None,
                        'active': bool(row[4])
                    })
                
                return contexts
                
        except Exception as e:
            logger.error(f"Error listing contexts: {e}")
            return []
    
    @staticmethod
    def update_context_status(context_name: str, active: bool) -> bool:
        """Update a context's active status"""
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"""
                    UPDATE {MCP_CONFIG['CONTEXT_SCHEMA']}.CONTEXT_REGISTRY 
                    SET ACTIVE = ?
                    WHERE CONTEXT_NAME = ?
                """, (active, context_name))
                
                if cursor.rowcount > 0:
                    conn.commit()
                    logger.info(f"Context {context_name} status updated to {'active' if active else 'inactive'}")
                    return True
                
                logger.warning(f"Context {context_name} not found for status update")
                return False
                
        except Exception as e:
            logger.error(f"Error updating context {context_name} status: {e}")
            return False
    
    @staticmethod
    def delete_context(context_name: str) -> bool:
        """Delete a context by name"""
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"""
                    DELETE FROM {MCP_CONFIG['CONTEXT_SCHEMA']}.CONTEXT_REGISTRY 
                    WHERE CONTEXT_NAME = ?
                """, (context_name,))
                
                if cursor.rowcount > 0:
                    conn.commit()
                    logger.info(f"Context {context_name} deleted successfully")
                    return True
                
                logger.warning(f"Context {context_name} not found for deletion")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting context {context_name}: {e}")
            return False
    
    @staticmethod
    def execute_in_context(context_name: str, input_data: Dict) -> Optional[Dict]:
        """
        Execute a request in the specified context
        
        Args:
            context_name: Name of the context to use
            input_data: Input data for the execution
            
        Returns:
            Optional[Dict]: Result of the execution or None on error
        """
        try:
            context = ContextManager.get_context(context_name)
            if not context:
                logger.error(f"Context {context_name} not found")
                return None
            
            # Get associated model
            model = ModelManager.get_model(context['model_name'])
            if not model:
                logger.error(f"Model {context['model_name']} not found")
                return None
            
            # Determine execution type based on context
            context_type = context['context_type']
            
            if context_type == 'inference':
                # Execute inference using Protocol Manager
                return ProtocolManager.execute_protocol(
                    model=model,
                    context=context,
                    input_data=input_data,
                    operation='inference'
                )
            elif context_type == 'training':
                # Execute training using Protocol Manager
                return ProtocolManager.execute_protocol(
                    model=model,
                    context=context,
                    input_data=input_data,
                    operation='training'
                )
            else:
                logger.error(f"Unsupported context type: {context_type}")
                return None
                
        except Exception as e:
            logger.error(f"Error executing in context {context_name}: {e}")
            return None

# --------- Protocol Layer ---------

class ProtocolManager:
    """Manages protocol execution for models and contexts"""
    
    @staticmethod
    def register_protocol(protocol_name: str, protocol_type: str, 
                         implementation: Dict) -> bool:
        """
        Register a new protocol implementation
        
        Args:
            protocol_name: Name of the protocol
            protocol_type: Type of the protocol (e.g., 'inference', 'training')
            implementation: Protocol implementation details
            
        Returns:
            bool: Success status
        """
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                
                # Check if protocol already exists
                cursor.execute(f"""
                    SELECT COUNT(*) FROM {MCP_CONFIG['PROTOCOL_SCHEMA']}.PROTOCOL_REGISTRY 
                    WHERE PROTOCOL_NAME = ?
                """, (protocol_name,))
                
                if cursor.fetchone()[0] > 0:
                    logger.warning(f"Protocol {protocol_name} already exists")
                    return False
                
                # Create protocol entry
                cursor.execute(f"""
                    INSERT INTO {MCP_CONFIG['PROTOCOL_SCHEMA']}.PROTOCOL_REGISTRY 
                    (PROTOCOL_NAME, PROTOCOL_TYPE, IMPLEMENTATION, CREATED_AT, ACTIVE)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
                """, (
                    protocol_name,
                    protocol_type,
                    json.dumps(implementation),
                    implementation.get('active', True)
                ))
                
                conn.commit()
                logger.info(f"Protocol {protocol_name} registered successfully")
                return True
                
        except Exception as e:
            logger.error(f"Error registering protocol {protocol_name}: {e}")
            return False
    
    @staticmethod
    def get_protocol(protocol_name: str) -> Optional[Dict]:
        """Retrieve protocol by name"""
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"""
                    SELECT PROTOCOL_NAME, PROTOCOL_TYPE, IMPLEMENTATION, CREATED_AT, ACTIVE
                    FROM {MCP_CONFIG['PROTOCOL_SCHEMA']}.PROTOCOL_REGISTRY
                    WHERE PROTOCOL_NAME = ?
                """, (protocol_name,))
                
                result = cursor.fetchone()
                if not result:
                    return None
                    
                return {
                    'protocol_name': result[0],
                    'protocol_type': result[1],
                    'implementation': json.loads(result[2]) if result[2] else {},
                    'created_at': result[3].isoformat() if result[3] else None,
                    'active': bool(result[4])
                }
                
        except Exception as e:
            logger.error(f"Error retrieving protocol {protocol_name}: {e}")
            return None
    
    @staticmethod
    def list_protocols(protocol_type: Optional[str] = None) -> List[Dict]:
        """List all registered protocols"""
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                
                query = f"""
                    SELECT PROTOCOL_NAME, PROTOCOL_TYPE, CREATED_AT, ACTIVE
                    FROM {MCP_CONFIG['PROTOCOL_SCHEMA']}.PROTOCOL_REGISTRY
                """
                
                params = []
                if protocol_type:
                    query += " WHERE PROTOCOL_TYPE = ?"
                    params.append(protocol_type)
                
                query += " ORDER BY PROTOCOL_NAME"
                cursor.execute(query, params)
                
                protocols = []
                for row in cursor.fetchall():
                    protocols.append({
                        'protocol_name': row[0],
                        'protocol_type': row[1],
                        'created_at': row[2].isoformat() if row[2] else None,
                        'active': bool(row[3])
                    })
                
                return protocols
                
        except Exception as e:
            logger.error(f"Error listing protocols: {e}")
            return []
    
    @staticmethod
    def delete_protocol(protocol_name: str) -> bool:
        """Delete a protocol by name"""
        try:
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"""
                    DELETE FROM {MCP_CONFIG['PROTOCOL_SCHEMA']}.PROTOCOL_REGISTRY 
                    WHERE PROTOCOL_NAME = ?
                """, (protocol_name,))
                
                if cursor.rowcount > 0:
                    conn.commit()
                    logger.info(f"Protocol {protocol_name} deleted successfully")
                    return True
                
                logger.warning(f"Protocol {protocol_name} not found for deletion")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting protocol {protocol_name}: {e}")
            return False
    
    @staticmethod
    def execute_protocol(model: Dict, context: Dict, input_data: Dict, 
                      operation: str) -> Dict:
        """
        Execute a protocol based on model, context, and operation
        
        Args:
            model: Model configuration
            context: Context configuration
            input_data: Input data for the execution
            operation: Type of operation ('inference', 'training', etc.)
            
        Returns:
            Dict: Result of the protocol execution
        """
        try:
            # Determine protocol handler based on model framework and operation
            framework = model.get('framework', 'sklearn')
            protocol_type = f"{framework}_{operation}"
            
            # Find applicable protocol
            with get_hana_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"""
                    SELECT PROTOCOL_NAME, IMPLEMENTATION 
                    FROM {MCP_CONFIG['PROTOCOL_SCHEMA']}.PROTOCOL_REGISTRY
                    WHERE PROTOCOL_TYPE = ? AND ACTIVE = TRUE
                    ORDER BY CREATED_AT DESC
                    LIMIT 1
                """, (protocol_type,))
                
                result = cursor.fetchone()
                if not result:
                    logger.error(f"No active protocol found for {protocol_type}")
                    return {"error": f"No protocol available for {framework} {operation}"}
                
                protocol_name = result[0]
                implementation = json.loads(result[1]) if result[1] else {}
            
            # Extract relevant config from context and model
            context_config = context.get('config', {})
            model_metadata = model.get('metadata', {})
            
            # Prepare execution parameters
            execution_params = {
                'protocol_name': protocol_name,
                'model_name': model['model_name'],
                'model_version': model.get('version', '1.0.0'),
                'context_name': context['context_name'],
                'input_data': input_data,
                'model_metadata': model_metadata,
                'context_config': context_config,
                'protocol_implementation': implementation
            }
            
            # Execute the appropriate protocol handler
            if operation == 'inference':
                return ProtocolManager._handle_inference(execution_params)
            elif operation == 'training':
                return ProtocolManager._handle_training(execution_params)
            else:
                logger.error(f"Unsupported operation: {operation}")
                return {"error": f"Unsupported operation: {operation}"}
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error executing protocol: {error_msg}")
            return {"error": error_msg}
    
    @staticmethod
    def _handle_inference(params: Dict) -> Dict:
        """Handle inference protocol execution"""
        try:
            implementation = params.get('protocol_implementation', {})
            handler_type = implementation.get('handler_type', 'sql')
            
            if handler_type == 'sql':
                # SQL-based inference (using HANA PAL or stored procedures)
                sql_template = implementation.get('sql_template', '')
                if not sql_template:
                    return {"error": "Missing SQL template in protocol implementation"}
                
                # Replace template variables
                sql = ProtocolManager._render_sql_template(
                    template=sql_template,
                    model_name=params.get('model_name', ''),
                    input_data=params.get('input_data', {})
                )
                
                # Execute SQL
                with get_hana_connection() as conn:
                    result_df = pd.read_sql(sql, conn)
                    return result_df.to_dict(orient='records')
                    
            elif handler_type == 'python':
                # Python-based inference
                # For this example, we'll just return a mock result
                # In a real system, this would load and execute the model
                
                # Mock inference result
                return {
                    "predictions": [
                        {"id": 1, "prediction": 0.95, "label": "positive"},
                        {"id": 2, "prediction": 0.30, "label": "negative"}
                    ],
                    "model_name": params.get('model_name', ''),
                    "model_version": params.get('model_version', ''),
                    "execution_time_ms": 125
                }
                
            else:
                return {"error": f"Unsupported inference handler type: {handler_type}"}
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in inference protocol: {error_msg}")
            return {"error": error_msg}
    
    @staticmethod
    def _handle_training(params: Dict) -> Dict:
        """Handle training protocol execution"""
        try:
            implementation = params.get('protocol_implementation', {})
            handler_type = implementation.get('handler_type', 'sql')
            
            if handler_type == 'sql':
                # SQL-based training (using HANA PAL or stored procedures)
                sql_template = implementation.get('sql_template', '')
                if not sql_template:
                    return {"error": "Missing SQL template in protocol implementation"}
                
                # Replace template variables
                sql = ProtocolManager._render_sql_template(
                    template=sql_template,
                    model_name=params.get('model_name', ''),
                    input_data=params.get('input_data', {})
                )
                
                # Execute SQL
                with get_hana_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(sql)
                    conn.commit()
                    
                    return {
                        "status": "success",
                        "message": f"Training completed for model {params.get('model_name', '')}"
                    }
                    
            elif handler_type == 'python':
                # Python-based training
                # For this example, we'll just return a mock result
                # In a real system, this would train and save the model
                
                # Mock training result
                return {
                    "status": "success",
                    "model_name": params.get('model_name', ''),
                    "model_version": params.get('model_version', ''),
                    "training_metrics": {
                        "accuracy": 0.92,
                        "f1_score": 0.91,
                        "auc": 0.95
                    },
                    "execution_time_seconds": 75
                }
                
            else:
                return {"error": f"Unsupported training handler type: {handler_type}"}
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in training protocol: {error_msg}")
            return {"error": error_msg}
    
    @staticmethod
    def _render_sql_template(template: str, model_name: str, input_data: Dict) -> str:
        """Render SQL template with variables"""
        sql = template
        
        # Replace model name
        sql = sql.replace('{{model_name}}', model_name)
        
        # Replace input data variables
        for key, value in input_data.items():
            placeholder = f'{{{{input.{key}}}}}'
            if isinstance(value, str):
                # Escape single quotes for string values
                value = value.replace("'", "''")
                sql = sql.replace(placeholder, f"'{value}'")
            elif isinstance(value, (int, float, bool)):
                sql = sql.replace(placeholder, str(value))
            elif value is None:
                sql = sql.replace(placeholder, 'NULL')
        
        return sql

# --------- API Routes ---------

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        with get_hana_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM DUMMY")
            result = cursor.fetchone()
            
            if result and result[0] == 1:
                return jsonify({
                    'status': 'healthy',
                    'database': 'connected',
                    'version': '1.0.0'
                })
            
        return jsonify({
            'status': 'unhealthy',
            'database': 'error',
            'message': 'Database check failed'
        }), 500
    
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'error',
            'message': str(e)
        }), 500

# ----- Model API Endpoints -----

@app.route('/api/models', methods=['GET'])
def list_models():
    """List all models"""
    active_only = request.args.get('active_only', 'false').lower() == 'true'
    models = ModelManager.list_models(active_only)
    return jsonify(models)

@app.route('/api/models/<model_name>', methods=['GET'])
def get_model(model_name):
    """Get model by name"""
    model = ModelManager.get_model(model_name)
    if model:
        return jsonify(model)
    return jsonify({'error': f'Model {model_name} not found'}), 404

@app.route('/api/models', methods=['POST'])
def register_model():
    """Register a new model"""
    data = request.json
    if not data or 'model_name' not in data or 'model_metadata' not in data:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    result = ModelManager.register_model(data['model_name'], data['model_metadata'])
    if result:
        return jsonify({
            'success': True, 
            'message': f"Model {data['model_name']} registered successfully"
        }), 201
    
    return jsonify({'error': f"Failed to register model {data['model_name']}"}), 400

@app.route('/api/models/<model_name>/status', methods=['PUT'])
def update_model_status(model_name):
    """Update a model's active status"""
    data = request.json
    if not data or 'active' not in data:
        return jsonify({'error': 'Missing active parameter'}), 400
    
    active = data['active']
    result = ModelManager.update_model_status(model_name, active)
    if result:
        return jsonify({
            'success': True, 
            'message': f"Model {model_name} status updated to {'active' if active else 'inactive'}"
        })
    
    return jsonify({'error': f"Model {model_name} not found or couldn't be updated"}), 404

@app.route('/api/models/<model_name>', methods=['DELETE'])
def delete_model(model_name):
    """Delete a model"""
    result = ModelManager.delete_model(model_name)
    if result:
        return jsonify({'success': True, 'message': f"Model {model_name} deleted successfully"})
    
    return jsonify({'error': f"Model {model_name} not found or couldn't be deleted"}), 404

# ----- Context API Endpoints -----

@app.route('/api/contexts', methods=['GET'])
def list_contexts():
    """List all contexts"""
    active_only = request.args.get('active_only', 'false').lower() == 'true'
    contexts = ContextManager.list_contexts(active_only)
    return jsonify(contexts)

@app.route('/api/contexts/<context_name>', methods=['GET'])
def get_context(context_name):
    """Get context by name"""
    context = ContextManager.get_context(context_name)
    if context:
        return jsonify(context)
    return jsonify({'error': f'Context {context_name} not found'}), 404

@app.route('/api/contexts', methods=['POST'])
def create_context():
    """Create a new context"""
    data = request.json
    if not data or 'context_name' not in data or 'model_name' not in data or 'context_config' not in data:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    result = ContextManager.create_context(data['context_name'], data['model_name'], data['context_config'])
    if result:
        return jsonify({
            'success': True, 
            'message': f"Context {data['context_name']} created successfully"
        }), 201
    
    return jsonify({'error': f"Failed to create context {data['context_name']}"}), 400

@app.route('/api/contexts/<context_name>/status', methods=['PUT'])
def update_context_status(context_name):
    """Update a context's active status"""
    data = request.json
    if not data or 'active' not in data:
        return jsonify({'error': 'Missing active parameter'}), 400
    
    active = data['active']
    result = ContextManager.update_context_status(context_name, active)
    if result:
        return jsonify({
            'success': True, 
            'message': f"Context {context_name} status updated to {'active' if active else 'inactive'}"
        })
    
    return jsonify({'error': f"Context {context_name} not found or couldn't be updated"}), 404

@app.route('/api/contexts/<context_name>', methods=['DELETE'])
def delete_context(context_name):
    """Delete a context"""
    result = ContextManager.delete_context(context_name)
    if result:
        return jsonify({'success': True, 'message': f"Context {context_name} deleted successfully"})
    
    return jsonify({'error': f"Context {context_name} not found or couldn't be deleted"}), 404

@app.route('/api/contexts/<context_name>/execute', methods=['POST'])
def execute_in_context(context_name):
    """Execute a request in a context"""
    data = request.json
    if not data:
        return jsonify({'error': 'Missing request data'}), 400
    
    result = ContextManager.execute_in_context(context_name, data)
    if result is None:
        return jsonify({'error': f"Failed to execute in context {context_name}"}), 400
    
    return jsonify(result)

# ----- Protocol API Endpoints -----

@app.route('/api/protocols', methods=['GET'])
def list_protocols():
    """List all protocols"""
    protocol_type = request.args.get('type')
    protocols = ProtocolManager.list_protocols(protocol_type)
    return jsonify(protocols)

@app.route('/api/protocols/<protocol_name>', methods=['GET'])
def get_protocol(protocol_name):
    """Get protocol by name"""
    protocol = ProtocolManager.get_protocol(protocol_name)
    if protocol:
        return jsonify(protocol)
    return jsonify({'error': f'Protocol {protocol_name} not found'}), 404

@app.route('/api/protocols', methods=['POST'])
def register_protocol():
    """Register a new protocol"""
    data = request.json
    if not data or 'protocol_name' not in data or 'protocol_type' not in data or 'implementation' not in data:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    result = ProtocolManager.register_protocol(
        data['protocol_name'], data['protocol_type'], data['implementation'])
    if result:
        return jsonify({
            'success': True, 
            'message': f"Protocol {data['protocol_name']} registered successfully"
        }), 201
    
    return jsonify({'error': f"Failed to register protocol {data['protocol_name']}"}), 400

@app.route('/api/protocols/<protocol_name>', methods=['DELETE'])
def delete_protocol(protocol_name):
    """Delete a protocol"""
    result = ProtocolManager.delete_protocol(protocol_name)
    if result:
        return jsonify({'success': True, 'message': f"Protocol {protocol_name} deleted successfully"})
    
    return jsonify({'error': f"Protocol {protocol_name} not found or couldn't be deleted"}), 404

# ----- Schema Management -----

def initialize_schemas():
    """Initialize required schemas and tables if they don't exist"""
    try:
        with get_hana_connection() as conn:
            cursor = conn.cursor()
            
            # First check if schemas exist
            existing_schemas = {}
            for schema in ['MODEL_SCHEMA', 'CONTEXT_SCHEMA', 'PROTOCOL_SCHEMA']:
                schema_name = MCP_CONFIG[schema]
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM SYS.SCHEMAS 
                    WHERE SCHEMA_NAME = ?
                """, (schema_name,))
                count = cursor.fetchone()[0]
                existing_schemas[schema_name] = count > 0
            
            # Create schemas if they don't exist and user has privileges
            for schema in ['MODEL_SCHEMA', 'CONTEXT_SCHEMA', 'PROTOCOL_SCHEMA']:
                schema_name = MCP_CONFIG[schema]
                if not existing_schemas[schema_name]:
                    try:
                        cursor.execute(f"""
                            CREATE SCHEMA {schema_name}
                        """)
                        logger.info(f"Created schema {schema_name}")
                    except dbapi.Error as e:
                        logger.warning(f"Could not create schema {schema_name}. Using existing schema. Error: {e}")
                        # If we can't create the schema, we'll try to use it if it exists
                        pass
            
            # Attempt to create tables in each schema
            try:
                # Check if tables exist first
                def table_exists(schema, table):
                    cursor.execute("""
                        SELECT COUNT(*) 
                        FROM SYS.TABLES 
                        WHERE SCHEMA_NAME = ? AND TABLE_NAME = ?
                    """, (schema, table))
                    return cursor.fetchone()[0] > 0

                # Create Model Registry table if it doesn't exist
                if not table_exists(MCP_CONFIG['MODEL_SCHEMA'], 'MODEL_REGISTRY'):
                    cursor.execute(f"""
                        CREATE TABLE {MCP_CONFIG['MODEL_SCHEMA']}.MODEL_REGISTRY (
                            MODEL_ID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                            MODEL_NAME VARCHAR(255) NOT NULL UNIQUE,
                            MODEL_VERSION VARCHAR(50) NOT NULL,
                            MODEL_TYPE VARCHAR(50) NOT NULL,
                            FRAMEWORK VARCHAR(50) NOT NULL,
                            CREATION_DATE TIMESTAMP NOT NULL,
                            METADATA NCLOB,
                            ACTIVE BOOLEAN DEFAULT TRUE
                        )
                    """)
                    logger.info(f"Created table {MCP_CONFIG['MODEL_SCHEMA']}.MODEL_REGISTRY")
                
                # Create Context Registry table if it doesn't exist
                if not table_exists(MCP_CONFIG['CONTEXT_SCHEMA'], 'CONTEXT_REGISTRY'):
                    cursor.execute(f"""
                        CREATE TABLE {MCP_CONFIG['CONTEXT_SCHEMA']}.CONTEXT_REGISTRY (
                            CONTEXT_ID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                            CONTEXT_NAME VARCHAR(255) NOT NULL UNIQUE,
                            MODEL_NAME VARCHAR(255) NOT NULL,
                            CONTEXT_TYPE VARCHAR(50) NOT NULL,
                            CONFIG NCLOB,
                            CREATED_AT TIMESTAMP NOT NULL,
                            ACTIVE BOOLEAN DEFAULT TRUE,
                            FOREIGN KEY (MODEL_NAME) REFERENCES {MCP_CONFIG['MODEL_SCHEMA']}.MODEL_REGISTRY(MODEL_NAME)
                                ON DELETE CASCADE
                        )
                    """)
                    logger.info(f"Created table {MCP_CONFIG['CONTEXT_SCHEMA']}.CONTEXT_REGISTRY")
                
                # Create Protocol Registry table if it doesn't exist
                if not table_exists(MCP_CONFIG['PROTOCOL_SCHEMA'], 'PROTOCOL_REGISTRY'):
                    cursor.execute(f"""
                        CREATE TABLE {MCP_CONFIG['PROTOCOL_SCHEMA']}.PROTOCOL_REGISTRY (
                            PROTOCOL_ID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                            PROTOCOL_NAME VARCHAR(255) NOT NULL UNIQUE,
                            PROTOCOL_TYPE VARCHAR(50) NOT NULL,
                            IMPLEMENTATION NCLOB,
                            CREATED_AT TIMESTAMP NOT NULL,
                            ACTIVE BOOLEAN DEFAULT TRUE
                        )
                    """)
                    logger.info(f"Created table {MCP_CONFIG['PROTOCOL_SCHEMA']}.PROTOCOL_REGISTRY")
                
                conn.commit()
                logger.info("Tables initialized successfully")
                return True
                
            except dbapi.Error as e:
                logger.error(f"Error creating tables: {e}")
                logger.error("Please ensure you have the necessary privileges and the schemas exist")
                return False
                
    except Exception as e:
        logger.error(f"Error initializing schemas: {e}")
        return False

# ----- MCP Server Configuration API -----

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get current MCP server configuration"""
    config = {
        'schemas': {
            'model_schema': MCP_CONFIG['MODEL_SCHEMA'],
            'context_schema': MCP_CONFIG['CONTEXT_SCHEMA'],
            'protocol_schema': MCP_CONFIG['PROTOCOL_SCHEMA']
        },
        'connection': {
            'host': HANA_CONFIG['address'],
            'port': HANA_CONFIG['port'],
            'encrypt': HANA_CONFIG['encrypt']
        },
        'version': '1.0.0',
        'max_connections': MCP_CONFIG['max_connections']
    }
    return jsonify(config)

@app.route('/api/config/test-connection', methods=['GET'])
def test_connection():
    """Test database connection"""
    try:
        with get_hana_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT @@version AS version")
            result = cursor.fetchone()
            version = result[0] if result else "Unknown"
            
            return jsonify({
                'status': 'success',
                'message': 'Successfully connected to HANA Cloud',
                'version': version
            })
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Connection failed: {str(e)}'
        }), 500

# ----- Main Application Entry Point -----

if __name__ == '__main__':
    # Initialize schemas and tables
    if not initialize_schemas():
        logger.warning("Schema initialization failed. Some features may not work correctly.")
    
    # Start the Flask application
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
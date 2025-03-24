from flask import Blueprint, jsonify, render_template, request
from app.utils.api_helpers import generate_swagger_spec
import json
import os
from pathlib import Path
from app.services.logger import setup_logging

logger = setup_logging(__name__)

# Create blueprint
api_docs_bp = Blueprint('api_docs', __name__)

@api_docs_bp.route('/docs')
def swagger_ui():
    """Render Swagger UI for API documentation."""
    try:
        # Generate Swagger specification
        swagger_spec = generate_swagger_spec('config/ApiDoc.json')
        
        # Convert to JSON string for embedding in template
        swagger_json = json.dumps(swagger_spec)
        
        return render_template('api/swagger_ui.html', 
                              swagger_spec=swagger_json,
                              active_page='api_docs')
    except Exception as e:
        logger.error(f"Error generating API documentation: {e}")
        return render_template('shared/error.html', error=str(e))

@api_docs_bp.route('/swagger.json', methods=['GET'])
def get_swagger_json():
    """
    Generate and return Swagger/OpenAPI JSON specification.
    
    Returns:
        JSON Swagger specification
    """
    try:
        # Get API config path, using environment variable or default
        api_config_path = os.environ.get('API_CONFIG_PATH', 'config/ApiDoc.json')
        
        # Generate Swagger spec
        swagger_spec = generate_swagger_spec(api_config_path)
        
        # Set CORS headers to allow Swagger UI to access the spec
        response = jsonify(swagger_spec)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
    
    except Exception as e:
        logger.error(f"Error generating Swagger spec: {e}", exc_info=True)
        return jsonify({"error": "Failed to generate API documentation"}), 500

@api_docs_bp.route('/export-swagger', methods=['GET'])
def export_swagger():
    """
    Export Swagger specification to a file.
    
    Returns:
        JSON response with export status
    """
    try:
        # Get API config path
        api_config_path = os.environ.get('API_CONFIG_PATH', 'config/ApiDoc.json')
        
        # Generate Swagger spec
        swagger_spec = generate_swagger_spec(api_config_path)
        
        # Export location
        export_dir = Path('exports')
        export_dir.mkdir(exist_ok=True)
        
        export_path = export_dir / 'swagger.json'
        
        # Write to file
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(swagger_spec, f, indent=2)
        
        return jsonify({
            "message": "Swagger specification exported successfully",
            "path": str(export_path)
        })
    
    except Exception as e:
        logger.error(f"Error exporting Swagger spec: {e}", exc_info=True)
        return jsonify({"error": "Failed to export API documentation"}), 500  
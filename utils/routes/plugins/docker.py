# utils/routes/plugins/docker.py

# Standard Imports
import json

# External Imports
from flask import Blueprint
from flask import current_app as app
from flask import jsonify
from flask import request
import docker

# Local Imports
from utils.database import db, Setting

# Create the blueprint
docker_bp = Blueprint('docker', __name__)

@docker_bp.route('/get_docker_config', methods=['GET'])
def get_docker_config():
    """
    Retrieve the current Docker configuration.

    This function fetches the Docker host IP, socket URL, and enabled status from the database.

    Returns:
        JSON: A JSON response containing the Docker configuration or an error message.
    """
    try:
        host_ip_setting = Setting.query.filter_by(key='docker_host_ip').first()
        socket_url_setting = Setting.query.filter_by(key='docker_socket_url').first()
        enabled_setting = Setting.query.filter_by(key='docker_enabled').first()

        config = {
            'hostIP': host_ip_setting.value if host_ip_setting else '',
            'socketURL': socket_url_setting.value if socket_url_setting else '',
            'enabled': enabled_setting.value.lower() == 'true' if enabled_setting else False
        }

        app.logger.debug(f"Retrieved Docker config: {config}")
        return jsonify({'success': True, 'config': config})
    except Exception as e:
        app.logger.error(f"Error retrieving Docker configuration: {str(e)}")
        return jsonify({'success': False, 'message': 'Error retrieving configuration'}), 500

@docker_bp.route('/save_docker_config', methods=['POST'])
def save_docker_config():
    """
    Save Docker configuration.

    This function saves the Docker host IP and socket URL to the database.

    Returns:
        JSON: A JSON response indicating success or failure of the operation.
    """
    data = request.json
    host_ip = data.get('hostIP')
    socket_url = data.get('socketURL')
    enabled = data.get('enabled', False)

    app.logger.debug(f"Saving Docker config: Host IP={host_ip}, Socket URL={socket_url}, Enabled={enabled}")

    if not host_ip or not socket_url:
        return jsonify({'success': False, 'message': 'Missing Host IP or Socket URL'}), 400

    try:
        # Save Host IP
        host_ip_setting = Setting.query.filter_by(key='docker_host_ip').first()
        if host_ip_setting:
            host_ip_setting.value = host_ip
        else:
            host_ip_setting = Setting(key='docker_host_ip', value=host_ip)
            db.session.add(host_ip_setting)

        # Save Socket URL
        socket_url_setting = Setting.query.filter_by(key='docker_socket_url').first()
        if socket_url_setting:
            socket_url_setting.value = socket_url
        else:
            socket_url_setting = Setting(key='docker_socket_url', value=socket_url)
            db.session.add(socket_url_setting)

        # Save enabled state
        enabled_setting = Setting.query.filter_by(key='docker_enabled').first()
        if enabled_setting:
            enabled_setting.value = str(enabled)
        else:
            enabled_setting = Setting(key='docker_enabled', value=str(enabled))
            db.session.add(enabled_setting)

        db.session.commit()
        app.logger.info("Docker configuration saved successfully")
        return jsonify({'success': True, 'message': 'Configuration saved successfully'})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error saving Docker configuration: {str(e)}")
        return jsonify({'success': False, 'message': 'Error saving configuration'}), 500

@docker_bp.route('/test_docker_connection', methods=['POST'])
def test_docker_connection():
    """
    Test Docker connection.

    This function tests the connection to Docker using the provided host IP and socket URL.

    Returns:
        JSON: A JSON response indicating success or failure of the connection test.
    """
    data = request.json
    host_ip = data.get('hostIP')
    socket_url = data.get('socketURL')

    if not host_ip or not socket_url:
        return jsonify({'success': False, 'message': 'Missing Host IP or Socket URL'}), 400

    try:
        client = docker.DockerClient(base_url=f"tcp://{host_ip}:2375")
        client.ping()
        app.logger.info("Docker connection test successful")
        return jsonify({'success': True, 'message': 'Connection successful'})
    except docker.errors.DockerException as e:
        app.logger.error(f"Error connecting to Docker: {str(e)}")
        return jsonify({'success': False, 'message': f'Error connecting to Docker: {str(e)}'}), 400
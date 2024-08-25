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
from utils.database import db, Setting, Port

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

    This function saves the Docker host IP, socket URL, and enabled status to the database.

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

    This function tests the connection to Docker using the provided configuration.
    It handles connections to local Docker instances (both Unix and Windows) and remote Docker daemons.

    Returns:
        JSON: A JSON response indicating success or failure of the connection test.
    """
    data = request.json
    host_ip = data.get('hostIP')
    socket_url = data.get('socketURL')

    if not socket_url:
        return jsonify({'success': False, 'message': 'Missing Socket URL'}), 400

    try:
        # Determine the appropriate connection method
        if host_ip in ('localhost', '127.0.0.1'):
            if socket_url.startswith('unix://'):
                # Unix socket connection
                client = docker.DockerClient(base_url=socket_url)
            else:
                # Windows named pipe or default connection
                client = docker.from_env()
        else:
            # Remote Docker daemon
            client = docker.DockerClient(base_url=f"tcp://{host_ip}:2375")

        # Test the connection
        client.ping()
        app.logger.info("Docker connection test successful")
        return jsonify({'success': True, 'message': 'Connection successful'})
    except docker.errors.DockerException as e:
        app.logger.error(f"Error connecting to Docker: {str(e)}")
        return jsonify({'success': False, 'message': f'Error connecting to Docker: {str(e)}'}), 400

@docker_bp.route('/discover_docker_ports', methods=['POST'])
def discover_docker_ports():
    """
    Discover ports from running Docker containers.

    This function connects to Docker, retrieves information about running containers,
    and returns their port mappings. It works with both local and remote Docker daemons.

    Returns:
        JSON: A JSON response containing discovered ports or an error message.
    """
    try:
        # Retrieve Docker configuration
        host_ip_setting = Setting.query.filter_by(key='docker_host_ip').first()
        socket_url_setting = Setting.query.filter_by(key='docker_socket_url').first()

        if not host_ip_setting or not socket_url_setting:
            return jsonify({'success': False, 'message': 'Docker configuration not found'}), 400

        host_ip = host_ip_setting.value
        socket_url = socket_url_setting.value

        # Determine the appropriate connection method
        if host_ip in ('localhost', '127.0.0.1'):
            if socket_url.startswith('unix://'):
                # Unix socket connection
                client = docker.DockerClient(base_url=socket_url)
            else:
                # Windows named pipe or default connection
                client = docker.from_env()
        else:
            # Remote Docker daemon
            client = docker.DockerClient(base_url=f"tcp://{host_ip}:2375")

        containers = client.containers.list()
        discovered_ports = []

        for container in containers:
            container_ports = container.ports
            for container_port, host_ports in container_ports.items():
                if host_ports:
                    for host_port in host_ports:
                        discovered_ports.append({
                            'container_name': container.name,
                            'container_id': container.id,
                            'container_port': container_port,
                            'host_ip': host_port['HostIp'] or host_ip,
                            'host_port': host_port['HostPort']
                        })

        return jsonify({'success': True, 'ports': discovered_ports})
    except Exception as e:
        app.logger.error(f"Error discovering Docker ports: {str(e)}")
        return jsonify({'success': False, 'message': f'Error discovering Docker ports: {str(e)}'}), 500

@docker_bp.route('/add_discovered_port', methods=['POST'])
def add_discovered_port():
    """
    Add a discovered Docker port to the PortAll database.

    This function receives port information from a discovered Docker container
    and adds it to the PortAll database.

    Returns:
        JSON: A JSON response indicating success or failure of the operation.
    """
    data = request.json
    host_ip = data.get('host_ip')
    host_port = data.get('host_port')
    container_name = data.get('container_name')
    container_port = data.get('container_port')

    if not all([host_ip, host_port, container_name, container_port]):
        return jsonify({'success': False, 'message': 'Missing required port information'}), 400

    try:
        # Check if the port already exists
        existing_port = Port.query.filter_by(ip_address=host_ip, port_number=host_port).first()
        if existing_port:
            return jsonify({'success': False, 'message': 'Port already exists in database'}), 400

        # Add the new port
        new_port = Port(
            ip_address=host_ip,
            port_number=host_port,
            description=f"{container_name}",
            port_protocol="TCP"  # Assuming TCP, will need to be updated if UDP ports are discovered
        )
        db.session.add(new_port)
        db.session.commit()

        app.logger.info(f"Added discovered Docker port: {host_ip}:{host_port}")
        return jsonify({'success': True, 'message': 'Docker port added successfully'})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error adding discovered Docker port: {str(e)}")
        return jsonify({'success': False, 'message': f'Error adding discovered Docker port: {str(e)}'}), 500
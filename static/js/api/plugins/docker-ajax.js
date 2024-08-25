// static/js/api/plugins/docker-ajax.js

import { updateConnectionStatus } from '../../plugins/docker.js';

/**
 * Displays a notification message
 * @param {string} message - The message to display
 * @param {string} [type='success'] - The type of notification ('success' or 'error')
 */
function showNotification(message, type = 'success') {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const notification = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    $('#notification-area').html(notification);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        $('.alert').alert('close');
    }, 5000);
}

/**
 * Checks if the Docker plugin is enabled and updates the tab visibility.
 */
export function updateDockerTabVisibility() {
    $.ajax({
        url: '/get_docker_config',
        method: 'GET',
        success: function (response) {
            if (response.success && response.config) {
                if (response.config.enabled) {
                    $('.docker-tab').removeClass('hidden');
                } else {
                    $('.docker-tab').addClass('hidden');
                }
                updateConnectionStatus(response.config.enabled);
            } else {
                console.error('Error fetching Docker config:', response.message);
                $('.docker-tab').addClass('hidden');
                updateConnectionStatus(false);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error fetching Docker config:', error);
            $('.docker-tab').addClass('hidden');
            updateConnectionStatus(false);
        }
    });
}

/**
 * Saves the Docker configuration to the server.
 * @param {string} hostIP - The Docker host IP.
 * @param {string} socketURL - The Docker socket URL.
 * @param {boolean} enabled - Whether the Docker plugin is enabled.
 */
export function saveDockerConfig(hostIP, socketURL, enabled) {
    $.ajax({
        url: '/save_docker_config',
        method: 'POST',
        data: JSON.stringify({ hostIP: hostIP, socketURL: socketURL, enabled: enabled }),
        contentType: 'application/json',
        success: function (response) {
            if (response.success) {
                showNotification('Docker configuration saved successfully', 'success');
                updateConnectionStatus(true);
                updateDockerTabVisibility();
            } else {
                showNotification('Error saving Docker configuration: ' + response.message, 'error');
                updateConnectionStatus(false);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error saving Docker configuration:', error);
            showNotification('Error saving Docker configuration: ' + error, 'error');
            updateConnectionStatus(false);
        }
    });
}

/**
 * Saves the Docker settings to the server.
 * @param {string} dockerIP - The Docker IP address.
 * @param {string} dockerURL - The Docker URL.
 */
export function saveDockerSettings(dockerIP, dockerURL) {
    $.ajax({
        url: '/docker_settings',
        method: 'POST',
        data: {
            docker_ip: dockerIP,
            docker_url: dockerURL
        },
        success: function (response) {
            if (response.success) {
                showNotification('Docker settings saved successfully', 'success');
                updateConnectionStatus(true);
            } else {
                showNotification('Error saving Docker settings: ' + response.message, 'error');
                updateConnectionStatus(false);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error saving Docker settings:', error);
            showNotification('Error saving Docker settings: ' + error, 'error');
            updateConnectionStatus(false);
        }
    });
}

/**
 * Tests the Docker configuration by attempting to connect to the Docker instance.
 * @param {string} hostIP - The Docker host IP to test.
 * @param {string} socketURL - The Docker socket URL to use for connection.
 */
export function testDockerConnection(hostIP, socketURL) {
    $.ajax({
        url: '/test_docker_connection',
        method: 'POST',
        data: JSON.stringify({ hostIP: hostIP, socketURL: socketURL }),
        contentType: 'application/json',
        success: function (response) {
            if (response.success) {
                showNotification('Docker connection successful', 'success');
                updateConnectionStatus(true);
            } else {
                showNotification('Error connecting to Docker: ' + response.message, 'error');
                updateConnectionStatus(false);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error connecting to Docker:', error);
            showNotification('Error connecting to Docker: ' + error, 'error');
            updateConnectionStatus(false);
        }
    });
}

/**
 * Fetches the current Docker configuration from the server.
 * @param {function} callback - Function to call with the fetched configuration.
 */
export function fetchDockerConfig(callback) {
    $.ajax({
        url: '/get_docker_config',
        method: 'GET',
        success: function (response) {
            if (response.success) {
                callback(response.config);
            } else {
                console.error('Error fetching Docker config:', response.message);
                showNotification('Error fetching Docker configuration', 'error');
                callback(null);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error fetching Docker config:', error);
            showNotification('Error fetching Docker configuration', 'error');
            callback(null);
        }
    });
}

/**
 * Discovers ports from running Docker containers and updates the UI.
 */
export function discoverDockerPorts() {
    $.ajax({
        url: '/discover_docker_ports',
        method: 'POST',
        success: function (response) {
            if (response.success) {
                addDiscoveredPorts(response.ports);
            } else {
                showNotification('Error discovering Docker ports: ' + response.message, 'error');
            }
        },
        error: function (xhr, status, error) {
            console.error('Error discovering Docker ports:', error);
            showNotification('Error discovering Docker ports: ' + error, 'error');
        }
    });
}

/**
 * Adds discovered Docker ports to the PortAll database and updates the UI.
 * @param {Array} ports - Array of discovered port objects
 */
function addDiscoveredPorts(ports) {
    ports.forEach(port => {
        $.ajax({
            url: '/add_discovered_port',
            method: 'POST',
            data: JSON.stringify(port),
            contentType: 'application/json',
            success: function (response) {
                if (response.success) {
                    updatePortsUI(port);
                } else {
                    console.error('Error adding discovered port:', response.message);
                }
            },
            error: function (xhr, status, error) {
                console.error('Error adding discovered port:', error);
            }
        });
    });
    showNotification('Docker ports discovered and added successfully', 'success');
}

/**
 * Updates the ports UI with a newly discovered port.
 * @param {Object} port - The port object to add to the UI
 */
function updatePortsUI(port) {
    const switchPanel = $(`.switch-panel[data-ip="${port.host_ip}"]`);
    if (switchPanel.length === 0) {
        // If the IP doesn't exist, create a new network switch
        createNewNetworkSwitch(port);
    } else {
        // If the IP exists, add the port to the existing switch panel
        const newPortElement = createPortElement(port);
        switchPanel.find('.add-port-slot').before(newPortElement);
    }
}

/**
 * Creates a new network switch for a newly discovered IP.
 * @param {Object} port - The port object containing the new IP
 */
function createNewNetworkSwitch(port) {
    const newSwitch = `
        <div class="network-switch" draggable="true" data-ip="${port.host_ip}">
            <h2 class="switch-label">${port.host_ip}</h2>
            <div class="sort-buttons"></div>
            <a href="#" class="edit-ip" data-ip="${port.host_ip}" data-nickname=""></a>
            <div class="switch-panel" data-ip="${port.host_ip}">
                ${createPortElement(port)}
                <div class="port-slot add-port-slot">
                    <div class="add-port" data-ip="${port.host_ip}">
                        <span class="add-port-icon">+</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    $('#notification-area').after(newSwitch);
}

/**
 * Creates a new port element for the UI.
 * @param {Object} port - The port object to create an element for
 * @returns {string} HTML string for the new port element
 */
function createPortElement(port) {
    return `
        <div class="port-slot" draggable="true" data-port="${port.host_port}" data-order="0">
            <div class="port active" data-ip="${port.host_ip}" data-port="${port.host_port}"
                 data-description="${port.container_name}"
                 data-order="0" data-id="" data-protocol="TCP">
                <span class="port-number">${port.host_port}</span>
                <span class="port-description">${port.container_name}</span>
                <div class="port-tooltip">${port.container_name}</div>
            </div>
            <p class="port-protocol">TCP</p>
        </div>
    `;
}
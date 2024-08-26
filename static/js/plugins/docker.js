// static/js/plugins/docker.js

import { saveDockerConfig, testDockerConnection, fetchDockerConfig, updateDockerTabVisibility, discoverDockerPorts } from '../api/plugins/docker-ajax.js';
import { logPluginsConfig } from '../utils/logger.js';

let isInitialized = false;

/**
 * Initialize Docker-related event listeners and UI elements.
 * This function sets up all necessary event listeners for the Docker plugin
 * and performs initial checks and logging if the plugin is enabled.
 */
export function initDockerSettings() {
    const saveButton = document.getElementById('save-docker-settings');
    const testButton = document.getElementById('test-docker-connection');
    const dockerHostIp = document.getElementById('docker-host-ip');
    const dockerSocketUrl = document.getElementById('docker-socket-url');
    const dockerEnabledButton = document.getElementById('docker-enabled');
    const discoverPortsButton = document.getElementById('discover-docker-ports');

    if (saveButton) {
        saveButton.addEventListener('click', handleSaveDockerSettings);
    } else {
        console.error('Save button not found');
    }

    if (testButton) {
        testButton.addEventListener('click', handleTestDockerConnection);
    } else {
        console.error('Test button not found');
    }

    if (dockerHostIp && dockerSocketUrl) {
        dockerHostIp.addEventListener('input', checkDockerFields);
        dockerSocketUrl.addEventListener('input', checkDockerFields);
    }

    if (dockerEnabledButton) {
        dockerEnabledButton.addEventListener('change', handleDockerEnabledChange);
    } else {
        console.error('Docker enabled checkbox not found');
    }

    if (discoverPortsButton) {
        discoverPortsButton.addEventListener('click', handleDiscoverDockerPorts);
    } else {
        console.error('Discover ports button not found');
    }

    // Load saved configuration
    fetchDockerConfig((config) => {
        if (config) {
            document.getElementById('docker-host-ip').value = config.hostIP || '';
            document.getElementById('docker-socket-url').value = config.socketURL || '';
            document.getElementById('docker-enabled').checked = config.enabled;
            checkDockerFields();
            if (config.enabled) {
                logPluginsConfig("docker", { hostIP: config.hostIP, socketURL: config.socketURL });
            }
        }
    });
}

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
 * Handle saving Docker settings.
 * Retrieves Host IP and Socket URL from input fields and calls the saveDockerConfig function.
 */
function handleSaveDockerSettings() {
    const hostIP = document.getElementById('docker-host-ip').value;
    const socketURL = document.getElementById('docker-socket-url').value;
    const enabled = document.getElementById('docker-enabled').checked;

    if (!hostIP || !socketURL) {
        showNotification('Please enter both Host IP and Socket URL', 'error');
        return;
    }

    // Save Docker configuration
    saveDockerConfig(hostIP, socketURL, enabled);

    // Save Docker settings
    saveDockerSettings(hostIP, socketURL);
}

/**
 * Handle testing Docker connection.
 * Retrieves Host IP and Socket URL from input fields and calls the testDockerConnection function.
 */
function handleTestDockerConnection() {
    const hostIP = document.getElementById('docker-host-ip').value;
    const socketURL = document.getElementById('docker-socket-url').value;

    if (!hostIP || !socketURL) {
        showNotification('Please enter both Host IP and Socket URL', 'error');
        return;
    }

    testDockerConnection(hostIP, socketURL);
}

/**
 * Update Docker connection status in the UI.
 *
 * @param {boolean} isConnected - Whether the Docker connection is successful.
 */
export function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('docker-connection-status');
    if (statusElement) {
        statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
        statusElement.className = isConnected ? 'text-success' : 'text-danger';
    }
}

/**
 * Handle changes to the Docker enabled checkbox.
 */
export function handleDockerEnabledChange() {
    const isEnabled = document.getElementById('docker-enabled').checked;
    const hostIP = document.getElementById('docker-host-ip').value;
    const socketURL = document.getElementById('docker-socket-url').value;

    if (isEnabled && (!hostIP || !socketURL)) {
        showNotification('Please enter both Host IP and Socket URL before enabling Docker', 'error');
        document.getElementById('docker-enabled').checked = false;
        return;
    }

    saveDockerConfig(hostIP, socketURL, isEnabled);
    if (isEnabled) {
        logPluginsConfig("docker", { hostIP, socketURL });
    }
}

/**
 * Check if Docker fields are populated and update UI accordingly.
 * This function enables or disables the Docker checkbox based on whether
 * both the Host IP and Socket URL fields have been filled.
 */
function checkDockerFields() {
    const hostIP = document.getElementById('docker-host-ip').value.trim();
    const socketURL = document.getElementById('docker-socket-url').value.trim();
    const enabledCheckbox = document.getElementById('docker-enabled');

    if (hostIP && socketURL) {
        enabledCheckbox.disabled = false;
        enabledCheckbox.title = "Enable Docker integration";
    } else {
        enabledCheckbox.disabled = true;
        enabledCheckbox.checked = false;
        enabledCheckbox.title = "Please configure Docker first before enabling it";
    }
}

/**
 * Update the list of enabled plugins in the UI.
 * This function updates the UI to reflect the current state of the Docker plugin
 * (enabled or disabled) and logs the configuration if the plugin is enabled.
 */
function updateEnabledPlugins() {
    const $enabledPlugins = $('#enabled-plugins');
    $enabledPlugins.empty(); // Clear existing entries
    const isEnabled = $('#docker-enabled').is(':checked');
    if (isEnabled) {
        $enabledPlugins.append(`
            <div class="enabled-plugin">
                <div class="plugin-info">
                    <span class="plugin-name">Docker</span>: <span class="plugin-description">Connects Portall to your Docker instance</span>
                </div>
                <button class="btn btn-sm btn-danger disable-plugin" data-plugin="docker-enabled">Disable</button>
            </div>
        `);

        // Log plugin info when enabled
        const hostIP = document.getElementById('docker-host-ip').value;
        const socketURL = document.getElementById('docker-socket-url').value;
        logPluginsConfig("docker", { hostIP: hostIP, socketURL: socketURL });
    }

    $('.disable-plugin').off('click').on('click', function () {
        const pluginId = $(this).data('plugin');
        const checkbox = $(`#${pluginId}`);
        checkbox.prop('checked', false);
        checkbox.trigger('change');
        updateEnabledPlugins();
        handleDockerEnabledChange();
    });
}

/**
 * Handle discovering Docker ports.
 * Calls the discoverDockerPorts function when the discover ports button is clicked.
 */
function handleDiscoverDockerPorts() {
    discoverDockerPorts();
}

export { saveDockerConfig, updateDockerTabVisibility };
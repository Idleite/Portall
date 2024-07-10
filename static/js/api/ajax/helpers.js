// js/api/ajax/helpers.js

import { showNotification } from '../../ui/helpers.js';
import { cancelDrop } from '../../utils/dragDropUtils.js';

/**
 * Move a port from one IP address to another.
 * Sends an AJAX request to move the port and updates the port order.
 *
 * @param {number} portNumber - The port number being moved
 * @param {string} sourceIp - The source IP address
 * @param {string} targetIp - The target IP address
 * @param {HTMLElement} targetElement - The target element for insertion
 * @param {HTMLElement} draggingElement - The element being dragged
 * @param {function} updatePortOrder - Function to update the port order
 * @param {function} cancelDropFn - Function to cancel the drop operation
 */
export function movePort(portNumber, sourceIp, targetIp, targetElement, draggingElement, updatePortOrder, cancelDropFn) {
    $.ajax({
        url: '/move_port',
        method: 'POST',
        data: {
            port_number: portNumber,
            source_ip: sourceIp,
            target_ip: targetIp
        },
        success: function (response) {
            if (response.success) {
                // Update port order for both source and target IPs
                updatePortOrder(sourceIp);
                if (sourceIp !== targetIp) {
                    updatePortOrder(targetIp);
                }
            } else {
                showNotification('Error moving port: ' + response.message, 'error');
                cancelDropFn();
            }
        },
        error: function (xhr, status, error) {
            showNotification('Error moving port: ' + error, 'error');
            cancelDropFn();
        }
    });
}

/**
 * Edit an IP address.
 * Sends an AJAX request to update the IP address and updates the DOM.
 *
 * @param {Object} formData - The form data containing the IP address information
 */
export function editIp(formData) {
    $.ajax({
        url: '/edit_ip',
        method: 'POST',
        data: formData,
        success: function (response) {
            if (response.success) {
                showNotification('IP updated successfully', 'success');
                // Update the DOM dynamically
                const oldIp = $('#old-ip').val();
                const newIp = $('#new-ip').val();
                const nickname = $('#new-nickname').val();
                const editIpElement = $(`.edit-ip[data-ip="${oldIp}"]`);

                // Update the data attributes of the edit button
                editIpElement.data('ip', newIp).data('nickname', nickname);
                editIpElement.attr('data-ip', newIp).attr('data-nickname', nickname);

                // Update the IP label
                const switchLabel = editIpElement.closest('.switch-label');
                switchLabel.contents().first().replaceWith(newIp + (nickname ? ' (' + nickname + ')' : ''));
            } else {
                showNotification('Error updating IP: ' + response.message, 'error');
            }
            $('#editIpModal').modal('hide');
        },
        error: function (xhr, status, error) {
            showNotification('Error updating IP: ' + error, 'error');
            $('#editIpModal').modal('hide');
        }
    });
}

/**
 * Delete an IP address.
 * Sends an AJAX request to delete the IP address and removes it from the DOM.
 *
 * @param {string} ip - The IP address to delete
 */
export function deleteIp(ip) {
    $.ajax({
        url: '/delete_ip',
        method: 'POST',
        data: { ip: ip },
        success: function (response) {
            if (response.success) {
                showNotification('IP and all assigned ports deleted successfully', 'success');
                // Remove the IP panel from the DOM
                $(`.network-switch:has(.switch-label:contains("${ip}"))`).remove();
            } else {
                showNotification('Error deleting IP: ' + response.message, 'error');
            }
            $('#deleteIpModal').modal('hide');
        },
        error: function (xhr, status, error) {
            showNotification('Error deleting IP: ' + error, 'error');
            $('#deleteIpModal').modal('hide');
        }
    });
}

/**
 * Edit a port's details.
 * Sends an AJAX request to update the port information and updates the DOM.
 *
 * @param {Object} formData - The form data containing the port information
 */
export function editPort(formData) {
    $.ajax({
        url: '/edit_port',
        method: 'POST',
        data: formData,
        success: function (response) {
            if (response.success) {
                showNotification('Port updated successfully', 'success');
                // Update the DOM dynamically
                const ip = $('#edit-port-ip').val();
                const oldPortNumber = $('#old-port-number').val();
                const newPortNumber = $('#new-port-number').val();
                const description = $('#port-description').val();
                const portElement = $(`.port[data-ip="${ip}"][data-port="${oldPortNumber}"]`);
                portElement.data('port', newPortNumber).data('description', description);
                portElement.attr('data-port', newPortNumber).attr('data-description', description);
                portElement.find('.port-number').text(newPortNumber);
                portElement.find('.port-description').text(description);

                // Refresh the page to ensure all data is correctly displayed
                location.reload();
            } else {
                showNotification('Error updating port: ' + response.message, 'error');
            }
            $('#editPortModal').modal('hide');
        },
        error: function (xhr, status, error) {
            showNotification('Error updating port: ' + error, 'error');
            $('#editPortModal').modal('hide');
        }
    });
}

/**
 * Add a new port.
 * Sends an AJAX request to add a port and reloads the page on success.
 *
 * @param {Object} formData - The form data containing the new port information
 */
export function addPort(formData) {
    $.ajax({
        url: '/add_port',
        method: 'POST',
        data: formData,
        success: function (response) {
            if (response.success) {
                showNotification('Port added successfully', 'success');
                location.reload();
            } else {
                showNotification('Error adding port: ' + response.message, 'error');
            }
            $('#addPortModal').modal('hide');
        },
        error: function (xhr, status, error) {
            showNotification('Error adding port: ' + error, 'error');
            $('#addPortModal').modal('hide');
        }
    });
}

/**
 * Delete a port.
 * Sends an AJAX request to delete a port and removes it from the DOM.
 *
 * @param {string} ip - The IP address of the port
 * @param {number} portNumber - The port number to delete
 */
export function deletePort(ip, portNumber) {
    $.ajax({
        url: '/delete_port',
        method: 'POST',
        data: { ip: ip, port_number: portNumber },
        success: function (response) {
            if (response.success) {
                showNotification('Port deleted successfully', 'success');
                // Remove the port from the DOM
                $(`.port[data-ip="${ip}"][data-port="${portNumber}"]`).parent().remove();
            } else {
                showNotification('Error deleting port: ' + response.message, 'error');
            }
            $('#deletePortModal').modal('hide');
        },
        error: function (xhr, status, error) {
            showNotification('Error deleting port: ' + error, 'error');
            $('#deletePortModal').modal('hide');
        }
    });
}

/**
 * Change the port number.
 * Sends an AJAX request to change the port number and executes a callback on success.
 *
 * @param {string} ip - The IP address of the port
 * @param {number} oldPortNumber - The current port number
 * @param {number} newPortNumber - The new port number
 * @param {function} callback - The callback function to execute on success
 */
export function changePortNumber(ip, oldPortNumber, newPortNumber, callback) {
    $.ajax({
        url: '/change_port_number',
        method: 'POST',
        data: {
            ip: ip,
            old_port_number: oldPortNumber,
            new_port_number: newPortNumber
        },
        success: function (response) {
            if (response.success) {
                showNotification('Port number changed successfully', 'success');
                if (callback) callback();
            } else {
                showNotification('Error changing port number: ' + response.message, 'error');
            }
        },
        error: function (xhr, status, error) {
            showNotification('Error changing port number: ' + error, 'error');
        }
    });
}

/**
 * Export all entries as a JSON file.
 * Sends a GET request to fetch the export data and triggers a download.
 */
export function exportEntries() {
    fetch('/export_entries', {
        method: 'GET',
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // Get the filename from the Content-Disposition header
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'export.json';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch.length === 2)
                    filename = filenameMatch[1];
            }

            return response.blob().then(blob => ({ blob, filename }));
        })
        .then(({ blob, filename }) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            showNotification('Data exported successfully', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error exporting data: ' + error.message, 'error');
        });
}
// js/api/ports-ajax.js

import { showNotification } from '../ui/helpers.js';
import { copyToClipboard } from '../core/new.js';

/**
 * Move a port from one IP address to another.
 *
 * This function sends an AJAX request to move a port between IP addresses and updates the port order.
 * It logs the attempt, processes the server response, and calls appropriate callbacks based on the result.
 *
 * @param {number} portNumber - The port number being moved
 * @param {string} sourceIp - The source IP address
 * @param {string} targetIp - The target IP address
 * @param {string} protocol - The protocol of the port (TCP or UDP)
 * @param {function} successCallback - Function to call on successful move, receives updated port data
 * @param {function} errorCallback - Function to call on move error
 * @throws {Error} Throws an error if the AJAX request fails
 */
export function movePort(portNumber, sourceIp, targetIp, protocol, successCallback, errorCallback) {
    console.log(`Attempting to move port: ${portNumber} (${protocol}) from ${sourceIp} to ${targetIp}`);
    $.ajax({
        url: '/move_port',
        method: 'POST',
        data: {
            port_number: portNumber,
            source_ip: sourceIp,
            target_ip: targetIp,
            protocol: protocol.toUpperCase()  // Ensure protocol is uppercase
        },
        success: function (response) {
            console.log('Server response:', response);
            if (response.success) {
                if (typeof successCallback === 'function') {
                    successCallback(response.port);  // Pass the updated port data
                }
            } else {
                showNotification('Error moving port: ' + response.message, 'error');
                if (typeof errorCallback === 'function') {
                    errorCallback();
                }
            }
        },
        error: function (xhr, status, error) {
            console.log('Error response:', xhr.responseText);
            showNotification('Error moving port: ' + error, 'error');
            if (typeof errorCallback === 'function') {
                errorCallback();
            }
        }
    });
}

/**
 * Edit an IP address.
 *
 * This function sends an AJAX request to update an IP address and updates the DOM accordingly.
 * It handles both the server communication and the UI updates for editing an IP address.
 *
 * @param {Object} formData - The form data containing the IP address information
 * @param {string} formData.old_ip - The original IP address being edited
 * @param {string} formData.new_ip - The new IP address
 * @param {string} formData.nickname - The nickname for the IP address (optional)
 * @throws {Error} Throws an error if the AJAX request fails
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
 *
 * This function sends an AJAX request to delete an IP address and removes it from the DOM.
 * It handles both the server communication and the UI updates for deleting an IP address.
 *
 * @param {string} ip - The IP address to delete
 * @throws {Error} Throws an error if the AJAX request fails
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
 *
 * This function sends an AJAX request to update port information and updates the DOM.
 * It handles both the server communication and the UI updates for editing a port.
 *
 * @param {Object} formData - The form data containing the port information
 * @param {string} formData.ip - The IP address of the port
 * @param {number} formData.old_port_number - The current port number
 * @param {number} formData.new_port_number - The new port number
 * @param {string} formData.description - The updated description for the port
 * @throws {Error} Throws an error if the AJAX request fails
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
 *
 * This function sends an AJAX request to add a new port and reloads the page on success.
 * It handles the server communication for adding a new port to an IP address.
 *
 * @param {Object} formData - The form data containing the new port information
 * @param {string} formData.ip - The IP address for the new port
 * @param {number} formData.port_number - The new port number
 * @param {string} formData.protocol - The protocol of the new port (TCP or UDP)
 * @param {string} formData.description - The description for the new port
 * @throws {Error} Throws an error if the AJAX request fails
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
 * Generates a new random port for an IP.
 *
 * This function sends an AJAX request to generate a new random port for a given IP address.
 * It handles the server communication and updates the UI with the generated port information.
 *
 * @param {Object} formData - The form data containing the IP information
 * @param {string} formData.ip - The IP address for which to generate a new port
 * @throws {Error} Throws an error if the AJAX request fails
 */
export function generatePort(formData) {
    // Send AJAX request to generate port
    $.ajax({
        url: '/generate_port',
        method: 'POST',
        data: formData,
        success: function (response) {
            console.log('Port generated successfully:', response);
            // Display the generated URL with a copy button
            $('#result').html(`
                        <div class="alert alert-success" role="alert">
                            Generated URL: ${response.full_url}
                            <button class="btn btn-sm btn-secondary ms-2 copy-btn" data-url="${response.full_url}">Copy</button>
                        </div>
                    `);
            // Add click event for the copy button
            $('.copy-btn').click(function () {
                copyToClipboard($(this).data('url'));
            });
        },
        error: function (xhr, status, error) {
            console.error('Error generating port:', status, error);
            // Display error message
            $('#result').html(`
                        <div class="alert alert-danger" role="alert">
                            Error: ${xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error occurred'}
                        </div>
                    `);
        }
    });
}

/**
 * Delete a port.
 *
 * This function sends an AJAX request to delete a specific port and removes it from the DOM.
 * It handles both the server communication and the UI updates for deleting a port.
 *
 * @param {string} ip - The IP address of the port
 * @param {number} portNumber - The port number to delete
 * @throws {Error} Throws an error if the AJAX request fails
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
 *
 * This function sends an AJAX request to change a port number and executes a callback on success.
 * It handles the server communication for updating a port number for a given IP address.
 *
 * @param {string} ip - The IP address of the port
 * @param {number} oldPortNumber - The current port number
 * @param {number} newPortNumber - The new port number
 * @param {function} callback - The callback function to execute on successful port number change
 * @throws {Error} Throws an error if the AJAX request fails
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
 *
 * This function sends a GET request to fetch the export data and triggers a download of the resulting JSON file.
 * It handles the server communication, file naming, and initiating the download process.
 *
 * @throws {Error} Throws an error if the fetch request fails or if there's an issue with the file download
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

/**
 * Update the order of ports for a specific IP address.
 *
 * This function sends an AJAX request to update the port order on the server for a given IP address.
 * It handles the server communication for reordering ports and provides feedback on the operation's success.
 *
 * @param {string} ip - The IP address for which to update the port order
 * @param {Array<number>} portOrder - An array of port numbers in the new order
 * @throws {Error} Throws an error if the AJAX request fails
 */
export function updatePortOrder(ip, portOrder) {
    $.ajax({
        url: '/update_port_order',
        method: 'POST',
        data: JSON.stringify({
            ip: ip,
            port_order: portOrder
        }),
        contentType: 'application/json',
        success: function (response) {
            if (response.success) {
                console.log('Port order updated successfully');
            } else {
                console.error('Error updating port order:', response.message);
                showNotification('Error updating port order: ' + response.message, 'error');
            }
        },
        error: function (xhr, status, error) {
            console.error('Error updating port order:', error);
            showNotification('Error updating port order: ' + error, 'error');
        }
    });
}

/**
 * Get the copy format setting from the server.
 * @returns {Promise<string>} A promise that resolves to either 'port_only' or 'full_url'.
 */
export function getCopyFormat() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/port_settings',
            method: 'GET',
            success: function (data) {
                resolve(data.copy_format || 'port_only');   // Default to 'port_only' if not set
            },
            error: function (xhr, status, error) {
                console.error('Error getting copy format:', status, error);
                reject(error);
            }
        });
    });
}

/**
 * Purge all entries from the database.
 *
 * This function sends an AJAX request to delete all entries from the database.
 * It handles the server communication for the purge operation, provides feedback,
 * and closes the confirmation modal upon successful completion.
 *
 * @param {HTMLElement} confirmModalElement - The DOM element of the confirmation modal
 * @throws {Error} Throws an error if the AJAX request fails
 */
export function purgeEntries(confirmModalElement) {
    $.ajax({
        url: '/purge_entries',
        method: 'POST',
        success: function (response) {
            console.log('Entries purged successfully:', response);
            showNotification(response.message);
            bootstrap.Modal.getInstance(confirmModalElement).hide();
        },
        error: function (xhr, status, error) {
            console.error('Error purging entries:', status, error);
            showNotification('Error purging entries: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error occurred'), 'error');
        }
    });
}
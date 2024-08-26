// static/js/new.js

/**
 * Application: New Port / IP Address Generator
 * Description: AJAX requests for managing IP addresses and
 * generating ports based on user input.
 */

import { showNotification } from '../ui/helpers.js';
import { generatePort, getCopyFormat } from '../api/ports-ajax.js';

$(document).ready(function () {
    console.log('Document ready');
    const ipSelect = $('#ip-address');

    const modalElement = document.getElementById('newIpModal');
    if (modalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        newIpModal = new bootstrap.Modal(modalElement);
    }

    /**
     * Event handler for the "Add IP" button.
     * Opens a modal for adding a new IP address and nickname.
     */
    $('#add-ip-btn').click(function () {
        console.log('Add IP button clicked');
        $('#new-ip').val('');
        $('#new-nickname').val('');
        newIpModal.show();
    });

    /**
     * Event handler for saving a new IP address.
     * Validates the IP, adds it to the select dropdown, and closes the modal.
     */
    $('#save-new-ip').click(function () {
        console.log('Save new IP clicked');
        const newIp = $('#new-ip').val().trim();
        const newNickname = $('#new-nickname').val().trim();
        if (isValidIpAddress(newIp)) {
            console.log('New IP:', newIp, 'Nickname:', newNickname);
            const optionText = newIp + (newNickname ? ` (${newNickname})` : '');
            // Add the new IP to the dropdown if it doesn't already exist
            if ($(`#ip-address option[value="${newIp}"]`).length === 0) {
                ipSelect.append(new Option(optionText, newIp));
            }
            ipSelect.val(newIp);
            newIpModal.hide();
        } else {
            console.log('Invalid IP');
            alert('Please enter a valid IP address');
        }
    });

    /**
     * Event handler for form submission.
     * Prevents default form submission, validates input, and sends an AJAX request
     * to generate a port based on the selected IP address and other inputs.
     */
    $('#port-form').submit(function (e) {
        e.preventDefault();
        const ipAddress = ipSelect.val();
        const selectedOption = ipSelect.find('option:selected');
        const nickname = selectedOption.text().match(/\((.*?)\)/)?.[1] || '';
        const portProtocol = $('#protocol').val();
        if (!ipAddress) {
            alert('Please select or enter an IP address');
            return;
        }

        // Send AJAX request to generate port
        const formData = {
            ip_address: ipAddress,
            nickname: nickname,
            description: $('#description').val(),
            protocol: portProtocol
        }
        generatePort(formData)
    });
});

/**
 * Validates an IP address.
 * @param {string} ip - The IP address to validate.
 * @returns {boolean} True if the IP address is valid, false otherwise.
 */
function isValidIpAddress(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
        const parts = ip.split('.');
        return parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
    }
    return false;
}

/**
 * Copies the given URL to the clipboard.
 * Uses the Clipboard API if available, otherwise falls back to a manual method.
 * @param {string} url - The URL to copy to the clipboard.
 */
export function copyToClipboard(url) {
    getCopyFormat().then(format => {
        let textToCopy;
        if (format === 'port_only') {
            const port = url.split(':').pop();
            textToCopy = port;
        } else {
            textToCopy = url;
        }

        if (navigator.clipboard) {
            navigator.clipboard.writeText(textToCopy).then(function () {
                showNotification('Copied to clipboard!');
            }, function (err) {
                console.error('Could not copy text: ', err);
                fallbackCopyTextToClipboard(textToCopy);
            });
        } else {
            fallbackCopyTextToClipboard(textToCopy);
        }
    }).catch(error => {
        console.error('Error getting copy format:', error);
        showNotification('Error getting copy format', 'error');
    });
}

/**
 * Fallback method to copy text to clipboard for browsers that don't support the Clipboard API.
 * Creates a temporary textarea element, selects its content, and uses document.execCommand('copy').
 * @param {string} text - The text to copy to the clipboard.
 */
function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
        alert('Copied to clipboard!');
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        alert('Failed to copy to clipboard. Please copy manually.');
    }

    document.body.removeChild(textArea);
}
// static/js/api/ajax/settings.js

import { showNotification } from '../ui/helpers.js';

/**
 * Saves theme settings and applies them.
 *
 * @param {Event} event - The form submission event.
 * @param {Function} cssEditor - A function to apply custom CSS.
 * @throws {Error} If there's an issue saving the settings.
 */
export function saveThemeSettings(event, cssEditor) {
    $.ajax({
        url: '/settings',
        method: 'POST',
        data: $(event.target).serialize(),
        success: function (response) {
            console.log('Settings saved successfully:', response);
            // Apply custom CSS immediately
            cssEditor($('#custom-css').val());
            // Reload the page to apply the new theme
            location.reload();
            showNotification('Settings saved successfully!');
        },
        error: function (xhr, status, error) {
            console.error('Error saving settings:', status, error);
            showNotification('Error saving settings.', 'error');
        }
    });
}

/**
 * Loads and updates the port settings UI.
 *
 * @param {Function} updatePortLengthStatus - A function to update the port length status in the UI.
 * @throws {Error} If there's an issue loading the port settings.
 */
export function loadPortSettings(updatePortLengthStatus) {
    $.ajax({
        url: '/port_settings',
        method: 'GET',
        success: function (data) {
            console.log("Loaded Port Settings:", data);

            // Clear all fields first
            $('#port-start, #port-end, #port-exclude').val('');
            $('input[name="port_length"]').prop('checked', false);
            $('input[name="copy_format"]').prop('checked', false);

            // Then set values only if they exist in the data
            if (data.port_start) $('#port-start').val(data.port_start);
            if (data.port_end) $('#port-end').val(data.port_end);
            if (data.port_exclude) $('#port-exclude').val(data.port_exclude);
            if (data.port_length) {
                $(`input[name="port_length"][value="${data.port_length}"]`).prop('checked', true);
            }

            // Always set a value for copy_format
            const copyFormat = data.copy_format || 'port_only';
            $(`input[name="copy_format"][value="${copyFormat}"]`).prop('checked', true);

            updatePortLengthStatus();
        },
        error: function (xhr, status, error) {
            console.error('Error loading port settings:', status, error);
            showNotification('Error loading port settings.', 'error');
        }
    });
}

/**
 * Saves and updates the port settings UI.
 *
 * @param {Object} formData - The form data containing port settings.
 * @param {Function} loadPortSettings - A function to reload the port settings after saving.
 * @param {Function} updatePortLengthStatus - A function to update the port length status in the UI.
 * @throws {Error} If there's an issue saving the port settings.
 */
export function savePortSettings(formData, loadPortSettings, updatePortLengthStatus) {
    $.ajax({
        url: '/port_settings',
        method: 'POST',
        data: $.param(formData),
        success: function (response) {
            console.log('Port settings saved successfully:', response);
            showNotification('Port settings saved successfully!');
            loadPortSettings(updatePortLengthStatus);
            updatePortLengthStatus();
        },
        error: function (xhr, status, error) {
            console.error('Error saving port settings:', status, error);
            showNotification('Error saving port settings: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error occurred'), 'error');
        }
    });
}

/**
 * Loads and displays the About content, including planned features and changelog.
 * Applies custom formatting and animations to the loaded content.
 *
 * @throws {Error} If there's an issue loading the About content.
 */
export function loadAboutContent() {
    $.ajax({
        url: '/get_about_content',
        method: 'GET',
        success: function (data) {
            $('#planned-features-content').html(data.planned_features);
            $('#changelog-content').html(data.changelog);

            // Apply custom formatting and animations
            $('.markdown-content h2').each(function (index) {
                $(this).css('opacity', '0').delay(100 * index).animate({ opacity: 1 }, 500);
            });

            $('.markdown-content ul').addClass('list-unstyled');
            $('.markdown-content li').each(function (index) {
                $(this).css('opacity', '0').delay(50 * index).animate({ opacity: 1 }, 300);
            });

            // Add a collapsible feature to long lists
            $('.markdown-content ul').each(function () {
                if ($(this).children().length > 5) {
                    var $list = $(this);
                    var $items = $list.children();
                    $items.slice(5).hide();
                    $list.after('<a href="#" class="show-more">Show more...</a>');
                    $list.next('.show-more').click(function (e) {
                        e.preventDefault();
                        $items.slice(5).slideToggle();
                        $(this).text($(this).text() === 'Show more...' ? 'Show less' : 'Show more...');
                    });
                }
            });

            // Animate info cards
            $('.info-card').each(function (index) {
                $(this).css('opacity', '0').delay(200 * index).animate({ opacity: 1 }, 500);
            });
        },
        error: function (xhr, status, error) {
            console.error('Error loading About content:', status, error);
            showNotification('Error loading About content.', 'error');
        }
    });
}
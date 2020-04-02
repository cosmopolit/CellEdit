/*! CellEdit 1.0.19
 * ©2016 Elliott Beaty - datatables.net/license
 */

/**
 * @summary     CellEdit
 * @description Make a cell editable when clicked upon
 * @version     1.0.19
 * @file        dataTables.editCell.js
 * @author      Elliott Beaty
 * @contact     elliott@elliottbeaty.com
 * @copyright   Copyright 2016 Elliott Beaty
 *
 * This source file is free software, available under the following license:
 *   MIT license - http://datatables.net/license/mit
 *
 * This source file is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE. See the license files for details.
 *
 * For details please refer to: http://www.datatables.net
 */

(function( factory ){
    if ( typeof define === 'function' && define.amd ) {
        // AMD
        define( ['jquery', 'datatables.net'], function ( $ ) {
            return factory( $, window, document );
        } );
    }
    else if ( typeof exports === 'object' ) {
        // CommonJS
        module.exports = function (root, $) {
            if ( ! root ) {
                root = window;
            }

            if ( ! $ || ! $.fn.dataTable ) {
                $ = require('datatables.net')(root, $).$;
            }

            return factory( $, root, root.document );
        };
    }
    else {
        // Browser
        factory( jQuery, window, document );
    }
}(function( $, window, document, undefined ) {
    'use strict';


$.fn.dataTable.Api.register('MakeCellsEditable()', function (settings) {
    var table = this.table();

    $.fn.extend({
        
        // Red: Allow submit with enter and cancel with escape
        keyupEditableCell: function (e, callingElement) {
            var charCode = (typeof e.which === "number") ? e.which : e.keyCode;
            //ENTER KEY
            if (charCode === 13)
                $(this).updateEditableCell(callingElement);
            //ESC KEY
            if (charCode === 27)
                $(this).cancelEditableCell(callingElement);
        },      
      
        // UPDATE
        updateEditableCell: function (callingElement) {
            // Need to redeclare table here for situations where we have more than one datatable on the page. See issue6 on github
            var table = $(callingElement.closest("table")).DataTable().table();
            var row = table.row($(callingElement).parents('tr'));
            var cell = table.cell($(callingElement).parent());
            var type = "customer";
            var datasetID = $(callingElement).closest("tr").find(".btn-edit").data('customer-id');
            if (datasetID === "undefined" || datasetID === undefined) {
                datasetID = $(callingElement).closest("tr").find(".btn-delete-user").data('user-id');
                type = "user";
            }
            var elementname = $(callingElement).parent().attr('name');
            var columnIndex = cell.index().column;
            var inputField =getInputField(callingElement);

            // Update
            var newValue = inputField.val();
            if (!newValue && ((settings.allowNulls) && settings.allowNulls != true)) {
                // If columns specified
                if (settings.allowNulls.columns) {
                    // If current column allows nulls
                    if (settings.allowNulls.columns.indexOf(columnIndex) > -1) {
                        _update(newValue);
                    } else {
                        _addValidationCss();
                    }
                    // No columns allow null
                } else if (!newValue) {
                    _addValidationCss();
                }
                //All columns allow null
            } else {
                _update(newValue);
            }
            function _addValidationCss() {
                // Show validation error
                if (settings.allowNulls.errorClass) {
                    $(inputField).addClass(settings.allowNulls.errorClass)
                } else {
                    $(inputField).css({ "border": "red solid 1px" })
                }
            }
            function _update(newValue) {
                var oldValue = cell.data();
                cell.data(newValue);
                //Return cell & row.
                settings.onUpdate(cell, row, oldValue, datasetID, elementname, type);
            }
            // Get current page
            var currentPageIndex = table.page.info().page;
            
            //Redraw table
            table.page(currentPageIndex).draw(false);
        },
        // CANCEL
        cancelEditableCell: function (callingElement) {
            var table = $(callingElement.closest("table")).DataTable().table();
            var cell = table.cell($(callingElement).parent());
            // Set cell to it's original value
            cell.data(cell.data())

            // Red: stay on same page when recording will be cancelled
            // Get current page
            var currentPageIndex = table.page.info().page;
            //Redraw table
            table.page(currentPageIndex).draw(false);
        }
    });

    // Destroy
    if (settings === "destroy") {
        $(table.body()).off("click", "td");
        table = null;
    }

    if (table != null) {
        // On cell click
        $(table.body()).on('click', 'td', function () {

            var currentColumnIndex = table.cell(this).index().column;

            // DETERMINE WHAT COLUMNS CAN BE EDITED
            if ((settings.columns && settings.columns.indexOf(currentColumnIndex) > -1) || (!settings.columns)) {
                var row = table.row($(this).parents('tr'));
                var editableCellsRow = row;

                var cell = table.cell(this).node();
                var oldValue = table.cell(this).data();
                // Sanitize value
                oldValue = sanitizeCellValue(oldValue);

                // Show input
                if (!$(cell).find('input').length && !$(cell).find('select').length) {
                    // Input CSS
                    var input = getInputHtml(currentColumnIndex, settings, oldValue);
                    $(cell).html(input.html);
                    if (input.focus) {
                        $('#ejbeatycelledit').focus();
                    }
                }
            }
        });
    }
    
});

function getInputHtml(currentColumnIndex, settings, oldValue) {
    var inputSetting, inputType, input, inputCss, confirmCss, cancelCss;

    input = {"focus":true,"html":null}

    if(settings.inputTypes){
		$.each(settings.inputTypes, function (index, setting) {
			if (setting.column == currentColumnIndex) {
				inputSetting = setting;
				inputType = inputSetting.type.toLowerCase();
			}
		});
	}
    
    if (settings.inputCss) { inputCss = settings.inputCss; }
    if (settings.confirmationButton) {
        confirmCss = settings.confirmationButton.confirmCss;
        cancelCss = settings.confirmationButton.cancelCss;
        inputType = inputType + "-confirm";
    }
    switch (inputType) {
        case "list":
            input.html = "<select class='" + inputCss + "' onchange='$(this).updateEditableCell(this);'>";
            $.each(inputSetting.options, function (index, option) {
                input.html = input.html + "<option value='" + option.value + "' >" + option.display + "</option>"
            });
            input.html = input.html + "</select>";
            input.focus = false;
            break;
        case "list-confirm": // List w/ confirm
            var setSelected;
            input.html = "<select class='" + inputCss + "'>";
            $.each(inputSetting.options, function (index, option) {
                setSelected = (oldValue == option.display) ? 'selected' : '';
                input.html = input.html + "<option value='" + option.value + "' " + setSelected + " >" + option.display + "</option>"
            });
            input.html = input.html + "</select>&nbsp;<a href='#' class='" + confirmCss + "' onclick='$(this).updateEditableCell(this);'><button class='btn btn-primary btn-xs raised btn-inline-confirm'><span class='fa fa-check'></span></button></a> <a href='#' class='" + cancelCss + "' onclick='$(this).cancelEditableCell(this)'><button class='btn btn-primary btn-xs raised btn-inline-cancel'><span class='fa fa-times'></span></button></a> ";
            input.focus = false;
            break;
        case "datepicker": //Both datepicker options work best when confirming the values
        case "datepicker-confirm":
            // Makesure jQuery UI is loaded on the page
            if (typeof jQuery.ui == 'undefined') {
                alert("jQuery UI is required for the DatePicker control but it is not loaded on the page!");
                break;
            }
	        jQuery(".datepick").datepicker("destroy");
	        input.html = "<input id='ejbeatycelledit' type='text' name='date' class='datepick " + inputCss + "'   value='" + oldValue + "'></input> &nbsp;<a href='#' class='" + confirmCss + "' onclick='$(this).updateEditableCell(this)'><button class='btn btn-primary btn-xs raised btn-inline-confirm'><span class='fa fa-check'></span></button></a> <a href='#' class='" + cancelCss + "' onclick='$(this).cancelEditableCell(this)'><button class='btn btn-primary btn-xs raised btn-inline-cancel'><span class='fa fa-times'></span></button></a>";
	        setTimeout(function () { //Set timeout to allow the script to write the input.html before triggering the datepicker 
	            var icon = "http://jqueryui.com/resources/demos/datepicker/images/calendar.gif";
                // Allow the user to provide icon 
	            if (typeof inputSetting.options !== 'undefined' && typeof inputSetting.options.icon !== 'undefined') {
	                icon = inputSetting.options.icon;
	            }
	            var self = jQuery('.datepick').datepicker(
                    {
                        showOn: "button",
                        buttonImage: icon,
                        buttonImageOnly: true,
                        buttonText: "Select date"
                    });

	        },100);
	        break;
        case "text-confirm": // text input w/ confirm
            input.html = "<input id='ejbeatycelledit' class='" + inputCss + "' value='"+oldValue+"' onkeyup='$(this).keyupEditableCell(event, this)'></input>&nbsp;<a href='#' class='" + confirmCss + "' onclick='$(this).updateEditableCell(this)'><button class='btn btn-primary btn-xs raised btn-inline-confirm'><span class='fa fa-check'></span></button></a> <a href='#' class='" + cancelCss + "' onclick='$(this).cancelEditableCell(this)'><button class='btn btn-primary btn-xs raised btn-inline-cancel'><span class='fa fa-times'></span></button></a> ";
            break;
        case "undefined-confirm": // text input w/ confirm
            input.html = "<input id='ejbeatycelledit' class='" + inputCss + "' value='" + oldValue + "'></input>&nbsp;<a href='#' class='" + confirmCss + "' onclick='$(this).updateEditableCell(this)'><button class='btn btn-primary btn-xs raised btn-inline-confirm'><span class='fa fa-check'></span></button></a> <a href='#' class='" + cancelCss + "' onclick='$(this).cancelEditableCell(this)'><button class='btn btn-primary btn-xs raised btn-inline-cancel'><span class='fa fa-times'></span></button></a> ";
            break;
        default: // text input
            input.html = "<input id='ejbeatycelledit' class='" + inputCss + "' onfocusout='$(this).updateEditableCell(this)' value='" + oldValue + "'></input>";
            break;
    }
    return input;
}

function getInputField(callingElement) {
    // Update datatables cell value
    var inputField;
    switch ($(callingElement).prop('nodeName').toLowerCase()) {
        case 'a': // This means they're using confirmation buttons
            if ($(callingElement).siblings('input').length > 0) {
                inputField = $(callingElement).siblings('input');
            }
            if ($(callingElement).siblings('select').length > 0) {
                inputField = $(callingElement).siblings('select');
            }
            break;
        default:
            inputField = $(callingElement);
    }
    return inputField;
}

function sanitizeCellValue(cellValue) {
    if (typeof (cellValue) === 'undefined' || cellValue === null || cellValue.length < 1) {
        return "";
    }

    // If not a number
    if (isNaN(cellValue)) {
        // escape single quote
        cellValue = cellValue.replace(/'/g, "&#39;");
    }
    return cellValue;
}
}));

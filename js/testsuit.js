$(function() {

    // sprintf like formatting
    // usage: "Foo {0}".format("bar");
    // source: http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
    String.prototype.format = function() {
        var formatted = this;
        for( var arg in arguments ) {
            // replace all occurances, not just the first
            var placeholder = "\\{" + arg + "\\}";
            var re = new RegExp(placeholder, "g");
            formatted = formatted.replace(re, arguments[arg]);
        }
        return formatted;
    };

    // get the length of an associative array
    $.assocArraySize = function(obj) {
        // http://stackoverflow.com/a/6700/11236
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };

    function ajaxCall(url, type, data, success, error, complete) {
        if (success !== undefined) {
            // use the defined success action is provided
            successAction = success;
        } else {
            // use the default action if not provided
            successAction = function(data, status, xhr) {
            };
        }

        if (error !== undefined) {
            // use the defined success action is provided
            errorAction = error;
        } else {
            // use the default action if not provided
            errorAction = function (xhr, status, error) {
            };
        }
        
        if (complete !== undefined) {
            // use the defined success action is provided
            completeAction = complete;
        } else {
            // use the default action if not provided
            completeAction = null;
        }


        $.ajax({
          url: url,
          dataType: 'json',
          type: type,
          data: data,
          contentType: 'application/json',
          //beforeSend: function(xhr) {
          //    // provide basic auth details here if needed
          //    //xhr.setRequestHeader ("Authorization", "Basic XXX=");
          //},
          success: successAction,
          error: errorAction,
          complete: completeAction,
        });
    }

    function init_typeahead(type) {
        var datasrc = $.map($.alert_data, function(obj, index) {
            return obj[type];
        });
        datasrc = $.unique(datasrc);
        $("#data_" + type).typeahead("destroy");
        $('#data_' + type).typeahead({
          hint: true,
          highlight: true,
          minLength: 1
        },
        {
          name: 'datasrc',
          displayKey: 'value',
          source: substringMatcher(datasrc)
        });
    }

    function get_testsuit_data() {

            $.alert_data = $.alert_data || [];

            successAction = function(data, status, xhr) {
                $.each(data, function(index, obj) {
                    $.alert_data.push({priority: obj.priority, service: obj.service, host: obj.host, state: obj.state});
                    $("#data_holder").append(build_row_content($.assocArraySize($.alert_data), obj.service, obj.host, obj.state, obj.priority));
                });

                init_typeahead("service");
                init_typeahead("host");
                //init_typeahead("state");

            };

            errorAction = function (xhr, status, error) {
              var statuscode = xhr.status;
              // show the error message in a popup window
              $("#alert-modal .modal-body").html("Failed to load data from '{0}': {1} / {2}".format($.dataurl_get, statuscode, error));
              $('#alert-modal').modal('show');
            };

            ajaxCall($.dataurl_get, 'GET', null, successAction, errorAction);
    }

    function check_alert_stored(host, service) {
        for (var index in $.alert_data) {
            if ($.alert_data[index].host == host && $.alert_data[index].service == service) {
                return true;
            }
        }
        return false;
    }

    function build_row_content(index, service, host, state, priority) {
        return "<tr id='row-{5}' class='valid-data'><td>{0}</td><td>{1}</td><td>{2}</td><td>{3} {4}</td></tr>"
                .format(
                    index,
                    service,
                    host,
                    state,
                    '<button type="button" class="close">x</button>',
                    index
                );
    }

    var substringMatcher = function(strs) {
        return function findMatches(q, cb) {
        
            var matches, substrRegex;
         
            // an array that will be populated with substring matches
            matches = [];
         
            // regex used to determine if a string contains the substring `q`
            substrRegex = new RegExp(q, 'i');
         
            // iterate through the pool of strings and for any string that
            // contains the substring `q`, add it to the `matches` array
            $.each(strs, function(i, str) {
              if (substrRegex.test(str)) {
                // the typeahead jQuery plugin expects suggestions to a
                // JavaScript object, refer to typeahead docs for more info
                matches.push({ value: str });
              }
            });
         
            cb(matches);
        };
    };


    $.alert_data = [];
    $.dataurl_send = "{0}/php/api/testsuit_add_data.php".format(window.location.href.replace(/^(.*)\/[^\/]*$/, "$1"));
    $.dataurl_get = "{0}/php/api/testsuit_get_data.php".format(window.location.href.replace(/^(.*)\/[^\/]*$/, "$1"));
    $.dataurl_clear = "{0}/php/api/testsuit_clear_data.php".format(window.location.href.replace(/^(.*)\/[^\/]*$/, "$1"));

    $(document).ready(function () {
        get_testsuit_data();
        $('.selectpicker').selectpicker();
    });

    // catch the delet-row button event
    $('#data_holder').on("click", "button", function (evt) {
        // find closest tr and delete it
        $(this).closest("tr").fadeOut(function() { 
            var index = parseInt($(this).attr("id").replace(/^row-/, ""));
            $.alert_data.splice(index-1, 1);
            console.log($.alert_data);
            $(this).remove();
            // change the visible index of all remaining rows
            $(".valid-data").each(function (index, obj) {
                $(this).attr("id", "row-" + (index + 1)).find("td").first().html(index + 1);
            });
        });
    });


    $('#add-data').click(function () {
        //var priority = $("#data_priority").val();
        var priority = "";
        var service = $("#data_service").val();
        var host = $("#data_host").val();
        var state = $("#data_state").val();
        if (check_alert_stored(host, service) === false) {
            if (service.length && host.length) {
                $.alert_data.push({priority: priority, service: service, host: host, state: state});
                $("#data_holder").append(build_row_content($.assocArraySize($.alert_data), service, host, state, priority));
                init_typeahead("service");
                init_typeahead("host");
                //init_typeahead("state");
            } else {
                $("#alert-modal .modal-body").html("Please provide a value for 'Service' and 'Host'");
                $('#alert-modal').modal('show'); 
            }
        } else {
            $("#alert-modal .modal-body").html("Service/host combination already added");
            $('#alert-modal').modal('show');            
        }
    });

    // send the data to the API for storing
    $('#send-data').click(function () {

        if ($.assocArraySize($.alert_data)) {
            $.ajax ({
                type: "POST",
                //the url where you want to sent the userName and password to
                url: $.dataurl_send,
                contentType: "application/json; charset=utf-8",
                dataType: 'json',
                async: false,
                data: JSON.stringify({data: $.alert_data}),
                success: function (data) {
                    if (data[0] != "OK") {
                      $("#alert-modal .modal-body").html("Failed to send data to Testsuit API at '{0}': {1}".format($.dataurl_send, data[1]));
                      $('#alert-modal').modal('show');
                    }
                },
                failure: function (data) {
                  $("#alert-modal .modal-body").html("Failed to send data to Testsuit API at '{0}': {1}".format($.dataurl_send, data[1]));
                  $('#alert-modal').modal('show');
                }
            });
        } else {
            $("#alert-modal .modal-body").html("There is nothing to send to the Testsuit API");
            $('#alert-modal').modal('show');
        }
    });

    // send the data to the API for storing
    $('#clear-data').click(function () {

            successAction = function(data, status, xhr) {
                $.alert_data = [];
                $("#data_holder").find("tr:gt(0)").fadeOut(function() { $(this).remove(); });
            };

            errorAction = function (xhr, status, error) {
              var statuscode = xhr.status;
              // show the error message in a popup window
              $("#alert-modal .modal-body").html("Failed to clear data using'{0}': {1} / {2}".format($.dataurl_clear, statuscode, error));
              $('#alert-modal').modal('show');
            };

            if ($.assocArraySize($.alert_data)) {
                ajaxCall($.dataurl_clear, 'GET', null, successAction, errorAction);
            } else {
                $("#alert-modal .modal-body").html("There is no data to be cleared");
                $('#alert-modal').modal('show');
            }

    });

});


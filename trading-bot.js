var host_url = "https://geronikolov.com/wp-admin/admin-ajax.php";
var possible_loss = -50;
var current_time = new Date();
var current_day = current_time.getDay();
var hour_prices = [];
var trend_analytics = [];
var current_hour = current_time.getHours();
var current_key;
var is_opened_position = false;
var last_known_trend = 0;
var open_position;
var open_position_direction = "";
var wait_before_opening = false;

if ( hour_prices.length == 0 ) {
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if ( this.readyState == 4 && this.status == 200 ) {
			result_ = JSON.parse( this.response );
			if ( result_ != false ) {
				for ( key in result_ ) {
					info_ = result_[ key ];

					if ( typeof( hour_prices[ info_.key ] ) === "undefined" ) {
						hour_prices[ info_.key ] = {};
					}

					hour_prices[ info_.key ].sell = parseFloat( info_.sell );
					hour_prices[ info_.key ].buy = parseFloat( info_.buy );
					hour_prices[ info_.key ].actual = parseFloat( info_.actual );
					hour_prices[ info_.key ].highest_price = parseFloat( info_.highest_price );
					hour_prices[ info_.key ].lowest_price = parseFloat( info_.lowest_price );
					hour_prices[ info_.key ].date = info_.date;
				}
			}

			start_trading();
		}
	};
	xhttp.open( "POST", host_url, true );
	xhttp.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
	xhttp.send( "action=get_data" );
} else { start_trading(); }

function start_trading() {
	setInterval( function(){
		today = new Date();
		today_day = today.getDay();
		current_key = today.getFullYear() +""+ ( today.getMonth() + 1 ) +""+ today.getDate() +""+ today.getHours();

		if ( today_day != 0 && today_day != 6 ) { // Market is closed during the WEEKEND - 0 = Sunday; 6 - Saturday;
			if ( today.getHours() < 23 && today_day == current_day ) {
				calculate_prices();
			} else {
				if ( today_day != current_day && today.getHours() >= 1 ) {
					current_time = today;
					current_day = today_day;
				}
			}
		}
	}, 1000 );
}

function calculate_prices() {
//**** Calculate Action ****//

	today = new Date();

	// Send Price info to the Server
	hour_inspector = today.getHours();
	if ( hour_inspector != current_hour ) {
		current_hour = hour_inspector;
		last_hour_date = new Date();
		last_hour_date.setHours( current_hour - 1 );
		last_hour_key = last_hour_date.getFullYear() +""+ ( last_hour_date.getMonth() + 1 ) +""+ last_hour_date.getDate() +""+ last_hour_date.getHours();
		wait_before_opening = false;

		if ( typeof( hour_prices[ parseInt( last_hour_key ) ] ) !== "undefined" ) {
			last_hour_info = JSON.stringify( [ hour_prices[ parseInt( last_hour_key ) ] ] );

			var xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function() {
				if ( this.readyState == 4 && this.status == 200 ) {
					console.log( this.response );
				}
			};
			xhttp.open( "POST", host_url, true );
			xhttp.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
			xhttp.send( "action=store_data&last_hour="+ last_hour_info );
		}
	}

	sell_price = parseFloat( document.querySelector( 'div[data-code="NDAQ100MINI"] .tradebox-price-sell' ).innerText );
	buy_price = parseFloat( document.querySelector( 'div[data-code="NDAQ100MINI"] .tradebox-price-buy' ).innerText );

	key = parseInt( today.getFullYear() + '' + ( today.getMonth() + 1 ) + '' + today.getDate() + '' + today.getHours() );
	calculation_time = today.getFullYear() + '-' + ( today.getMonth() + 1 ) + '-' + today.getDate() + ' ' + today.getHours();

	if ( typeof( hour_prices[ key ] ) === "undefined" ) {
		hour_prices[ key ] = {
			date : calculation_time,
			sell : sell_price,
			buy : sell_price,
			actual : sell_price,
			highest_price : sell_price,
			lowest_price : sell_price
		};
	} else {
		hour_prices[ key ].date = calculation_time;
		hour_prices[ key ].sell = sell_price;
		hour_prices[ key ].buy = buy_price;
		hour_prices[ key ].actual = sell_price;
		hour_prices[ key ].highest_price = sell_price > hour_prices[ key ].highest_price ? sell_price : hour_prices[ key ].highest_price;
		hour_prices[ key ].lowest_price = sell_price < hour_prices[ key ].lowest_price ? sell_price : hour_prices[ key ].lowest_price;
	}

//**** Prepare Action Execution ****//

	// Get Purchase List
	document.querySelector( '[data-dojo-attach-point="dropdownNode"]' ).click();

	// Collect Purchase List
	purchase_options = document.querySelector( 'div[data-dojo-attach-point="quantityListNode"]' ).children;
	purchase_options_list = [];
	for ( key in purchase_options ) {
		option_ = purchase_options[ key ];
		if ( option_.localName == "div" ) {
			value = parseInt( option_.innerText );
			purchase_options_list.push( value );
		}
	}

	middle_purchase_option_value = purchase_options_list[ parseInt( purchase_options_list.length / 2 ) + 1 ];

	// Add Value to input
	document.querySelector( '[data-dojo-attach-point="placeholderNode"]' ).click();
	document.querySelector( 'div[data-code="NDAQ100MINI"] .list_qty div[data-value="'+ middle_purchase_option_value +'"]' ).click();

//**** BUY || SELL Action ****//
	count_prices = 0;
	for ( key in hour_prices ) {
		count_prices += 1;

		if ( count_prices == 6 ) {
			break;
		}
	}

	if ( count_prices == 6 ) {
		execute_action();
	}
}

function execute_action() {
	trend_status = 0; // 0 - Neutral; > 0 - Buy; < 0 - Sell;
	trend_stability = 0; // 0 - Neutral; > 0 - Stable; < 0 - Unstable;

	analysis = [];
	stop_count_hours = 5;

	for ( count_hours = 1; count_hours <= stop_count_hours; count_hours++ ) {
		date_before = new Date;
		date_before.setHours( date_before.getHours() - count_hours );
		before_hour_key = parseInt( date_before.getFullYear() +""+ ( date_before.getMonth() + 1 ) +""+ date_before.getDate() +""+ date_before.getHours() );

		if ( typeof( hour_prices[ before_hour_key ] ) !== "undefined" ) { analysis.push( hour_prices[ before_hour_key ] ); }
		else { stop_count_hours += 1; }
	}

	if ( analysis.length >= 5 ) {
		for ( count_analysis = 0; count_analysis < analysis.length - 1; count_analysis++ ) {
			analysis_1 = analysis[ count_analysis ];
			analysis_2 = analysis[ count_analysis + 1 ];

			if ( analysis_1.actual > analysis_2.actual ) { trend_status += 1 }
			else if ( analysis_1.actual < analysis_2.actual ) { trend_status -= 1; }
		}

		// Set Stop Loss if there is an open position
		stop_loss();

		// Collect Trend Analytics - STATUS
		if ( typeof( trend_analytics[ current_key ] ) == "undefined" ) {
			trend_analytics[ current_key ] = {
				status : trend_status,
				stability : 0,
			}
		} else {
			trend_analytics[ current_key ].status = trend_status;
		}

		// Check Trend and make decision
		if ( trend_status < 0 ) { // Sell Action
			last_known_trend = trend_status;

			// Check Trend Stability
			trend_stability = calculate_trend_stability( analysis, trend_status, hour_prices[ current_key ] );
			if ( trend_stability > 0 ) { // Trend is stable - OPEN Position
				execute_position( "sell", "open" );
			} else if ( trend_stability < 0 ) { // Trend is unstable - DON'T OPEN Position
				execute_position( "", "close" );
			}

		} else if ( trend_status > 0 ) { // Buy Action
			last_known_trend = trend_status;

			// Check Trend Stability
			trend_stability = calculate_trend_stability( analysis, trend_status, hour_prices[ current_key ] );
			if ( trend_stability > 0 ) { // Trend is stable - OPEN Position
				execute_position( "buy", "open" );
			} else if ( trend_stability < 0 ) { // Trend is unstable - DON'T OPEN Position
				execute_position( "", "close" );
			}

		} else { // Trend is neutral; Take Action only for open positions
			trend_stability = calculate_trend_stability( analysis, last_known_trend, hour_prices[ current_key ] );
			if ( trend_stability > 0 ) { /* Trend is stable - Keep the position OPENED */ }
			else if ( trend_stability < 0 ) { // Trend is unstable - CLOSE the position if there is one!
				execute_position( "", "close" );
			}
		}
	}
}

function stop_loss() {
	if ( document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"]' ) != null ) {
		position_status = parseFloat( document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"] [data-column-id="ppl"]' ).innerText );
		if ( position_status < possible_loss ) { document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"] [data-column-id="close"]' ).click(); }
	}
}

function calculate_trend_stability( analysis, status, current_info ) {
	stability = 0;

	if ( wait_before_opening == false ) {
		if ( is_opened_position == false ) {
			for ( count_analysis = 0; count_analysis < analysis.length; count_analysis++ ) {
				analysis_item = analysis[ count_analysis ];

				if ( status < 0 ) { // Trend is NEGATIVE - SELL Action
					if ( current_info.actual < analysis_item.actual ) { stability += 1; }
					else { stability -= 1; }
				} else if ( status > 0 ) { // Trend is POSITIVE - BUY Action
					if ( current_info.actual > analysis_item.actual ) { stability += 1; }
					else { stability -= 1; }
				}
			}
		} else if ( is_opened_position == true ) {
			one_hour_ago = analysis[ 0 ];
			two_hours_ago = analysis[ 1 ];

			if ( status < 0 ) { // Trend is NEGATIVE - SELL Action
				if ( one_hour_ago.actual < two_hours_ago.actual && current_info.actual < one_hour_ago.actual ) {
					stability = 1;
				} else if ( one_hour_ago.actual > two_hours_ago.actual && current_info.actual < one_hour_ago.actual ) {
					stability = 1;
				} else if ( one_hour_ago.actual > two_hours_ago.actual && current_info.actual > one_hour_ago.actual ) {
					stability = -1;
					wait_before_opening = true;
				}
			} else if ( status > 0 ) { // Trend is POSITIVE - BUY Action
				if ( one_hour_ago.actual > two_hours_ago.actual && current_info.actual > one_hour_ago.actual ) {
					stability = 1;
				} else if ( one_hour_ago.actual < two_hours_ago.actual && current_info.actual > one_hour_ago.actual ) {
					stability = 1;
				} else if ( one_hour_ago.actual < two_hours_ago.actual && current_info.actual < one_hour_ago.actual ) {
					stability = -1;
					wait_before_opening = true;
				}
			}
		}
	} else if ( wait_before_opening == true ) { stability = -1; }

	return stability;
}

function execute_position( type = "", action ) {
	// Check if there is open position
	if (
		document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"]' ) == null &&
		is_opened_position == false &&
		action == "open"
	) { // No positions
		is_opened_position = true;

		if ( type == "sell" && action == "open" ) { // Open SELL Position
			document.querySelector( '[data-dojo-attach-point="inputSellButtonNode"]' ).click();
		} else if ( type == "buy" && action == "open" ) { // Open BUY Position
			document.querySelector( '[data-dojo-attach-point="inputBuyButtonNode"]' ).click();
		}

		open_position = hour_prices[ current_key ];
		open_position_direction = type;

	} else { // Position was opened already

		if ( action == "close" && is_opened_position == true ) { // Close Position
			document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"] [data-column-id="close"]' ).click();
			is_opened_position = false;
			open_position = {};
			open_position_direction = "";
			possible_difference = 0;
		}

	}
}

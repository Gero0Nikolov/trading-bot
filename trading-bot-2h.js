var host_url = "https://geronikolov.com/wp-admin/admin-ajax.php";
var possible_loss = -50;
var current_time = new Date();
var hour_prices = [];
var trend_analytics = [];
var current_hour = current_time.getHours();
var current_key;
var is_opened_position = false;
var last_known_trend = 0;
var position_direction = "";
var trend_during_opening = 0;
var warning_active = false;
var warning_timer = 0;

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
		current_key = parseInt( today.getFullYear() +""+ ( today.getMonth() + 1 ) +""+ today.getDate() +""+ today.getHours() );

		if ( today_day != 0 && today_day != 6 ) { // Market is closed during the WEEKEND - 0 = Sunday; 6 - Saturday;
			if ( document.querySelector( '[data-dojo-attach-point="placeholderNode"]' ).innerText != "ПАЗАРЪТ Е ЗАТВОРЕН" ) {
				calculate_prices();
				current_time = today;
			}
		}
	}, 1000 );
}

function update_db() {
	today = new Date();

	hour_inspector = today.getHours();
	if ( hour_inspector != current_hour ) {
		current_hour = hour_inspector;

		warning_active = false;
		last_hour_updated = false;
		count_hours = 0;		
	}
}

function calculate_prices() {
//**** Calculate Action ****//

	today = new Date();

	// Send Price info to the Server
	update_db();

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

	middle_purchase_option_value = purchase_options_list[ parseInt( purchase_options_list.length - 4 ) ];

	// Add Value to input
	document.querySelector( '[data-dojo-attach-point="placeholderNode"]' ).click();
	document.querySelector( 'div[data-code="NDAQ100MINI"] .list_qty div[data-value="'+ middle_purchase_option_value +'"]' ).click();

//**** BUY || SELL Action ****//
	count_prices = 0;
	for ( key in hour_prices ) {
		count_prices += 1;

		if ( count_prices == 3 ) {
			break;
		}
	}

	if ( count_prices == 3 ) {
		execute_action();
	}
}

function execute_action() {
	trend_status = 0; // 0 - Neutral; > 0 - Buy; < 0 - Sell;
	trend_stability = 0; // 0 - Neutral; > 0 - Stable; < 0 - Unstable;

	analysis = [];
	stability_analysis = [];
	stop_count_hours = 3;
	stop_count_analysis = 3;

	for ( count_hours = 1; count_hours <= stop_count_hours; count_hours++ ) {
		date_before = new Date;
		date_before.setHours( date_before.getHours() - count_hours );
		before_hour_key = parseInt( date_before.getFullYear() +""+ ( date_before.getMonth() + 1 ) +""+ date_before.getDate() +""+ date_before.getHours() );

		if ( typeof( hour_prices[ before_hour_key ] ) !== "undefined" ) {
			analysis.push( hour_prices[ before_hour_key ] );

			if ( count_hours <= stop_count_analysis ) {
				stability_analysis.push( hour_prices[ before_hour_key ] );
			}
		}
		else { stop_count_hours += 1; }
	}

	if ( analysis.length >= 3 ) {
		for ( count_analysis = 0; count_analysis < analysis.length - 1; count_analysis++ ) {
			analysis_1 = analysis[ count_analysis ];
			analysis_2 = analysis[ count_analysis + 1 ];

			if ( analysis_1.actual > analysis_2.actual ) { trend_status += 1 }
			else if ( analysis_1.actual < analysis_2.actual ) { trend_status -= 1; }
		}

		// Set Stop Loss if there is an open position
		stop_loss( analysis );

		// Collect Trend Analytics - STATUS
		if ( typeof( trend_analytics[ current_key ] ) == "undefined" ) {
			trend_analytics[ current_key ] = {
				status : trend_status,
				stability : 0,
			}
		} else {
			trend_analytics[ current_key ].status = trend_status;
		}

		// Check if Trend in the current analysed period is about to change - OPENED POSITIONS ONLY
		if ( is_opened_position == true ) {
			trend_stability = calculate_trend_stability( stability_analysis, trend_status, hour_prices[ current_key ] );
			position_status = get_position_status();

			if ( position_direction == "sell" ) { // Sell Position
				if (
					( trend_status > trend_during_opening && trend_status > 0 ) ||
					( trend_stability == -100 && position_status > 0 )
				) {
					execute_position( "", "close" );
				}
			} else if ( position_direction == "buy" ) { // Buy Position
				if (
					( trend_status < trend_during_opening && trend_status < 0 ) ||
					( trend_stability == -100 && position_status > 0 )
				) {
					execute_position( "", "close" );
				}
			}
		}

		// Check Trend and make decision
		if ( trend_status < 0 ) { // Sell Action
			last_known_trend = trend_status;

			// Check Trend Stability
			trend_stability = calculate_trend_stability( stability_analysis, trend_status, hour_prices[ current_key ] );
			if ( trend_stability > 0 ) { // Trend is stable - OPEN Position
				execute_position( "sell", "open" );
			}

		} else if ( trend_status > 0 ) { // Buy Action
			last_known_trend = trend_status;

			// Check Trend Stability
			trend_stability = calculate_trend_stability( stability_analysis, trend_status, hour_prices[ current_key ] );
			if ( trend_stability > 0 ) { // Trend is stable - OPEN Position
				execute_position( "buy", "open" );
			}

		} else {
			trend_stability = calculate_trend_stability( stability_analysis, last_known_trend, hour_prices[ current_key ] );
			if ( is_opened_position == true ) {
				position_status = get_position_status();

				if ( trend_stability == -100 && position_status > 0 ) {
					execute_position( "", "close" );
				}
			}
		}
	}
}

function stop_loss( analysis ) {
	if ( document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"]' ) != null ) {
		// Find Lowest Price in the analysed period
		close_price = 0;
		for ( count_hours = 0; count_hours < analysis.length; count_hours++ ) {
			if ( position_direction == "sell" ) {
				close_price = close_price == 0 ? analysis[ count_hours ].highest_price : ( close_price < analysis[ count_hours ].highest_price ? analysis[ count_hours ].highest_price : close_price );
			} else if ( position_direction == "buy" ) {
				close_price = close_price == 0 ? analysis[ count_hours ].lowest_price : ( close_price > analysis[ count_hours ].lowest_price ? analysis[ count_hours ].lowest_price : close_price );
			}
		}

		current_info = hour_prices[ current_key ];
		close_flag = false;

		if ( position_direction == "sell" ) {
			close_flag = current_info.actual > close_price ? true : false;
		} else if ( position_direction == "buy" ) {
			close_flag = current_info.actual < close_price ? true : false;
		}

		if ( close_flag == true ) {
			document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"] [data-column-id="close"]' ).click();
			is_opened_position = false;
			position_direction = "";
			trend_during_opening = 0;
		}
	}
}

function calculate_trend_stability( analysis, status, current_info ) {
	let stability = 0;

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

	// Check if Trend is in correction
	one_hour_ago = analysis[ 0 ];
	// two_hours_ago = analysis[ 1 ];
	// one_hour_ago.actual > two_hours_ago.actual &&
	// one_hour_ago.actual < two_hours_ago.actual &&

	if ( status < 0 ) { // Trend is NEGATIVE - SELL Action
		if ( current_info.actual > one_hour_ago.actual ) {
			stability = -100;
		}
	} else if ( status > 0 ) { // Trend is POSITIVE - BUY Action
		if ( current_info.actual < one_hour_ago.actual ) {
			stability = -100;
		}
	}

	trend_analytics[ current_key ].stability = stability; // IF STABILITY == 100 ==> TREND IS IN CORRECTION

	return stability;
}

function execute_position( type = "", action ) {
	// Check if there is open position
	if (
		document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"]' ) == null &&
		is_opened_position == false &&
		action == "open"
	) { // No positions

		if ( warning_active == false ) { // Check if Trend is in Correction
			if ( type == "sell" && action == "open" ) { // Open SELL Position
				document.querySelector( '[data-dojo-attach-point="inputSellButtonNode"]' ).click();
				trend_during_opening = -1;
			} else if ( type == "buy" && action == "open" ) { // Open BUY Position
				document.querySelector( '[data-dojo-attach-point="inputBuyButtonNode"]' ).click();
				trend_during_opening = 1;
			}

			is_opened_position = true;
			position_direction = type;
		}

	} else { // Position was opened already

		if ( action == "close" && is_opened_position == true ) { // Close Position
			document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"] [data-column-id="close"]' ).click();
			warning_active = true;
			is_opened_position = false;
			position_direction = "";
			trend_during_opening = 0;
			warning_timer = 0;
		}

	}
}

function get_position_status() {
	position_status = false;

	if ( is_opened_position == true && document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"] [data-column-id="ppl"]' ) != null ) {
		position_status = parseFloat( document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"] [data-column-id="ppl"]' ).innerText );
	}

	return position_status;
}

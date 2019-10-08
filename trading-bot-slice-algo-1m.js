/*
*	Agenda:
*	1) OPM - Opening Position Move
*	2) TPM - Take Profit Move
*	3) SLM - Stop Loss Move
*
*	Penetration Test No1: 25.09.2019 - Successful
*	Overall profit in the test: 5.38%
*	Initial deposit: 1000 BGN
*	OPM: 10
*	TPM: 5
*	SLM: 50
*	TPI && SLI: 500 miliseconds
*	Bug report + Fixes:
*	-	NULL caused by too fast TP Action and call of the is_profit() method before actual opened position in the platform.
*	-	TP && SL reporting added upon taken action.
*
*	Penetration Test No2: 26.09.2019 - Failed
*	Overall profit in the test: -1.11%
*	Initial deposit: 1000 BGN
*	OPM: 8
*	TPM: 3
*	SLM: 10
*	TPI && SLI: 1000 miliseconds
*	Bug report + Fixes:
*	-	Too low OPM and SLM.
*
*	Penetration Test No3: 27.09.2019 - Successful
*	Overall profit in the test: 5.43%
*	Initial deposit: 1000 BGN
*	OPM: 10
*	TPM: 3
*	SLM: 50
*	TPI && SLI: 100 miliseconds
*	Bug report + Fixes:
*	-	OPM and SLM returned to 10 and 50
*	-	Opening of positions on Friday is possible only before 20 o'clock
*
*	Penetration Test No4: 30.09.2019 - Successful
*	Overall profit in the test: 0.035% (Reason: No market movements + a little bug in the After Weekend trading time on Monday night algo trading)
*	Initial deposit: 1000 BGN
*	OPM: 10
*	TPM: 1.5
*	SLM: 50
*	TPI && SLI: 100 miliseconds
*	Bug report + Fixes:
*	-	Processes optimization.
*	-	Removed the TP and SL interval and added the actions directly to the LOOP.
*	-	Auto reload of the page on 24 hours intreval.
*	-	Auto updater of the DB updated to check if hour update request already exists.
*
*	Penetration Test No5: 01.10.2019 - Successful
*	Overall profit in the test: 2.2%
*	Initial deposit: 1000 BGN
*	OPM: 10
*	TPM: 1.5
*	SLM: 50
*	TPI && SLI: 100 miliseconds
*	Bug report + Fixes:
*	-	BUG: After weekend opening hour confuses the if there is a big movement in the direction of the market from Friday.
*	-	FIX: Check if there is a GAP between the Last Friday price and the opening price on Monday Night. If there is GAP make slicing decision based on it's direction.
*	-	FIX: Set GAP to 0 after the first hour on Monday Night trading hours.
*
*	Penetration Test No6: 02.10.2019 - FAILED
*	Overall profit in the test: -2%
*	Initial deposit: 1000 BGN
*	OPM: 10
*	TPM: 1.5
*	SLM: 50
*	TPI && SLI: 100 miliseconds
*	Bug report + Fixes:
*	-	BUG: Auto refresh with opened position triggers loss in the memmory which leads to a big loss and uncontrolled trades.
*	-	FIX: Don't perform auto refresh if there is an opened position.
*	-	BUG: Auto refresh and the following DB update causes multiplication of the hours.
*	- 	FIX: Server side - DON'T add existing hours.
*
*	Penetration Test No7: 03.10.2019 - 4.10.2019 - FAILED
*	Overall profit in the test: -0.34%
*	Initial deposit: 5000 BGN
*	OPM: 10
*	TPM: 1.5
*	SLM: REPLACED WITH DIRACTION MEASUREMENT
*	TPI && SLI: 100 miliseconds
*	Bug report + Fixes:
*	-	BUG: Wrong position opening
*	-	FIX: Inspection of the previous hour to see if there was a big movement lately or not.
*	- 	FIX: Allowed trading hours changed to 16:30 - 23:00
*
*	Penetration Test No8: 07.10.2019 - 08.10.2019 -
*	Overall profit in the test: 0% -
*	Initial deposit: 5000 BGN
*	OPM: 10
*	TPM: 1.5
*	SLM: 50
*	TPI && SLI: 100 miliseconds
*	Bug report + Fixes:
*	-	BUG: Lack of Trend Analysis
*	-	FIX: Trend Analysis added on every hour
*	- 	BUG: Lack of Logging
*	- 	FIX: Added logging on: GAP calculation; TP & SL Actions; Trend Analysis;
*	- 	BUG: Too secured and lack of inverted trend inspection
*	-	FIX: Inverted trend checkup added
*/


var host_url = "https://geronikolov.com/wp-admin/admin-ajax.php";
var current_time = new Date();
var hour_prices = [];
var current_hour = current_time.getHours();
var current_key;
var current_minute_key;
var is_opened_position = false;
var position_type = "";
var open_position_price = 0;
var slicing_hour = [];
var warning_active = false;
var gap_measured = false;
var gap_direction = 0;
var last_hour;
var trading_started = false;
var trend_analysis = false;

//var tool_ = "BTCUSD";
var tool_ = "NDAQ100";

var tools_ = {
	"BTCUSD" : {
		clean_tool_name : "BTCUSD",
		trader_tool_name : "BTCUSD",
		opening_position_movement : 100,
		take_profit_movement : 50,
		stop_loss_movement : 100
	},
	"NDAQ100" : {
		clean_tool_name : "NDAQ100",
		trader_tool_name : "$NDAQ100",
		opening_position_movement : 10,
		take_profit_movement : 1.5,
		stop_loss_movement : 50
	}
};

// Pull data if needed
if ( hour_prices.length == 0 ) { get_data(); }

function start_trading() {
	trading_started = setInterval( function(){
		today = new Date();
		today_day = today.getDay();
		current_key = parseInt( today.getFullYear() +""+ ( today.getMonth() + 1 ) +""+ today.getDate() +""+ today.getHours() );
		current_minute_key = parseInt( today.getFullYear() + '' + ( today.getMonth() + 1 ) + '' + today.getDate() + '' + today.getHours() + '' + today.getMinutes() );

		if ( is_market_open() ) {
			calculate_prices();
			current_time = today;
		}
	}, 100 );
}

function update_db() {
	today = new Date();

	hour_inspector = today.getHours();
	if ( hour_inspector != current_hour ) {
		current_hour = hour_inspector;

		// Reset slicing hour
		slicing_hour = [];

		warning_active = false;
		let last_hour_updated = false;
		let count_hours = 0;

		while ( last_hour_updated == false ) {
			count_hours += 1;
			last_hour_date = new Date();
			last_hour_date.setHours( current_hour - count_hours );
			last_hour_key = parseInt( last_hour_date.getFullYear() +""+ ( last_hour_date.getMonth() + 1 ) +""+ last_hour_date.getDate() +""+ last_hour_date.getHours() );
			if ( typeof ( hour_prices[ last_hour_key ] ) !== "undefined" ) {
				last_hour_updated = true;
			}
		}

		if ( typeof( hour_prices[ last_hour_key ] ) !== "undefined" ) {
			last_hour = hour_prices[ last_hour_key ];
			last_hour_info = JSON.stringify( [ hour_prices[ last_hour_key ] ] );

			var xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function() {
				if ( this.readyState == 4 && this.status == 200 ) {
					console.log( this.response );

					// Update Trend Analysis
					analyse_trend();

					// Check if Source reloading is needed
					if ( today.getHours() == 1 && today.getMinutes() == 0 && today.getSeconds() == 0 ) {
						hour_prices = [];
						get_data();
					}
				}
			};
			xhttp.open( "POST", host_url, true );
			xhttp.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
			xhttp.send( "action=store_data&last_hour="+ last_hour_info +"&name="+ tools_[ tool_ ].clean_tool_name );
		}

		// Reset GAP if there was
		if ( gap_direction != 0 && today.getDay() == 1 && today.getHours() == 2 ) { gap_direction = 0; }
	}
}

function calculate_prices() {
//**** Calculate Action ****//

	today = new Date();

	// Send Price info to the Server
	update_db();

	sell_price = parseFloat( document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] .tradebox-price-sell .integer-value' ).innerText.replace( ' ', "" ) + document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] .tradebox-price-sell .decimal-value' ).innerText.replace( ' ', "" ) );
	buy_price = parseFloat( document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] .tradebox-price-buy .integer-value' ).innerText.replace( ' ', "" ) + document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] .tradebox-price-buy .decimal-value' ).innerText.replace( ' ', "" ) );

	key = parseInt( today.getFullYear() + '' + ( today.getMonth() + 1 ) + '' + today.getDate() + '' + today.getHours() );
	calculation_time = today.getFullYear() + '-' + ( today.getMonth() + 1 ) + '-' + today.getDate() + ' ' + today.getHours();

	if ( typeof( hour_prices[ key ] ) === "undefined" ) {
		hour_prices[ key ] = {
			date : calculation_time,
			opening : sell_price,
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

	// Set minutes and seconds into the slicing hour
	slicing_minute_key = parseInt( today.getFullYear() + '' + ( today.getMonth() + 1 ) + '' + today.getDate() + '' + today.getHours() + '' + today.getMinutes() );

	if ( typeof( slicing_hour[ slicing_minute_key ] ) === "undefined" ) {
		// If it's a new minute reset the warning
		warning_active = false;

		slicing_hour[ slicing_minute_key ] = {
			opening : sell_price,
			sell : sell_price,
			buy : sell_price,
			actual : sell_price,
			highest_price : sell_price,
			lowest_price : sell_price
		};
	} else {
		slicing_hour[ slicing_minute_key ].sell = sell_price;
		slicing_hour[ slicing_minute_key ].buy = buy_price;
		slicing_hour[ slicing_minute_key ].actual = sell_price;
		slicing_hour[ slicing_minute_key ].highest_price = sell_price > slicing_hour[ slicing_minute_key ].highest_price ? sell_price : slicing_hour[ slicing_minute_key ].highest_price;
		slicing_hour[ slicing_minute_key ].lowest_price = sell_price < slicing_hour[ slicing_minute_key ].lowest_price ? sell_price : slicing_hour[ slicing_minute_key ].lowest_price;
	}

//**** Prepare Action Execution ****//

	// Get Purchase List
	document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-dojo-attach-point="dropdownNode"]' ).click();

	// Collect Purchase List
	purchase_options = document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] div[data-dojo-attach-point="quantityListNode"]' ).children;
	purchase_options_list = [];
	for ( key in purchase_options ) {
		option_ = purchase_options[ key ];
		if ( option_.localName == "div" ) {
			value = parseFloat( option_.innerText );
			purchase_options_list.push( value );
		}
	}

	middle_purchase_option_value = purchase_options_list[ parseInt( purchase_options_list.length - 4 ) ];

	// Add Value to input
	document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-dojo-attach-point="placeholderNode"]' ).click();
	document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] .list_qty div[data-value="'+ middle_purchase_option_value +'"]' ).click();

//**** OP || TP || SL ****//
	if ( !is_opened_position ) {
		if (
			gap_measured == false &&
			gap_direction == 0
		) { // Check if there is a GAP between the last Friday price and the current opening price
			gap_direction = hour_prices[ current_key ].opening_price > last_hour.actual ? 1 : ( hour_prices[ current_key ].opening_price < last_hour.actual ? -1 : 0 );
			gap_measured = true;

			log( {
				date : today.getDay() +"-"+ today.getMonth() +"-"+ today.getFullYear() +" "+ today.getHours(),
				gap_direction : gap_direction
			}, "gap_calculation" );
		}

		//**** BUY || SELL Action ****//
		slice_action();
	} else {
		if ( is_profit() ) { // Position is opened already, listen for TP moments.
			take_profit();
		} else { // Position is opened already, but it's not a winnign one. Listen for SL moments.
			stop_loss();
		}
	}
}

function slice_action() {
	let minute_ = slicing_hour[ current_minute_key ];

	// Find hour direction
	if ( minute_.opening > minute_.actual ) { // Negative
		if (
			is_hour_in_direction( "sell" ) &&
			(
				is_good_trend( "sell" ) ||
				is_good_trend( "sell", true ) // Check the inverted trend as well
			) &&
			minute_.opening - minute_.actual >= tools_[ tool_ ].opening_position_movement &&
			gap_direction != -1
		) {
			execute_position( "sell", "open" );
		}
	} else if ( minute_.opening < minute_.actual )  { // Positive
		if (
			is_hour_in_direction( "buy" ) &&
			(
				is_good_trend( "buy" ) ||
				is_good_trend( "buy", true )
			) &&
			minute_.actual - minute_.opening >= tools_[ tool_ ].opening_position_movement &&
			gap_direction != 1
		) {
			execute_position( "buy", "open" );
		}
	}
}

function execute_position( type = "", action ) {
	// Check if there is open position
	if (
		document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="'+ tools_[ tool_ ].trader_tool_name +'"]' ) == null &&
		is_opened_position == false &&
		action == "open" &&
		warning_active == false
	) { // No positions

		open_position_price = hour_prices[ current_key ].actual;
		is_opened_position = true;
		position_type = type;

		if ( type == "sell" && action == "open" ) { // Open SELL Position
			document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-dojo-attach-point="inputSellButtonNode"]' ).click();
		} else if ( type == "buy" && action == "open" ) { // Open BUY Position
			document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-dojo-attach-point="inputBuyButtonNode"]' ).click();
		}

	} else { // Position was opened already

		if ( action == "close" && is_opened_position == true ) { // Close Position
			document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-column-id="close"]' ).click();
			is_opened_position = false;
			position_type = "";
			open_position_price = 0;
			warning_active = true;
		}

	}
}

function take_profit() {
	let minute_ = slicing_hour[ current_minute_key ];

	if ( position_type == "sell" ) {
		if ( minute_.actual - minute_.lowest_price >= tools_[ tool_ ].take_profit_movement ) {
			execute_position( "", "close" );

			log( {
				type : "Take Profit",
				direction : "Sell",
				key : current_key
			}, "action" );
		}
	} else if ( position_type == "buy" ) {
		if ( minute_.highest_price - minute_.actual >= tools_[ tool_ ].take_profit_movement ) {
			execute_position( "", "close" );

			log( {
				type : "Take Profit",
				direction : "Buy",
				key : current_key
			}, "action" );
		}
	}
}

function stop_loss() {
	let hour_ = hour_prices[ current_key ];

	if ( position_type == "sell" ) {
		if ( hour_.actual - open_position_price >= tools_[ tool_ ].stop_loss_movement ) {
			execute_position( "", "close" );

			log( {
				type : "Stop Loss",
				direction : "Sell",
				key : current_key
			}, "action" );
		}
	} else if ( position_type == "buy" ) {
		if ( open_position_price - hour_.actual >= tools_[ tool_ ].stop_loss_movement ) {
			execute_position( "", "close" );

			log( {
				type : "Stop Loss",
				direction : "Buy",
				key : current_key
			}, "action" );
		}
	}
}

function is_profit() {
	let position_status = false;
	if (
		is_opened_position == true &&
		document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-column-id="ppl"]' ) !== null
	) {
		position_status = parseFloat( document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-column-id="ppl"]' ).innerText );
	}
	return position_status >= 10 && position_status !== false ? true : false;
}

function is_market_open() {
	return document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-dojo-attach-point="placeholderNode"]' ) != null && document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-dojo-attach-point="placeholderNode"]' ).innerText != "ПАЗАРЪТ Е ЗАТВОРЕН";
}

function is_hour_in_direction( direction ) {
	let hour_ = hour_prices[ current_key ];
	let flag = false;

	if (
		direction == "sell" &&
		hour_.opening > hour_.actual
	) {
		flag = true;
	} else if (
		direction == "buy" &&
		hour_.opening < hour_.actual
	) {
		flag = true;
	}

	return flag;
}

function is_good_trend( direction, check_inverted = false ) {
	let flag = false;

	if ( trend_analysis != false ) {
		if ( !check_inverted ) {
			if (
				(
					direction == "sell" &&
					trend_analysis.trend < 0 &&
					trend_analysis.trend_stability > 0
				) ||
				(
					direction == "buy" &&
					trend_analysis.trend > 0 &&
					trend_analysis.trend_stability > 0
				) ||
				trend_analysis.big_moves.length == 0
			) {
				flag = true;
			}
		} else if ( check_inverted ) {
			if (
				(
					direction == "sell" &&
					trend_analysis.trend > 0 &&
					trend_analysis.trend_stability < 0
				) ||
				(
					direction == "buy" &&
					trend_analysis.trend < 0 &&
					trend_analysis.trend_stability < 0
				)
			) {
				flag = true;
			}
		}
	} else { flag = true; }

	return flag;
}

function get_data() {
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

					hour_prices[ info_.key ].opening = parseFloat( info_.opening );
					hour_prices[ info_.key ].sell = parseFloat( info_.sell );
					hour_prices[ info_.key ].buy = parseFloat( info_.buy );
					hour_prices[ info_.key ].actual = parseFloat( info_.actual );
					hour_prices[ info_.key ].highest_price = parseFloat( info_.highest_price );
					hour_prices[ info_.key ].lowest_price = parseFloat( info_.lowest_price );
					hour_prices[ info_.key ].date = info_.date;
				}

				// Get the last known hour
				last_hour = result_[ 0 ];
			}

			if ( !trend_analysis ) { analyse_trend(); }
			if ( !trading_started ) { start_trading(); }

			today = new Date();
			if ( today.getDay() == 1 ) {
				gap_measured = false;
				gap_direction = 0;
			}
		}
	};
	xhttp.open( "POST", host_url, true );
	xhttp.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
	xhttp.send( "action=get_data&name="+ tools_[ tool_ ].clean_tool_name );
}

function analyse_trend() {
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if ( this.readyState == 4 && this.status == 200 ) {
			if ( this.response != "false" ) {
				trend_analysis = JSON.parse( this.response );

				let today = new Date();
				log( {
					date : today.getDay() +"-"+ today.getMonth() +"-"+ today.getFullYear() +" "+ today.getHours(),
					analys : trend_analysis
				}, "trend_analys" );
			}
		}
	};
	xhttp.open( "POST", host_url, true );
	xhttp.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
	xhttp.send( "action=analyse_trend" );
}

function log( object, type ) {
	let log_;
	if (
		localStorage.getItem( "log" ) == null ||
		typeof( localStorage.getItem( "log" ) ) === "undefined"
	) {
		log_ = {
			actions : [],
			gap_calculations : [],
			trend_analysis : []
		};
	} else {
		log_ = JSON.parse( localStorage.getItem( "log" ) );
	}

	if ( type == "action" ) { log_.actions.push( object ); }
	else if ( type == "gap_calculation" ) { log_.gap_calculations.push( object ); }
	else if ( type == "trend_analys" ) { log_.trend_analysis.push( object ); }

	localStorage.setItem( "log", JSON.stringify( log_ ) );
}

function read_log() {
	result_ = false;
	if (
		localStorage.getItem( "log" ) != null &&
		typeof( localStorage.getItem( "log" ) ) !== "undefined"
	) {
		result_ = JSON.parse( localStorage.getItem( "log" ) );
	}
	console.log( "=====LOG=====" );
	console.log( result_ );
}

var host_url = "https://geronikolov.com/wp-admin/admin-ajax.php";
var current_time = new Date();
var hour_prices = [];
var current_hour = current_time.getHours();
var current_key;
var is_opened_position = false;
var position_type = "";
var open_position_interval = 0;
var open_position_price = 0;

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
		take_profit_movement : 5,
		stop_loss_movement : 50
	}
};

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
	xhttp.send( "action=get_data&name="+ tools_[ tool_ ].clean_tool_name );
} else { start_trading(); }

function start_trading() {
	setInterval( function(){
		today = new Date();
		today_day = today.getDay();
		current_key = parseInt( today.getFullYear() +""+ ( today.getMonth() + 1 ) +""+ today.getDate() +""+ today.getHours() );

		//TODO: today_day != 0 && today_day != 6 - Revert for NDAQ100

		if ( document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-dojo-attach-point="placeholderNode"]' ).innerText != "ПАЗАРЪТ Е ЗАТВОРЕН" ) {
			calculate_prices();
			current_time = today;
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

		while ( last_hour_updated == false ) {
			count_hours += 1;
			last_hour_date = new Date();
			last_hour_date.setHours( current_hour - count_hours );
			last_hour_key = last_hour_date.getFullYear() +""+ ( last_hour_date.getMonth() + 1 ) +""+ last_hour_date.getDate() +""+ last_hour_date.getHours();
			if ( typeof ( hour_prices[ last_hour_key ] ) !== "undefined" ) {
				last_hour_updated = true;
			}
		}

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
			xhttp.send( "action=store_data&last_hour="+ last_hour_info +"&name="+ tools_[ tool_ ].clean_tool_name );
		}
	}
}

function calculate_prices() {
//**** Calculate Action ****//

	today = new Date();

	// Send Price info to the Server
	update_db();

	sell_price = parseFloat( document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] .tradebox-price-sell' ).innerText );
	buy_price = parseFloat( document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] .tradebox-price-buy' ).innerText );

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

//**** BUY || SELL Action ****//
	slice_action();
}

function slice_action() {
	let hour_ = hour_prices[ current_key ];

	// Find hour direction
	if ( hour_.opening > hour_.actual ) { // Negative
		if ( hour_.opening - hour_.actual >= tools_[ tool_ ].opening_position_movement ) {
			execute_position( "sell", "open" );
		}
	} else if ( hour_.opening < hour_.actual )  { // Positive
		if ( hour_.actual - hour_.opening >= tools_[ tool_ ].opening_position_movement ) {
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
	) { // No positions

		if (
			today_day != 5 ||
			( today_day == 5 && current_hour < 20 )
		) {
			if ( type == "sell" && action == "open" ) { // Open SELL Position
				document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-dojo-attach-point="inputSellButtonNode"]' ).click();
			} else if ( type == "buy" && action == "open" ) { // Open BUY Position
				document.querySelector( 'div[data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-dojo-attach-point="inputBuyButtonNode"]' ).click();
			}

			open_position_price = hour_prices[ current_key ].actual;
			is_opened_position = true;
			position_type = type;

			open_position_interval = setInterval( function(){
				take_profit();
				stop_loss();
			}, 1000 );
		}

	} else { // Position was opened already

		if ( action == "close" && is_opened_position == true ) { // Close Position
			document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-column-id="close"]' ).click();
			clearInterval( open_position_interval );
			is_opened_position = false;
			position_type = "";
			open_position_price = 0;
		}

	}
}

function take_profit() {
	let hour_ = hour_prices[ current_key ];

	if ( is_profit() ) {
		if ( position_type == "sell" ) {
			if (
				hour_.actual - hour_.lowest_price >= tools_[ tool_ ].take_profit_movement ) {
				execute_position( "", "close" );
			}
		} else if ( position_type == "buy" ) {
			if ( hour_.highest_price - hour_.actual >= tools_[ tool_ ].take_profit_movement ) {
				execute_position( "", "close" );
			}
		}
	}
}

function stop_loss() {
	let hour_ = hour_prices[ current_key ];

	if ( position_type == "sell" ) {
		if ( hour_.actual - open_position_price >= tools_[ tool_ ].stop_loss_movement ) {
			execute_position( "", "close" );
		}
	} else if ( position_type == "buy" ) {
		if ( open_position_price - hour_.actual >= tools_[ tool_ ].stop_loss_movement ) {
			execute_position( "", "close" );
		}
	}
}

function is_profit() {
	position_status = false;
	if ( is_opened_position == true ) {
		position_status = parseFloat( document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="'+ tools_[ tool_ ].trader_tool_name +'"] [data-column-id="ppl"]' ).innerText );
	}
	return position_status > 0 && position_status !== false ? true : false;
}

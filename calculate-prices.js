current_time = new Date();
var hour_prices = [];
var current_hour = current_time.getHours();

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
					hour_prices[ info_.key ].date = info_.date;
				}
			}
		}
	};
	xhttp.open( "POST", "https://geronikolov.com/wp-admin/admin-ajax.php", true );
	xhttp.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
	xhttp.send( "action=get_data" );
}

setInterval( function(){
	today = new Date();

	if ( today.getHours() != 23 ) {
		calculate_prices();
	} else {
		if ( today.getMinutes() >= 30 ) {
			calculate_prices();
		}
	}

	hour_inspector = today.getHours();
	if ( hour_inspector != current_hour ) {
		current_hour = hour_inspector;
		last_hour_date = new Date();
		last_hour_date.setHours( current_hour - 1 );
		last_hour_key = last_hour_date.getFullYear() +""+ ( last_hour_date.getMonth() + 1 ) +""+ last_hour_date.getDate() +""+ last_hour_date.getHours();

		if ( typeof( hour_prices[ parseInt( last_hour_key ) ] ) !== "undefined" ) {
			last_hour_info = JSON.stringify( [ hour_prices[ parseInt( last_hour_key ) ] ] );

			var xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function() {
				if ( this.readyState == 4 && this.status == 200 ) {
					console.log( this.response );
				}
			};
			xhttp.open( "POST", "https://geronikolov.com/wp-admin/admin-ajax.php", true );
			xhttp.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
			xhttp.send( "action=store_data&last_hour="+ last_hour_info );
		}
	}
}, 1000 );

function calculate_prices() {
//**** Calculate Action ****//

	today = new Date();
	sell_price = parseFloat( document.querySelector( 'div[data-code="NDAQ100MINI"] .tradebox-price-sell' ).innerText );
	buy_price = parseFloat( document.querySelector( 'div[data-code="NDAQ100MINI"] .tradebox-price-buy' ).innerText );

	calculation_date = today.getFullYear() + '_' + ( today.getMonth() + 1 ) + '_' + today.getDate() + '_' + today.getHours();
	key = parseInt( calculation_date.replace( /_/g, "" ) );
	calculation_time = today.getFullYear() + '-' + ( today.getMonth() + 1 ) + '-' + today.getDate() + ' ' + today.getHours();

	if ( typeof( hour_prices[ key ] ) === "undefined" ) {
		hour_prices[ key ] = {
			date : calculation_time,
			sell : sell_price,
			buy : sell_price,
			actual : sell_price
		};
	} else {
		hour_prices[ key ].date = calculation_time;
		hour_prices[ key ].sell = sell_price;
		hour_prices[ key ].buy = buy_price;
		hour_prices[ key ].actual = sell_price;
	}

//**** Prepare Purchase Action ****//

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
	document.querySelector( 'div[data-code="NDAQ100MINI"] .quantity-list input' ).value = middle_purchase_option_value;

//**** BUY || SELL Action ****//
	//execute_action();
}

function execute_action() {
	for ( count_hours = 1; count_hours <= 4; count_hours++ ) {
		date_before = new Date;
		date_before.setHours( date_before.getHours() - count_hours );
		before_hour_key = date_before.getFullYear() +""+ ( date_before.getMonth() + 1 ) +""+ date_before.getDate() +""+ date_before.getHours();
		console.log( before_hour_key );
	}
}

var hour_prices = [];

setInterval( function(){
	today = new Date();

	if ( today.getHours() != 23 ) {
		calculate_prices();
	} else {
		if ( today.getMinutes() >= 30 ) {
			calculate_prices();
		}
	}
}, 1000 );

function calculate_prices() {
//**** Calculate Action ****//

	today = new Date();
	sell_price = parseFloat( document.querySelector( 'div[data-code="NDAQ100MINI"] .tradebox-price-sell' ).innerText );
	buy_price = parseFloat( document.querySelector( 'div[data-code="NDAQ100MINI"] .tradebox-price-buy' ).innerText );

	key = today.getFullYear() + '_' + ( today.getMonth() + 1 ) + '_' + today.getDate() + '_' + today.getHours();

	if ( typeof( hour_prices[ key ] ) === "undefined" ) {
		hour_prices[ key ] = {
			sell : sell_price,
			buy : sell_price,
			actual : sell_price
		};
	} else {
		hour_prices[ key ].sell = sell_price;
		hour_prices[ key ].buy = buy_price;
		hour_prices[ key ].actual = sell_price;
	}

	localStorage.setItem( "trading_bot_hour_prices", JSON.stringify( hour_prices ) );

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

}

// Get Sell Price
document.querySelector( 'div[data-code="NDAQ100MINI"] .tradebox-price-sell' ).innerText

// Get Buy Price
document.querySelector( 'div[data-code="NDAQ100MINI"] .tradebox-price-buy' ).innerText

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
document.querySelector( 'div[data-code="NDAQ100MINI"] .list_qty div[data-value="7"]' ).click();

// Trigger Sell
document.querySelector( '[data-dojo-attach-point="inputSellButtonNode"]' ).click();

// Trigger Buy
document.querySelector( '[data-dojo-attach-point="inputBuyButtonNode"]' ).click();

// Check if there is opened position
document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"]' );

// Get Position Status
parseFloat( document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"] [data-column-id="ppl"]' ).innerText );

// Close Position
document.querySelector( '[data-dojo-attach-point="tableNode"] [data-code="NDAQ100MINI"] [data-column-id="close"]' ).click();

// Data Fill
hour_prices[ 20195199 ] = {
	sell: 749.29,
	buy: 749.79,
	actual: 749.29
};

hour_prices[ 20195198 ] = {
	sell: 748.88,
	buy: 749.38,
	actual: 748.88
};

hour_prices[ 20195197 ] = {
	sell: 749.42,
	buy: 749.92,
	actual: 749.42
};

hour_prices[ 20195196 ] = {
	sell: 749.43,
	buy: 749.93,
	actual: 749.43
};

hour_prices[ 20195195 ] = {
	sell: 749.44,
	buy: 749.94,
	actual: 749.44
};

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
document.querySelector( 'div[data-code="NDAQ100MINI"] .quantity-list input' ).value = middle_purchase_option_value;

// Trigger Sell
document.querySelector( '[data-dojo-attach-point="inputSellButtonNode"]' ).click();

// Trigger Buy
document.querySelector( '[data-dojo-attach-point="inputBuyButtonNode"]' ).click();

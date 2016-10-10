angular.module('orderCloud')
	.config(MyQuoteConfig)
	.controller('MyQuoteCtrl', MyQuoteController)
	.controller('MyQuoteDetailCtrl', MyQuoteDetailController)
	.controller('QuoteDeliveryOptionCtrl', QuoteDeliveryOptionController )
	.controller('ReviewQuoteCtrl', ReviewQuoteController )
	.controller('ConfirmQuoteCtrl', ConfirmQuoteController )
;

function MyQuoteConfig($stateProvider) {
	$stateProvider
		.state('myquote', {
			parent: 'base',
			url: '/myquote',
			templateUrl: 'myquote/templates/myquote.tpl.html',
			controller: 'MyQuoteCtrl',
			controllerAs: 'myquote',
			resolve: {
				Quote: function(WeirService) {
					// Return Order object for current id
					return {};
				}
			}
		})
		.state( 'myquote.detail', {
			url: '/detail',
			templateUrl: 'myquote/templates/myquote.detail.tpl.html',
			controller: 'MyQuoteDetailCtrl',
			controllerAs: 'detail',
			resolve: {
				LineItems: function(WeirService) {
					return [];
					// return line items for current id
				}
			}
		})
		.state( 'myquote.delivery', {
			url: '/delivery',
			templateUrl: 'myquote/templates/myquote.deliveryoption.tpl.html',
			controller: 'QuoteDeliveryOptionCtrl',
			controllerAs: 'delivery'
		})
		.state( 'myquote.review', {
			url: '/review',
		        templateUrl: 'myquote/templates/myquote.review.tpl.html',
			controller: 'ReviewQuotesCtrl',
			controllerAs: 'review'
		})
		.state( 'myquote.confirm', {
			url: '/confirm',
			templateUrl: 'myquote/templates/myquote.confirm.tpl.html',
			controller: 'ConfirmQuoteCtrl',
			controllerAs: 'confirm'
		})
	;
}

function MyQuoteController($sce, $state, WeirService, Quote) {
	var vm = this;
	vm.Quote = Quote;

	var labels = {
		en: {
			YourQuote: "Your Quote",
			DeliveryOptions: "Delivery Options",
			ReviewQuote: "Review Quote",
			ConfirmOrder: "Confirm Order",
			Save: "Save",
			Share: "Share",
			Download: "Download",
			Print: "Print"
		},
		fr: {
			YourQuote: $sce.trustAsHtml("FR: Your Quote"),
			DeliveryOptions: $sce.trustAsHtml("FR: Delivert Options"),
			ReviewQuote: $sce.trustAsHtml("FR: Review Quote"),
			ConfirmOrder: $sce.trustAsHtml("FR: Confirm Order"),
			Save: $sce.trustAsHtml("FR: Save"),
			Share: $sce.trustAsHtml("FR: Share"),
			Download: $sce.trustAsHtml("FR: Download"),
			Print: $sce.trustAsHtml("FR: Print")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
}

function MyQuoteDetailController(WeirService, $state, $sce, LineItems ) {
	var vm = this;
	vm.LineItems = LineItems;
	
	var labels = {
		en: {
                    Customer: "Customer",
                    QuoteNumber: "Quote number",
                    AddNew: "Add new items",
                    SerialNum: "Serial number",
                    TagNum: "Tag number (if available)",
                    PartNum: "Part number",
                    PartDesc: "Description of part",
                    RecRepl: "Recommended replacement",
                    LeadTime: "Lead time",
                    PricePer: "Price per item or set",
                    Quantity: "Quantity",
                    Total: "Total",
                    UploadHeader: "Upload your service or operating condition document",
                    UploadInstruct: "Please upload any supporting documentation you have for valves  or spares requested so we can ensure use these for reference for this quote.",
                    RefNumHeader: "Add your reference number for this quote",
                    CommentsHeader: "Your comments or instructions",
                    CommentsInstr: "Please add any specific comments or instructions for this quote",
		    DeliveryOptions: "Delivery Options"
		},
		fr: {
			Customer: $sce.trustAsHtml("FR: Customer"),
                    QuoteNumber: $sce.trustAsHtml("FR: Quote number"),
                    AddNew: $sce.trustAsHtml("FR: Add new items"),
                    SerialNum: $sce.trustAsHtml("FR: Serial number"),
                    TagNum: $sce.trustAsHtml("FR: Tag number (if available)"),
                    PartNum: $sce.trustAsHtml("FR: Part number"),
                    PartDesc: $sce.trustAsHtml("FR: Description of part"),
                    RecRepl: $sce.trustAsHtml("FR: Recommended replacement"),
                    LeadTime: $sce.trustAsHtml("FR: Lead time"),
                    PricePer: $sce.trustAsHtml("FR: Price per item or set"),
                    Quantity: $sce.trustAsHtml("FR: Quantity"),
                    Total: $sce.trustAsHtml("FR: Total"),
                    UploadHeader: $sce.trustAsHtml("FR: Upload your service or operating condition document"),
                    UploadInstruct: $sce.trustAsHtml("FR: Please upload any supporting documentation you have for valves  or spares requested so we can ensure use these for reference for this quote."),
                    RefNumHeader: $sce.trustAsHtml("FR: Add your reference number for this quote"),
                    CommentsHeader: $sce.trustAsHtml("FR: Your comments or instructions"),
                    CommentsInstr: $sce.trustAsHtml("FR: Please add any specific comments or instructions for this quote"),
		    DeliveryOptions: $sce.trustAsHtml("FR: Delivery Options")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
}

function QuoteDeliveryOptionController(WeirService, $state, $sce) {
	var vm = this;
	var labels = {
		en: {
		},
		fr: {
		}
	};
}


function ReviewQuoteController(WeirService, $state, $sce) {
	var vm = this;
	var labels = {
		en: {
		},
		fr: {
		}
	};
}


function ConfirmQuoteController(WeirService, $state, $sce) {
	var vm = this;
	var labels = {
		en: {
		},
		fr: {
		}
	};
}


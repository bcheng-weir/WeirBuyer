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
				Quote: function(CurrentOrder) {
					return CurrentOrder.Get();
				},
			        Customer: function(CurrentOrder) {
				    return CurrentOrder.GetCurrentCustomer();
				}
			}
		})
		.state( 'myquote.detail', {
			url: '/detail',
			templateUrl: 'myquote/templates/myquote.detail.tpl.html',
			controller: 'MyQuoteDetailCtrl',
			controllerAs: 'detail',
			resolve: {
                            LineItems: function($q, $state, toastr, Underscore, CurrentOrder, OrderCloud, LineItemHelpers) {
                                var dfd = $q.defer();
				CurrentOrder.GetID()
                                .then(function(id) {
			             OrderCloud.LineItems.List(id)
                                     .then(function(data) {
                                         if (!data.Items.length) {
                                             toastr.error('Your quote does not contain any line items.', 'Error');
                                             dfd.resolve({Items: []});
                                         } else {
                                             LineItemHelpers.GetProductInfo(data.Items)
                                             .then(function() { dfd.resolve(data); });
                                        }
                                    })
                               })
                               .catch(function() {
                                   toastr.error('Your order does not contain any line items.', 'Error');
                                   dfd.resolve({ Items: [] });
                               });
                               return dfd.promise;
                           }
                     }
		})
		.state( 'myquote.delivery', {
			url: '/delivery',
			templateUrl: 'myquote/templates/myquote.delivery.tpl.html',
			controller: 'QuoteDeliveryOptionCtrl',
			controllerAs: 'delivery'
		})
		.state( 'myquote.review', {
			url: '/review',
		        templateUrl: 'myquote/templates/myquote.review.tpl.html',
			controller: 'ReviewQuoteCtrl',
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

function MyQuoteController($sce, $state, toastr, WeirService, Quote, Customer) {
	var vm = this;
	vm.Quote = Quote;
	vm.Customer = Customer;
	vm.SaveableStatuses = [
		WeirService.OrderStatus.Draft.id,
		WeirService.OrderStatus.Saved.id,
		WeirService.OrderStatus.Shared.id
	];

	function save() {
		if (vm.Quote.xp.Status == WeirService.OrderStatus.Draft.id) {
		    // TODO: FAIL if no line items
		}
		var mods = {
		    Comments: vm.Quote.Comments,
		    xp: {
		        StatusDate: new Date(),
			RefNum: vm.Quote.xp.RefNum,
			Name: vm.Quote.xp.Name
		    }
		};
		if (vm.Quote.xp.Status == WeirService.OrderStatus.Draft.id) {
		    mods.xp.Status = WeirService.OrderStatus.Saved.id;
		}
		WeirService.UpdateQuote(vm.Quote.ID, mods)
			.then(function(quote) {
			    vm.Quote = quote;
			    toastr.success(vm.labels.SaveSuccessMessage, vm.labels.SaveSuccessTitle);
				// Do something here?
			});
	}
	function share() {
		alert("TODO: Implement share quote");
	}
	function download() {
		alert("TODO: Implement download quote");
	}
	function print() {
		alert("TODO: Implement print quote");
	}

	var labels = {
		en: {
			YourQuote: "Your Quote",
			DeliveryOptions: "Delivery Options",
			ReviewQuote: "Review Quote",
			ConfirmOrder: "Confirm Order",
			Save: "Save",
			Share: "Share",
			Download: "Download",
			Print: "Print",
                        SaveSuccessTitle: "Quote Saved",
                        SaveSuccessMessage: "Your changes have been saved"
		},
		fr: {
			YourQuote: $sce.trustAsHtml("FR: Your Quote"),
			DeliveryOptions: $sce.trustAsHtml("FR: Delivert Options"),
			ReviewQuote: $sce.trustAsHtml("FR: Review Quote"),
			ConfirmOrder: $sce.trustAsHtml("FR: Confirm Order"),
			Save: $sce.trustAsHtml("FR: Save"),
			Share: $sce.trustAsHtml("FR: Share"),
			Download: $sce.trustAsHtml("FR: Download"),
			Print: $sce.trustAsHtml("FR: Print"),
                        SaveSuccessTitle: $sce.trustAsHtml("FR: Quote Saved"),
                        SaveSuccessMessage: $sce.trustAsHtml("FR: Your changes have been saved")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
	vm.Save = save;
	vm.Share = share;
	vm.Download = download;
	vm.Print = print;
}

function MyQuoteDetailController(WeirService, $state, $sce, LineItems ) {
	var vm = this;
	vm.LineItems = LineItems.Items;
	
	var labels = {
		en: {
                    Customer: "Customer; ",
                    QuoteNumber: "Quote number ",
                    QuoteName: "Quote name ",
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
                    QuoteName: $sce.trustAsHtml("Quote name "),
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


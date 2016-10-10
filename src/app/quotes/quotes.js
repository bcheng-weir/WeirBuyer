angular.module('orderCloud')
	.config(QuotesConfig)
	.controller('QuotesCtrl', QuotesController)
	.controller('SavedQuotesCtrl', SavedQuotesController)
	.controller( 'SharedQuotesCtrl', SharedQuotesController )
	.controller( 'ApprovedQuotesCtrl', ApprovedQuotesController )
	.controller( 'RejectedQuotesCtrl', RejectedQuotesController )
;

function QuotesConfig($stateProvider) {
	$stateProvider
		.state('quotes', {
			parent: 'base',
			url: '/quotes',
			templateUrl: 'quotes/templates/quotes.tpl.html',
			controller: 'QuotesCtrl',
			controllerAs: 'quotes'
		})
		.state( 'quotes.saved', {
			url: '/saved',
			templateUrl: 'quotes/templates/quotes.saved.tpl.html',
			controller: 'SavedQuotesCtrl',
			controllerAs: 'saved',
			resolve: {
				Quotes: function(WeirService) {
					return WeirService.FindQuotes([WeirService.OrderStatus.Saved], false);
				}
			}
		})
		.state( 'quotes.shared', {
			url: '/shared',
			templateUrl: 'quotes/templates/quotes.shared.tpl.html',
			controller: 'SharedQuotesCtrl',
			controllerAs: 'shared',
			resolve: {
				Quotes: function(WeirService) {
					return WeirService.FindQuotes([WeirService.OrderStatus.Shared], true);
				}
			}
		})
		.state( 'quotes.rejected', {
			url: '/rejected',
		        templateUrl: 'quotes/templates/quotes.rejected.tpl.html',
			controller: 'RejectedQuotesCtrl',
			controllerAs: 'rejected',
			resolve: {
				Quotes: function(WeirService) {
					return WeirService.FindQuotes([WeirService.OrderStatus.Rejected]);
				}
			}
		})
		.state( 'quotes.approved', {
			url: '/approved',
			templateUrl: 'quotes/templates/quotes.approved.tpl.html',
			controller: 'ApprovedQuotesCtrl',
			controllerAs: 'approved',
			resolve: {
				Quotes: function(WeirService) {
					return WeirService.FindQuotes([WeirService.OrderStatus.Approved]);
				}
			}
		})
	;
}

function QuotesController($sce, $state, WeirService) {
	var vm = this;
	vm.getStatusLabel = function(id) {
		var status = WeirService.LookupStatus(id);
		if (status) {
			return status.label;
			// TODO: Address localization
		}
	};

	var labels = {
		en: {
			Saved: "Saved",
			Shared: "Shared",
			Approved: "Approved",
			Rejected: "Rejected"
		},
		fr: {
			Saved: "Saved",
			Shared: "Shared",
			Approved: "Approved",
			Rejected: "Rejected"
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
}

function SavedQuotesController(WeirService, $state, $sce, Quotes ) {
	var vm = this;
	vm.Quotes = Quotes;
	
	var labels = {
		en: {
		    Header: Quotes.length.toString() + " saved Quote" +  (Quotes.length == 1 ? "" : "s"),
		    QuoteNum: "Weir Quote number",
		    QuoteRef: "Your Quote ref;",
                    Total: "Total",
                    Customer: "Customer",
                    Status: "Status",
                    ValidTo: "Valid until"
		},
		fr: {
			Header: $sce.trustAsHtml("FR: " + Quotes.length.toString() + " saved Quote" +  (Quotes.length == 0 ? "" : "s")),
		    QuoteNum: $sce.trustAsHtml("FR-Weir Quote number"),
		    QuoteRef: $sce.trustAsHtml("FR-Your Quote ref;"),
                    Total: $sce.trustAsHtml("FR-Total"),
                    Customer: $sce.trustAsHtml("FR-Customer"),
                    Status: $sce.trustAsHtml("FR-Status"),
                    ValidTo: $sce.trustAsHtml("FR-Valid until")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
}


function SharedQuotesController(WeirService, $state, $sce, Quotes ) {
	var vm = this;
	vm.Quotes = Quotes;
	
	var labels = {
		en: {
		    Header: Quotes.length.toString() + " saved Quote" +  (Quotes.length == 1 ? "" : "s"),
		    QuoteNum: "Weir Quote number",
		    QuoteRef: "Your Quote ref;",
                    Total: "Total",
                    Customer: "Customer",
		    Approver: "Approver",
                    Status: "Status",
                    ValidTo: "Valid until"
		},
		fr: {
			Header: $sce.trustAsHtml("FR: " + Quotes.length.toString() + " saved Quote" +  (Quotes.length == 0 ? "" : "s")),
		    QuoteNum: $sce.trustAsHtml("FR-Weir Quote number"),
		    QuoteRef: $sce.trustAsHtml("FR-Your Quote ref;"),
                    Total: $sce.trustAsHtml("FR-Total"),
                    Customer: $sce.trustAsHtml("FR-Customer"),
                    Approver: $sce.trustAsHtml("FR-Approver"),
                    Status: $sce.trustAsHtml("FR-Status"),
                    ValidTo: $sce.trustAsHtml("FR-Valid until")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
}


function RejectedQuotesController(WeirService, $state, $sce, Quotes ) {
	var vm = this;
	vm.Quotes = Quotes;
	
	var labels = {
		en: {
		},
		fr: {
		}
	};
}


function ApprovedQuotesController(WeirService, $state, $sce, Quotes ) {
	var vm = this;
	vm.Quotes = Quotes;
	
	var labels = {
		en: {
		},
		fr: {
		}
	};
}


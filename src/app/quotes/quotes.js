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
				Quotes: function(OrderCloud) {
					return [];
					// return OrderCloud.Me.ListCategories(null, 1, 100, null, null, null, 3);
				}
			}
		})
		.state( 'quotes.shared', {
			url: '/shared',
			templateUrl: 'quotes/templates/quotes.shared.tpl.html',
			controller: 'SharedQuotesCtrl',
			controllerAs: 'shared',
			resolve: {
				Quotes: function( $stateParams, WeirService ) {
					return [];
					// return WeirService.SerialNumbers($stateParams.numbers.split(','));
				}
			}
		})
		.state( 'quotes.rejected', {
			url: '/rejected',
		        templateUrl: 'quotes/templates/quotes.rejected.tpl.html',
			controller: 'RejectedQuotesCtrl',
			controllerAs: 'rejected',
			resolve: {
				Quotes: function( $stateParams, WeirService ) {
					return [];
					// return WeirService.SerialNumbers($stateParams.numbers.split(','));
				}
			}
		})
		.state( 'quotes.approved', {
			url: '/approved',
			templateUrl: 'quotes/templates/quotes.approved.tpl.html',
			controller: 'ApprovedQuotesCtrl',
			controllerAs: 'approved',
			resolve: {
				Quotes: function( $stateParams, WeirService ) {
					return [];
					// return WeirService.SerialNumbers($stateParams.numbers.split(','));
				}
			}
		})
	;
}

function QuotesController($sce, $state, WeirService) {
	var vm = this;
	// vm.serialNumberList = SerialNumbers.Items;

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
		},
		fr: {
		}
	};
}


function SharedQuotesController(WeirService, $state, $sce, Quotes ) {
	var vm = this;
	vm.Quotes = Quotes;
	
	var labels = {
		en: {
		},
		fr: {
		}
	};
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


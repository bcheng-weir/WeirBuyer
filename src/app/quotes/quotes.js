angular.module('orderCloud')
	.config(QuotesConfig)
	.controller('QuotesCtrl', QuotesController)
	.controller('SavedQuotesCtrl', SavedQuotesController)
	.controller('InReviewQuotesCtrl', InReviewQuotesController)
	.controller( 'ConfirmedQuotesCtrl', ConfirmedQuotesController )
	.controller( 'RevisedQuotesCtrl', RevisedQuotesController )
;

function QuotesConfig($stateProvider, buyerid) {
	$stateProvider
		.state('quotes', {
			parent: 'base',
			url: '/quotes',
			templateUrl: 'quotes/templates/quotes.tpl.html',
			controller: 'QuotesCtrl',
			controllerAs: 'quotes',
			resolve: {
				Customer: function(CurrentOrder) {
					return CurrentOrder.GetCurrentCustomer();
				},
                MyOrg: function(OrderCloud) {
					return OrderCloud.Buyers.Get(buyerid);
				}
			}
		})
		.state( 'quotes.saved', {
			url: '/saved',
			templateUrl: 'quotes/templates/quotes.saved.tpl.html',
			controller: 'SavedQuotesCtrl',
			controllerAs: 'saved',
			resolve: {
				Quotes: function(WeirService) {
					// return [];
					return WeirService.FindQuotes([WeirService.OrderStatus.Saved], false);
				},
                CurrentOrderId: function(CurrentOrder) {
					return "";
					// return CurrentOrder.GetID();
				}
			}
		})
		.state( 'quotes.inreview', {
			url: '/inreview',
			templateUrl: 'quotes/templates/quotes.inreview.tpl.html',
			controller: 'InReviewQuotesCtrl',
			controllerAs: 'inreview',
			resolve: {
				Quotes: function(WeirService) {
					return WeirService.FindQuotes([WeirService.OrderStatus.Submitted], true);
				}
			}
		})
		.state( 'quotes.revised', {
			url: '/revised',
		        templateUrl: 'quotes/templates/quotes.revised.tpl.html',
			controller: 'RevisedQuotesCtrl',
			controllerAs: 'revised',
			resolve: {
				Quotes: function(WeirService) {
				    return WeirService.FindQuotes([WeirService.OrderStatus.RevisedQuote]);
				}
			}
		})
		.state( 'quotes.confirmed', {
			url: '/confirmed',
			templateUrl: 'quotes/templates/quotes.confirmed.tpl.html',
			controller: 'ConfirmedQuotesCtrl',
			controllerAs: 'confirmed',
			resolve: {
				Quotes: function(WeirService) {
				    return WeirService.FindQuotes([WeirService.OrderStatus.ConfirmedQuote]);
				}
			}
		})
	;
}

function QuotesController($sce, $state, WeirService, Customer, MyOrg) {
	var vm = this;
	vm.Customer = Customer;
	vm.MyOrg = MyOrg;
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
			InReview: "Quotes submitted for review",
			Revised: "Revised Quotes",
			Confirmed: "Confirmed Quotes"
		},
		fr: {
		    Saved: $sce.trustAsHtml("Sauv&eacute;"),
		    InReview: "**Cotation soumis pour examen",
		    Revised: $sce.trustAsHtml("**Cotation r&eacute;vis&eacute;es"),
		    Confirmed: $sce.trustAsHtml("Cotation confirm&eacute;es"),
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
}

function SavedQuotesController(WeirService, $state, $sce, $rootScope, CurrentOrder, Quotes, CurrentOrderId) {
	var vm = this;
	vm.Quotes = Quotes;
	vm.CurrentOrderId = CurrentOrderId;
	
	function _reviewQuote(quoteId) {
	    var gotoReview = (vm.CurrentOrderId != quoteId) && (WeirService.CartHasItems()) ? confirm(vm.labels.ReplaceCartMessage) : true;
        if (gotoReview) {
			WeirService.SetQuoteAsCurrentOrder(quoteId)
                .then(function() {
	                $rootScope.$broadcast('SwitchCart');
                    $state.go('myquote.detail');
				});
		}
    }

	var labels = {
		en: {
		    Header: Quotes.length.toString() + " saved Quote" +  (Quotes.length == 1 ? "" : "s"),
		    QuoteNum: "Weir Quote number",
			QuoteName: "Quote Name",
		    QuoteRef: "Your Quote ref;",
            Total: "Total",
            Customer: "Customer",
			Status: "Status",
            ValidTo: "Valid until",
		    OwnProduct: "Own product",
		    ReplaceCartMessage: "Continuing with this action will change your cart to this quote. Are you sure you want to proceed?"
		},
		fr: {
		    Header: $sce.trustAsHtml(Quotes.length.toString() + " cotation(s) sauv&eacute;e(s)"),
		    QuoteNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de cotation chez WEIR"),
		    QuoteName: $sce.trustAsHtml("Nom de la cotation"),
			QuoteRef: $sce.trustAsHtml("Votre R&eacute;f&eacute;rence de cotation"),
            Total: $sce.trustAsHtml("Total"),
            Customer: $sce.trustAsHtml("Client"),
            Status: $sce.trustAsHtml("Statut"),
            ValidTo: $sce.trustAsHtml("Valide jusqu'&agrave;"),
            OwnProduct: $sce.trustAsHtml("Propre Produit"),
            ReplaceCartMessage: $sce.trustAsHtml("La poursuite de cette action va changer votre panier pour cette cotation. Etes-vous s&ucirc;r de vouloir continuer?")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
	vm.ReviewQuote = _reviewQuote;
}


function InReviewQuotesController(WeirService, $state, $sce, Quotes) {
	var vm = this;
	vm.Quotes = Quotes;
	
	var labels = {
		en: {
		    Header: Quotes.length.toString() + " Quote" +  (Quotes.length == 1 ? "" : "s under review"),
		    QuoteNum: "Weir Quote number",
		    QuoteRef: "Your Quote ref;",
            Total: "Total",
            Customer: "Customer",
		    OwnProduct: "Own product",
		    Approver: "Approver",
            Status: "Status",
            ValidTo: "Valid until"
		},
		fr: {
		    Header: $sce.trustAsHtml(Quotes.length.toString() + " cotation(s) dans l'examen"),
		    QuoteNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de cotation chez WEIR"),
		    QuoteRef: $sce.trustAsHtml("Votre R&eacute;f&eacute;rence de cotation"),
		    Total: $sce.trustAsHtml("Total"),
		    Customer: $sce.trustAsHtml("Client"),
		    OwnProduct: $sce.trustAsHtml("Propre Produit"),
		    Approver: $sce.trustAsHtml("Approuv&eacute;"),
            Status: $sce.trustAsHtml("Statut"),
            ValidTo: $sce.trustAsHtml("Valide jusqu'&agrave;")
	
	}
	};
	vm.labels = WeirService.LocaleResources(labels);
}


function RevisedQuotesController(WeirService, $state, $sce, Quotes ) {
	var vm = this;
	vm.Quotes = Quotes;
	
	var labels = {
		en: {
		},
		fr: {
		}
	};
}


function ConfirmedQuotesController(WeirService, $state, $sce, Quotes ) {
	var vm = this;
	vm.Quotes = Quotes;
	
	var labels = {
		en: {
		},
		fr: {
		}
	};
}


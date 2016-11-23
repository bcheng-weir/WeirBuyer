angular.module('orderCloud')
	.config(QuotesConfig)
	.controller('QuotesCtrl', QuotesController)
	.controller('SavedQuotesCtrl', SavedQuotesController)
	.controller('InReviewQuotesCtrl', InReviewQuotesController)
	.controller('RouteToQuoteCtrl', RouteToQuoteController)
;

function QuotesConfig($stateProvider) {
	$stateProvider
		.state('quotes', {
			parent: 'base',
			url: '/quotes',
			templateUrl: 'quotes/templates/quotes.tpl.html',
			controller: 'QuotesCtrl',
			controllerAs: 'quotes',
			resolve: {
				CurrentCustomer: function(CurrentOrder) {
					return CurrentOrder.GetCurrentCustomer();
				},
				MyOrg: function(OrderCloud, CurrentCustomer) {
					return OrderCloud.Buyers.Get(CurrentCustomer.id);
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
					return WeirService.FindQuotes([WeirService.OrderStatus.Saved], false);
				},
                CurrentOrderId: function(CurrentOrder) {
					return CurrentOrder.GetID()
						.catch(function() {
							return {};
						});
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
					return WeirService.FindQuotes([WeirService.OrderStatus.Submitted,WeirService.OrderStatus.Review,WeirService.OrderStatus.RejectedQuote], true);
				}
			}
		})
		.state( 'quotes.revised', {
			url: '/revised',
			templateUrl: 'quotes/templates/quotes.saved.tpl.html',
			controller: 'SavedQuotesCtrl',
			controllerAs: 'saved',
			resolve: {
				Quotes: function(WeirService) {
				    return WeirService.FindQuotes([WeirService.OrderStatus.RevisedQuote]);
				},
				CurrentOrderId: function ($q, CurrentOrder) {
				    var d = $q.defer();
				    CurrentOrder.GetID()
                    .then(function (id) { d.resolve(id); })
                    .catch(function (e) { d.resolve(null); });
				    return d.promise;
				}
			}
		})
		.state( 'quotes.confirmed', {
			url: '/confirmed',
			templateUrl: 'quotes/templates/quotes.confirmed.tpl.html',
			controller: 'SavedQuotesCtrl',
			controllerAs: 'saved',
			resolve: {
				Quotes: function(WeirService) {
				    return WeirService.FindQuotes([WeirService.OrderStatus.ConfirmedQuote]);
				},
				CurrentOrderId: function ($q, CurrentOrder) {
				    var d = $q.defer();
				    CurrentOrder.GetID()
                        .then(function (id) { d.resolve(id); })
                        .catch(function (e) { d.resolve(null); });
					return d.promise;
				}
			}
		})
		.state('quotes.goto', {
			url:'/:quoteID',
			controller: 'RouteToQuoteCtrl',
			resolve: {
				Quote: function ($stateParams, OrderCloud) {
		            		return OrderCloud.Orders.Get($stateParams.quoteID);
		        	}
			}
		})
	;
}

function QuotesController($sce, WeirService, CurrentCustomer, MyOrg) {
	var vm = this;
	vm.Customer = CurrentCustomer;
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
		    InReview: $sce.trustAsHtml("**Cotation soumis pour examen"),
		    Revised: $sce.trustAsHtml("**Cotation r&eacute;vis&eacute;es"),
		    Confirmed: $sce.trustAsHtml("Cotation confirm&eacute;es")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
}

function SavedQuotesController(WeirService, $state, $sce, $rootScope, Quotes, CurrentOrderId) {
	var vm = this;
	vm.Quotes = Quotes;
	vm.CurrentOrderId = CurrentOrderId;
	
	function _reviewQuote(quoteId, status) {
	    if (status == WeirService.OrderStatus.ConfirmedQuote.id) {
			WeirService.SetQuoteAsCurrentOrder(quoteId)
				.then(function() {
					$rootScope.$broadcast('SwitchCart');
					$state.go('myquote.readonly', { quoteID: quoteId });
				});
	    } else {
	        var gotoReview = (vm.CurrentOrderId != quoteId) && (WeirService.CartHasItems()) ? confirm(vm.labels.ReplaceCartMessage) : true;
	        if (gotoReview) {
	            WeirService.SetQuoteAsCurrentOrder(quoteId)
                    .then(function () {
                        $rootScope.$broadcast('SwitchCart');
                        if (status == WeirService.OrderStatus.RevisedQuote.id) {
                            $state.go('myquote.revised');
                        } else {
                            $state.go('myquote.detail');
                        }
                    });
	        }
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
            View: "View",
		    ReplaceCartMessage: "Continuing with this action will change your cart to this quote. Are you sure you want to proceed?",
			ConfirmedListMessage: "You can convert confirmed quotes to orders. View the confirmed quote and select; Submit order with PO<br><br>Confirmed quotes are valid for 30 days from confirmation",
			Revisions: "Revisions"
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
            View: $sce.trustAsHtml("FR: View"),
            ReplaceCartMessage: $sce.trustAsHtml("La poursuite de cette action va changer votre panier pour cette cotation. Etes-vous s&ucirc;r de vouloir continuer?"),
			ConfirmedListMessage: $sce.trustAsHtml("You can convert confirmed quotes to orders. View the confirmed quote and select; Submit order with PO<br><br>Confirmed quotes are valid for 30 days from confirmation"),
			Revisions: $sce.trustAsHtml("Revisions")
		}
	};
	if ($state.is('quotes.revised')) {
	    labels.en.Header = Quotes.length.toString() + " revised Quote" + (Quotes.length == 1 ? "" : "s");
	    labels.fr.Header = "FR: " + Quotes.length.toString() + " revised Quote" + (Quotes.length == 1 ? "" : "s");
	} else if ($state.is('quotes.confirmed')) {
	    labels.en.Header = Quotes.length.toString() + " confirmed Quote" + (Quotes.length == 1 ? "" : "s");
	    labels.fr.Header = "FR: " + Quotes.length.toString() + " confirmed Quote" + (Quotes.length == 1 ? "" : "s");
	}
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
function RouteToQuoteController($state, WeirService, toastr, Quote) {
	if (Quote) {
		WeirService.SetQuoteAsCurrentOrder(quote.ID)
		.then(function() {
			$rootScope.$broadcast('SwitchCart');
			$state.go('myquote.detail');
		});
	} else {
		toastr.error("Quote not found");
		$state.go('quotes.saved');
	}
}

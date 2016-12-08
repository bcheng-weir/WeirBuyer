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
			url: '/quotes?from&to&search&page&pageSize&searchOn&sortBy&filters&buyerid',
			templateUrl: 'quotes/templates/quotes.tpl.html',
			controller: 'QuotesCtrl',
			controllerAs: 'quotes',
			data: {
				componentName: 'Quotes'
			},
			resolve: {
				CurrentCustomer: function(CurrentOrder) {
					return CurrentOrder.GetCurrentCustomer();
				},
				CurrentOrderId: function ($q, CurrentOrder) {
					var d = $q.defer();
					CurrentOrder.GetID()
						.then(function (id) { d.resolve(id); })
						.catch(function (e) { d.resolve(null); });
					return d.promise;
				},
				Parameters: function($stateParams, OrderCloudParameters) {
					return OrderCloudParameters.Get($stateParams);
				},
				Quotes: function(OrderCloud, WeirService, Parameters, Me) {
					//return WeirService.FindOrders(Parameters, false);
					if(Parameters && Parameters.search && Parameters.search != 'undefined') {
						Parameters.searchOn = Parameters.searchOn ? Parameters.searchOn : "ID,FromUserID,Total,xp";
					}
					return OrderCloud.Orders.ListOutgoing(Parameters.from, Parameters.to, Parameters.search, Parameters.page, Parameters.pageSize || 10, Parameters.searchOn, Parameters.sortBy, Parameters.filters, Me.Org.ID);
				}
			}
		})
		.state( 'quotes.saved', {
			url: '/saved',
			templateUrl: 'quotes/templates/quotes.saved.tpl.html',
			controller: 'SavedQuotesCtrl',
			controllerAs: 'saved'
		})
		.state( 'quotes.inreview', {
			url: '/inreview',
			templateUrl: 'quotes/templates/quotes.inreview.tpl.html',
			controller: 'InReviewQuotesCtrl',
			controllerAs: 'inreview'
		})
		.state( 'quotes.revised', {
			url: '/revised',
			templateUrl: 'quotes/templates/quotes.saved.tpl.html',
			controller: 'SavedQuotesCtrl',
			controllerAs: 'saved'
		})
		.state( 'quotes.confirmed', {
			url: '/confirmed',
			templateUrl: 'quotes/templates/quotes.confirmed.tpl.html',
			controller: 'SavedQuotesCtrl',
			controllerAs: 'saved'
		})
		.state('quotes.goto', {
			url:'/:quoteID',
			controller: 'RouteToQuoteCtrl',
			resolve: {
			    Quote: function ($q, appname, $localForage, $stateParams, OrderCloud) {
			        var storageName = appname + '.routeto';
			        var d = $q.defer();
			        $localForage.setItem(storageName, { state: 'quotes', id: $stateParams.quoteID })
                        .then(function () {
                            OrderCloud.Orders.Get($stateParams.quoteID)
                                .then(function (quote) {
                                    $localForage.removeItem(storageName);
                                    d.resolve(quote);
                                });
                        });
			        return d.promise;
			    }
			}
		});
}

function QuotesController($sce, $state, $ocMedia, WeirService, Me, CurrentCustomer, CurrentOrderId, Parameters, Quotes, OrderCloudParameters) {
	var vm = this;
	vm.list = Quotes;
	vm.parameters = Parameters;
	vm.Customer = CurrentCustomer;
	vm.MyOrg = Me.Org;
	vm.CurrentOrderId = CurrentOrderId;
	vm.getStatusLabel = function(id) {
		var status = WeirService.LookupStatus(id);
		if (status) {
			return status.label;
			// TODO: Address localization
		}
	};

	vm.sortSelection = Parameters.sortBy ? (Parameters.sortBy.indexOf('!') == 0 ? Parameters.sortBy.split('!')[1] : Parameters.sortBy) : null;

	//Check if filters are applied
	vm.filtersApplied = vm.parameters.filters || vm.parameters.from || vm.parameters.to || ($ocMedia('max-width:767px') && vm.sortSelection); //Sort by is a filter on mobile devices
	vm.showFilters = vm.filtersApplied;

	//Check if search was used
	vm.searchResults = Parameters.search && Parameters.search.length > 0;

	//Reload the state with new parameters
	vm.filter = function(resetPage) {
		$state.go('.', OrderCloudParameters.Create(vm.parameters, resetPage));
	};

	//Reload the state with new search parameter & reset the page
	vm.search = function() {
		vm.filter(true);
	};

	//Clear the search parameter, reload the state & reset the page
	vm.clearSearch = function() {
		vm.parameters.search = null;
		vm.filter(true);
	};

	//Clear relevant filters, reload the state & reset the page
	vm.clearFilters = function() {
		vm.parameters.filters = null;
		vm.parameters.from = null;
		vm.parameters.to = null;
		$ocMedia('max-width:767px') ? vm.parameters.sortBy = null : angular.noop(); //Clear out sort by on mobile devices
		vm.filter(true);
	};

	//Conditionally set, reverse, remove the sortBy parameter & reload the state
	vm.updateSort = function(value) {
		value ? angular.noop() : value = vm.sortSelection;
		switch(vm.parameters.sortBy) {
			case value:
				vm.parameters.sortBy = '!' + value;
				break;
			case '!' + value:
				vm.parameters.sortBy = null;
				break;
			default:
				vm.parameters.sortBy = value;
		}
		vm.filter(false);
	};

	//Used on mobile devices
	vm.reverseSort = function() {
		Parameters.sortBy.indexOf('!') == 0 ? vm.parameters.sortBy = Parameters.sortBy.split('!')[1] : vm.parameters.sortBy = '!' + Parameters.sortBy;
		vm.filter(false);
	};

	//Reload the state with the incremented page parameter
	vm.pageChanged = function() {
		$state.go('.', {page:vm.list.Meta.Page});
	};

	//Load the next page of results with all of the same parameters
	vm.loadMore = function() {
		return OrderCloud.Orders[UserType == 'admin' ? 'ListIncoming' : 'ListOutgoing'](Parameters.from, Parameters.to, Parameters.search, vm.list.Meta.Page + 1, Parameters.pageSize || vm.list.Meta.PageSize, Parameters.searchOn, Parameters.sortBy, Parameters.filters)
			.then(function(data) {
				vm.list.Items = vm.list.Items.concat(data.Items);
				vm.list.Meta = data.Meta;
			});
	};

	var labels = {
		en: {
			Saved: "Saved",
			InReview: "Quotes Submitted for Review",
			Revised: "Revised Quotes",
			Confirmed: "Confirmed Quotes",
			LoadMore: "Load More"
		},
		fr: {
		    Saved: $sce.trustAsHtml("Sauv&eacute;"),
		    InReview: $sce.trustAsHtml("Cotation soumise &agrave; r&eacute;vision"),
		    Revised: $sce.trustAsHtml("Cotation r&eacute;vis&eacute;e"),
		    Confirmed: $sce.trustAsHtml("Devis confirm&eacute;"),
			LoadMore: $sce.trustAsHtml("FR: Load More")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);

	vm.FilterActions = _filterActions;
	function _filterActions(action) {
		var filter = {
			"quotes.saved": {
				"xp.Type": "Quote",
				"xp.Status": WeirService.OrderStatus.Saved.id+"|"+WeirService.OrderStatus.Draft.id,
				"xp.Active":true
			},
			"quotes.inreview": {
				"xp.Type": "Quote",
				"xp.Status": WeirService.OrderStatus.Submitted.id+"|"+WeirService.OrderStatus.Review.id,
				"xp.Active":true
			},
			"quotes.revised": {
				"xp.Type": "Quote",
				"xp.Status": WeirService.OrderStatus.RevisedQuote.id+"|"+WeirService.OrderStatus.RejectedQuote.id,
				"xp.Active":true
			},
			"quotes.confirmed": {
				"xp.Type": "Quote",
				"xp.Status": WeirService.OrderStatus.ConfirmedQuote.id,
				"xp.Active":true
			}
		};
		return JSON.stringify(filter[action]);
	}
}

function SavedQuotesController(WeirService, $state, $sce, $rootScope, $scope, CurrentOrderId) {
	var vm = this;
	vm.CurrentOrderId = CurrentOrderId;
	
	function _reviewQuote(quoteId, status, buyerId) {
	    if (status == WeirService.OrderStatus.ConfirmedQuote.id) {
		    $state.go('readonly', { quoteID: quoteId, buyerID: buyerId });
	    } else if(status == WeirService.OrderStatus.RevisedQuote.id) {
		    $state.go('revised', { quoteID: quoteId, buyerID: buyerId });
		} else {
	        var gotoReview = (vm.CurrentOrderId != quoteId) && (WeirService.CartHasItems()) ? confirm(vm.labels.ReplaceCartMessage) : true;
	        if (gotoReview) {
	            WeirService.SetQuoteAsCurrentOrder(quoteId)
                    .then(function () {
                        $rootScope.$broadcast('SwitchCart');
						$state.go('myquote.detail');
                    });
	        }
	    }
	}

	var labels = {
		en: {
		    Header: $scope.$parent.quotes.list.Meta.TotalCount.toString() + " saved Quote" +  ($scope.$parent.quotes.list.Meta.TotalCount == 1 ? "" : "s"),
		    QuoteNum: "Weir Quote Number",
			QuoteName: "Quote Name",
		    QuoteRef: "Your Quote Ref;",
            Total: "Total",
            Customer: "Customer",
			Status: "Status",
            ValidTo: "Valid Until",
            OwnProduct: "Own Product",
            View: "View",
		    ReplaceCartMessage: "Continuing with this action will change your cart to this quote. Are you sure you want to proceed?",
			ConfirmedListMessage: "You can convert confirmed quotes to orders. View the confirmed quote and select; Submit Order.<br><br>Confirmed quotes are valid for 30 days from confirmation",
			Revisions: "Revisions"
		},
		fr: {
		    Header: $sce.trustAsHtml($scope.$parent.quotes.list.Meta.TotalCount.toString() + " cotation(s) sauv&eacute;e(s)"),
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
            ConfirmedListMessage: $sce.trustAsHtml("Vous pouvez convertir des devis confirm&eacute;s en commandes. Affichez le devis confirm&eacute; et s&eacute;lectionnez: Soumettre l'ordre. Les devis confirm&eacute;s sont valables pendant 30 jours &agrave; partir de la confirmation."),
			Revisions: $sce.trustAsHtml("FR: Revisions")
		}
	};
	if ($state.is('quotes.revised')) {
	    labels.en.Header = $scope.$parent.quotes.list.Meta.TotalCount.toString() + " revised Quote" + ($scope.$parent.quotes.list.Meta.TotalCount == 1 ? "" : "s");
	    labels.fr.Header = "FR: " + $scope.$parent.quotes.list.Meta.TotalCount.toString() + " revised Quote" + ($scope.$parent.quotes.list.Meta.TotalCount == 1 ? "" : "s");
	} else if ($state.is('quotes.confirmed')) {
	    labels.en.Header = $scope.$parent.quotes.list.Meta.TotalCount.toString() + " confirmed Quote" + ($scope.$parent.quotes.list.Meta.TotalCount == 1 ? "" : "s");
	    labels.fr.Header = "FR: " + $scope.$parent.quotes.list.Meta.TotalCount.toString() + " confirmed Quote" + ($scope.$parent.quotes.list.Meta.TotalCount == 1 ? "" : "s");
	}
	vm.labels = WeirService.LocaleResources(labels);
	vm.ReviewQuote = _reviewQuote;
}

function InReviewQuotesController(WeirService, $state, $sce, $scope) {
	var vm = this;
	
	var labels = {
		en: {
		    Header: $scope.$parent.quotes.list.Meta.TotalCount.toString() + " Quote" +  ($scope.$parent.quotes.list.Meta.TotalCount.length == 1 ? "" : "s under review"),
		    QuoteNum: "Weir Quote Number",
		    QuoteRef: "Your Quote Ref;",
            Total: "Total",
            Customer: "Customer",
		    OwnProduct: "Own Product",
		    Approver: "Approver",
			Reviewer: "Reviewer",
            Status: "Status",
            ValidTo: "Valid Until",
			View: "View"
		},
		fr: {
		    Header: $sce.trustAsHtml($scope.$parent.quotes.list.Meta.TotalCount.toString() + " cotation(s) dans l'examen"),
		    QuoteNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de cotation chez WEIR"),
		    QuoteRef: $sce.trustAsHtml("Votre R&eacute;f&eacute;rence de cotation"),
		    Total: $sce.trustAsHtml("Total"),
		    Customer: $sce.trustAsHtml("Client"),
		    OwnProduct: $sce.trustAsHtml("Propre Produit"),
		    Approver: $sce.trustAsHtml("Approbateur;"),
			Reviewer: $sce.trustAsHtml("FR: Reviewer"),
            Status: $sce.trustAsHtml("Statut"),
            ValidTo: $sce.trustAsHtml("Valide jusqu'&agrave;"),
			View: $sce.trustAsHtml("View")
	}
	};
	vm.labels = WeirService.LocaleResources(labels);
}

function RouteToQuoteController($rootScope, $state, OrderCloud, WeirService, toastr, Quote) {
    if (Quote) {
        var status = Quote.xp.Status;
        var type = Quote.xp.Type;
        if (type == "Order") {
            $state.go('orders.goto', { orderID: Quote.ID });
        } else if (status == WeirService.OrderStatus.RevisedQuote.id) {
            if (Quote.xp.Active) {
                $state.go('revised', { quoteID: Quote.ID, buyerID: OrderCloud.BuyerID.Get() });
            } else {
                $state.go('readonly', { quoteID: Quote.ID, buyerID: OrderCloud.BuyerID.Get() });
            }
        } else if ([WeirService.OrderStatus.Submitted.id, WeirService.OrderStatus.Review.id, WeirService.OrderStatus.RejectedQuote.id].indexOf(status) > -1) {
            $state.go('readonly', { quoteID: Quote.ID, buyerID: OrderCloud.BuyerID.Get() });
        } else { // DR, SV, CQ?
            WeirService.SetQuoteAsCurrentOrder(Quote.ID)
            .then(function () {
                $rootScope.$broadcast('SwitchCart');
                $state.go('myquote.detail');
            });
        }
	} else {
		toastr.error("Quote not found");
		$state.go('quotes.saved');
	}
}

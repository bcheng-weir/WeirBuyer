angular.module('orderCloud')
	.config(QuotesConfig)
	.controller('QuotesCtrl', QuotesController)
	.controller('SavedQuotesCtrl', SavedQuotesController)
	.controller('DeletedQuotesCtrl', DeletedQuotesController)
	.controller('EnquiryQuotesCtrl', EnquiryQuotesController)
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
				Quotes: function(OrderCloudSDK, WeirService, Parameters, Me, CurrentUser, CurrentOrg) {
                    if(!Me.Profile || !Me.Org){
                        Me.Profile = CurrentUser;
                        Me.Org = CurrentOrg;
                    }
                    if(!Parameters.filters){
                        Parameters.filters = {};
                    }
					//return WeirService.FindOrders(Parameters, false);
					if(Parameters && Parameters.search && Parameters.search !== 'undefined') {
						Parameters.searchOn = Parameters.searchOn ? Parameters.searchOn : "ID";
					}
					Parameters.filters = Parameters.filters || {};
					Parameters.filters["xp.Status"] = Parameters.filters["xp.Status"] || "!DEL";
					Parameters.filters.FromUserID = Me.Profile.ID;
					var opts = {
						'from':Parameters.from,
						'to':Parameters.to,
						'search':Parameters.search,
						'searchOn':Parameters.searchOn,
						'sortBy':Parameters.sortBy,
						'page':Parameters.page,
						'pageSize':Parameters.pageSize || 10,
						'filters':Parameters.filters
					};
					return OrderCloudSDK.Orders.List("Outgoing",opts);
                },
                CountParameters: function ($stateParams, OrderCloudParameters) {
                    return OrderCloudParameters.Get($stateParams);
                },
                SavedCount: function (OrderCloudSDK, WeirService, CountParameters, Me, CurrentUser, CurrentOrg) {
                    if(!Me.Profile || !Me.Org){
                        Me.Profile = CurrentUser;
                        Me.Org = CurrentOrg;
                    }
                    if(!CountParameters.filters){
                        CountParameters.filters = {};
                    }
                    CountParameters.filters = {
                        'xp.Type': 'Quote',
                        'xp.Status': WeirService.OrderStatus.Saved.id + "|" + WeirService.OrderStatus.Draft.id,
                        'xp.Active': true
                    };
                    CountParameters.filters.FromUserID = Me.Profile.ID;
                    var opts = {
                        'pageSize': 10,
                        'filters': CountParameters.filters
                    };
                    return OrderCloudSDK.Orders.List("Outgoing", opts);
                },
                RequestedCount: function (OrderCloudSDK, WeirService, CountParameters, Me, CurrentUser, CurrentOrg) {
                    if(!Me.Profile || !Me.Org){
                        Me.Profile = CurrentUser;
                        Me.Org = CurrentOrg;
                    }
                    if(!CountParameters.filters){
                        CountParameters.filters = {};
                    }
                    CountParameters.filters = {
                        'xp.Type':'Quote',
                        'xp.Status':WeirService.OrderStatus.Enquiry.id + "|" + WeirService.OrderStatus.EnquiryReview.id + "|" + WeirService.OrderStatus.Submitted.id + "|" + WeirService.OrderStatus.RevisedQuote.id + "|" + WeirService.OrderStatus.RejectedQuote.id,
                        'xp.Active':true
                    };
                    CountParameters.filters.FromUserID = Me.Profile.ID;
                    var opts = {
                        'pageSize': 10,
                        'filters': CountParameters.filters
                    };
                    return OrderCloudSDK.Orders.List("Outgoing", opts);
                },
                ConfirmedCount: function (OrderCloudSDK, WeirService, CountParameters, Me, CurrentUser, CurrentOrg) {
                    if(!Me.Profile || !Me.Org){
                        Me.Profile = CurrentUser;
                        Me.Org = CurrentOrg;
                    }
                    if(!CountParameters.filters){
                        CountParameters.filters = {};
                    }
                    CountParameters.filters = {
                        'xp.Type': 'Quote',
                        'xp.Status': WeirService.OrderStatus.ConfirmedQuote.id,
                        'xp.Active': true
                    };
                    CountParameters.filters.FromUserID = Me.Profile.ID;
                    var opts = {
                        'pageSize': 10,
                        'filters': CountParameters.filters
                    };
                    return OrderCloudSDK.Orders.List("Outgoing", opts);
                },
                DeletedCount: function (OrderCloudSDK, WeirService, CountParameters, Me, CurrentUser, CurrentOrg) {
                    if (!Me.Profile || !Me.Org) {
                        Me.Profile = CurrentUser;
                        Me.Org = CurrentOrg;
                    }
                    if (!CountParameters.filters) {
                        CountParameters.filters = {};
                    }
                    CountParameters.filters = {
                        'xp.Type': 'Quote',
                        'xp.Status': WeirService.OrderStatus.Deleted.id
                    };
                    CountParameters.filters.FromUserID = Me.Profile.ID;
                    var opts = {
                        'pageSize': 10,
                        'filters': CountParameters.filters
                    };
                    return OrderCloudSDK.Orders.List("Outgoing", opts);
                }
			}
        })
        .state('quotes.all', {
            url: '/all',
            templateUrl: 'quotes/templates/quotes.all.tpl.html',
            controller: 'SavedQuotesCtrl',
            controllerAs: 'saved'
        })
		.state( 'quotes.saved', {
			url: '/saved',
			templateUrl: 'quotes/templates/quotes.saved.tpl.html',
			controller: 'SavedQuotesCtrl',
			controllerAs: 'saved'
		})
        .state( 'quotes.requested', {
            url: '/requested',
            templateUrl: 'quotes/templates/quotes.requested.tpl.html',
            controller: 'SavedQuotesCtrl',
            controllerAs: 'saved'
        })
        .state( 'quotes.confirmed', {
            url: '/confirmed',
            templateUrl: 'quotes/templates/quotes.confirmed.tpl.html',
            controller: 'SavedQuotesCtrl',
            controllerAs: 'saved'
        })
		.state('quotes.deleted', {
		    url: '/deleted',
		    templateUrl: 'quotes/templates/quotes.deleted.tpl.html',
		    controller: 'DeletedQuotesCtrl',
		    controllerAs: 'deleted'
		})
		.state('quotes.goto', {
			url:'/:quoteID',
			controller: 'RouteToQuoteCtrl',
			resolve: {
			    Quote: function ($q, appname, $localForage, $stateParams, OrderCloudSDK) {
			        return OrderCloudSDK.Orders.Get("Outgoing", $stateParams.quoteID);
			    }
			}
		});
}

function QuotesController($sce, $state, $ocMedia, $document, $uibModal, $rootScope, WeirService, Me, CurrentCustomer,
                          CurrentOrderId, Parameters, Quotes, OrderCloudSDK, OrderCloudParameters, SavedCount,
                          RequestedCount, ConfirmedCount, DeletedCount) {
	var vm = this;
	vm.list = Quotes;
    vm.parameters = Parameters;
	vm.Customer = CurrentCustomer;
	vm.MyOrg = Me.Org;
	vm.DefaultCurrency = WeirService.CurrentCurrency();
	vm.QuoteCurrency = function (qte) {
	    return WeirService.CurrentCurrency(qte).curr;
	};
	vm.EnquiryAllowed = function() {
		return Me.Org.xp.WeirGroup.label == "WPIFR";
	};
	vm.CurrentOrderId = CurrentOrderId;
	vm.getStatusLabel = function(id) {
		var status = WeirService.LookupStatus(id);
		if (status) {
			return status.label[WeirService.Locale()];
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

    vm.dateOf = function(utcDate) {
        return new Date(utcDate);
    };

    vm.dateOfValidity = function (utcDate) {
        var date = new Date(utcDate);
        return date.setDate(date.getDate() + 30);
    };

	var labels = {
        en: {
            All: "All Quotes",
            Saved: "Saved Quotes",
            SavedCount: SavedCount.Meta.TotalCount.toString() > 0 ? "Saved Quotes (" + SavedCount.Meta.TotalCount.toString() + ")" : "Saved Quotes",
            Requested: "Requested Quotes",
            RequestedCount: RequestedCount.Meta.TotalCount.toString() > 0 ? "Requested Quotes (" + RequestedCount.Meta.TotalCount.toString() + ")" : "Requested Quotes",
            Confirmed: "Confirmed Quotes",
            ConfirmedCount: ConfirmedCount.Meta.TotalCount.toString() > 0 ? "Confirmed Quotes (" + ConfirmedCount.Meta.TotalCount.toString() + ")" : "Confirmed Quotes",
            Deleted: "Deleted Quotes",
            DeletedCount: DeletedCount.Meta.TotalCount.toString() > 0 ? "Deleted Quotes (" + DeletedCount.Meta.TotalCount.toString() + ")" : "Deleted Quotes",
			LoadMore: "Load More",
            Search: "Search",
            SearchPlaceholder: "Search by Weir quote or order number",
            Clear: "Clear Search",
			statusDate: "Date Updated",
			submittedDate: "Submitted Date",
            validUntil: "Valid Until"
		},
        fr: {
            All: $sce.trustAsHtml("Tous les devis"),
            Saved: $sce.trustAsHtml("Enregistrée(s)"),
            SavedCount: $sce.trustAsHtml(SavedCount.Meta.TotalCount.toString() > 0 ? "Enregistrée(s) (" + SavedCount.Meta.TotalCount.toString() + ")" : "Enregistrée(s)"),
            Requested: $sce.trustAsHtml("FR: nregistrée(s)"),
            RequestedCount: $sce.trustAsHtml(SavedCount.Meta.TotalCount.toString() > 0 ? "FR: Enregistrée(s) (" + SavedCount.Meta.TotalCount.toString() + ")" : "FR: Enregistrée(s)"),
            Confirmed: $sce.trustAsHtml("Cotation(s) confirmée(s)"),
            ConfirmedCount: $sce.trustAsHtml(ConfirmedCount.Meta.TotalCount.toString() > 0 ? "Cotation(s) confirmée(s) (" + ConfirmedCount.Meta.TotalCount.toString() + ")" : "Cotation(s) confirmée(s)"),
            Deleted: $sce.trustAsHtml("FR: Deleted Quotes"),
            DeletedCount: $sce.trustAsHtml("FR: " + DeletedCount.Meta.TotalCount.toString() > 0 ? "Deleted Quotes (" + DeletedCount.Meta.TotalCount.toString() + ")" : "Deleted Quotes"),
			LoadMore: $sce.trustAsHtml("Afficher plus"),
            Search: $sce.trustAsHtml("Rechercher"),
            SearchPlaceholder: $sce.trustAsHtml("Rechercher par référence de cotation ou de commande WEIR"),
            Clear: $sce.trustAsHtml("Effacer le rechercher"),
            statusDate: $sce.trustAsHtml("Date de mise à jour"),
            submittedDate: $sce.trustAsHtml("Date d’envoi"),
            validUntil: $sce.trustAsHtml("Valide jusqu'&agrave;")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);

	vm.FilterActions = _filterActions;
	function _filterActions(action) {
        var filter = {
            "quotes.all": {
                "xp.Type":"Quote",
                "xp.Active":true
            },
			"quotes.saved": {
				"xp.Type":"Quote",
				"xp.Status":WeirService.OrderStatus.Saved.id+"|"+WeirService.OrderStatus.Draft.id,
				"xp.Active":true
			},
            "quotes.requested": {
                "xp.Type": "Quote",
                "xp.Status":WeirService.OrderStatus.Enquiry.id + "|" + WeirService.OrderStatus.EnquiryReview.id + "|" + WeirService.OrderStatus.Submitted.id + "|" + WeirService.OrderStatus.RevisedQuote.id + "|" + WeirService.OrderStatus.RejectedQuote.id,
                "xp.Active":true
            },
            "quotes.confirmed": {
                "xp.Type":"Quote",
                "xp.Status":WeirService.OrderStatus.ConfirmedQuote.id,
                "xp.Active":true
            },
			"quotes.deleted": {
				"xp.Type":"Quote",
				"xp.Status":WeirService.OrderStatus.Deleted.id
			}
		};
		return JSON.stringify(filter[action]);
    }

    vm.GoToQuote = function (orderId) {
        $state.go("quotes.goto", { quoteID: orderId });
    };

    vm.delete = function (id, quoteList, indx) {
        var parentElem = angular.element($document[0].querySelector('body'));
        $uibModal.open({
            animation: true,
            size: 'md',
            templateUrl: 'quotes/templates/deletequotemodal.tpl.html',
            controller: function ($uibModalInstance, $state, Me, WeirService, toastr, $exceptionHandler) {
                var vm = this;
                labels = {
                    en: {
                        DeleteQuote: "Delete quote?",
                        ConfirmDelete: "Delete quote number " + id + "?",
                        CancelDelete: "Cancel",
                        DeletedTitle: "Success",
                        DeletedMessage: "Your quote has been deleted"
                    },
                    fr: {
                        DeleteQuote: $sce.trustAsHtml("FR: Delete quote?"),
                        ConfirmDelete: $sce.trustAsHtml("FR: Delete quote number " + id + "?"),
                        CancelDelete: $sce.trustAsHtml("Annuler"),
                        DeletedTitle: "Success",
                        DeletedMessage: "Your quote has been deleted"
                    }
                };
                vm.labels = WeirService.LocaleResources(labels);
                vm.close = function () {
                    $uibModalInstance.dismiss();
                };
                vm.deleteQuote = function () {
                    var mods = {
                        xp: {
                            DateDeleted: new Date(),
                            Status: WeirService.OrderStatus.Deleted.id
                        }
                    };
                    var qte = {
                        ID: id
                    };
                    WeirService.UpdateQuote(qte, mods)
                        .then(function (qte) {
                            quoteList.splice(indx, 1);
                            $uibModalInstance.close();
                            $rootScope.$broadcast('OC:RemoveOrder');
                            toastr.success(vm.labels.DeletedMessage, vm.labels.DeletedTitle);
                        })
                        .catch(function (ex) {
                            $exceptionHandler(ex);
                        });
                };
            },
            controllerAs: 'deleteModal',
            appendTo: parentElem
        });
    };
}

function SavedQuotesController(WeirService, $state, $sce, $rootScope, $scope, CurrentOrderId) {
	var vm = this;
    vm.CurrentOrderId = CurrentOrderId;
    vm.LookupStatus = WeirService.LookupStatus;
    vm.locale = WeirService.Locale;
	
	function _reviewQuote(quoteId, status, buyerId) {
	    if (status === WeirService.OrderStatus.RejectedQuote.id ||
            status === WeirService.OrderStatus.Enquiry.id ||
            status === WeirService.OrderStatus.EnquiryReview.id ||
            status === WeirService.OrderStatus.Submitted.id ||
            status === WeirService.OrderStatus.Review.id ||
            status === WeirService.OrderStatus.Deleted.id
        ) {
            $state.go('readonly', {quoteID: quoteId, buyerID: buyerId});
        } else if(status === WeirService.OrderStatus.ConfirmedQuote.id) {
	    	$state.go('submit', {quoteID: quoteId, buyerID: buyerId})
	    } else if(status === WeirService.OrderStatus.RevisedQuote.id) {
		    $state.go('revised', { quoteID: quoteId, buyerID: buyerId });
		} else {
	        var gotoReview = (vm.CurrentOrderId !== quoteId) && (WeirService.CartHasItems()) ? confirm(vm.labels.ReplaceCartMessage) : true;
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
            Header: $scope.$parent.quotes.list.Meta.TotalCount.toString() + " saved Quote" + ($scope.$parent.quotes.list.Meta.TotalCount === 1 ? "" : "s"),
            SortText: "You can sort quotes by Quote Number, Total",
		    QuoteNum: "Weir Quote Number",
			QuoteName: "Quote Name",
		    QuoteRef: "Your Quote Ref;",
            Total: "Total",
            Customer: "Customer",
            Status: "Status",
            deletedStatus: "Deleted",
            Date: "Date",
            ValidTo: "Valid Until",
            OwnProduct: "Own Product",
            View: "View",
		    ReplaceCartMessage: "Continuing with this action will change your cart to this quote. Are you sure you want to proceed?",
			ConfirmedListMessage: "You can convert confirmed quotes to orders. View the confirmed quote and select; Submit Order.<br><br>Confirmed quotes are valid for 30 days from confirmation",
			Revisions: "Revisions",
            Search: "Search",
            Filters: $sce.trustAsHtml("<i class='fa fa-filter'></i>Filters"),
            Reviewer: "Reviewer",
            ValidityPeriod: "All quotes are valid for 30 days"
		},
		fr: {
		    Header: $sce.trustAsHtml($scope.$parent.quotes.list.Meta.TotalCount.toString() + " cotation(s) --DELETED--"),
            SortText: $sce.trustAsHtml("Vous pouvez filtrer par numéro de devis, montant"),
            QuoteNum: $sce.trustAsHtml("Référence de cotation chez WEIR"),
		    QuoteName: $sce.trustAsHtml("Nom de la cotation"),
			QuoteRef: $sce.trustAsHtml("Votre Référence de cotation"),
            Total: $sce.trustAsHtml("Total"),
            Customer: $sce.trustAsHtml("Client"),
            deletedStatus: "FR: Deleted",
            Status: $sce.trustAsHtml("Statut"),
            Date: $sce.trustAsHtml("Date"),
            ValidTo: $sce.trustAsHtml("Valide jusqu'&agrave;"),
            OwnProduct: $sce.trustAsHtml("Propre Produit"),
            View: $sce.trustAsHtml("Voir"),
            ReplaceCartMessage: $sce.trustAsHtml("La poursuite de cette action changera votre panier pour cette commande. Voulez-vous continuer?"),
            ConfirmedListMessage: $sce.trustAsHtml("Vous pouvez convertir des devis confirmés en commandes. Affichez le devis confirmé et sélectionnez: Soumettre l'ordre. Les devis confirmés sont valables pendant 30 jours &agrave; partir de la confirmation."),
			Revisions: $sce.trustAsHtml("Révisions"),
            Search: $sce.trustAsHtml("Rechercher"),
            Filters: $sce.trustAsHtml("<i class='fa fa-filter'></i> Filtres"),
            Reviewer: $sce.trustAsHtml("Révisé par"),
            ValidityPeriod: $sce.trustAsHtml("All quotes are valid for 30 days")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
	vm.ReviewQuote = _reviewQuote;
}

function DeletedQuotesController(WeirService, $state, $sce, $rootScope, $scope, CurrentOrderId) {
    var vm = this;
    vm.CurrentOrderId = CurrentOrderId;
    vm.LookupStatus = WeirService.LookupStatus;
    vm.locale = WeirService.Locale;

    function _reviewQuote(quoteId, status, buyerId) {
            $state.go('readonly', { quoteID: quoteId, buyerID: buyerId });
    }

    var labels = {
        en: {
            Header: $scope.$parent.quotes.list.Meta.TotalCount.toString() + " deleted Quote" + ($scope.$parent.quotes.list.Meta.TotalCount === 1 ? "" : "s"),
            SortText: "You can sort quotes by Quote Number, Total",
            QuoteNum: "Weir Quote Number",
            QuoteName: "Quote Name",
            QuoteRef: "Your Quote Ref;",
            Total: "Total",
            Customer: "Customer",
            Status: "Status",
            deletedDate: "Date Deleted",
            submittedDate: "Date Submitted",
            OwnProduct: "Own Product",
            View: "View",
            ReplaceCartMessage: "Continuing with this action will change your cart to this quote. Are you sure you want to proceed?",
            ConfirmedListMessage: "You can convert confirmed quotes to orders. View the confirmed quote and select; Submit Order.<br><br>Confirmed quotes are valid for 30 days from confirmation",
            Revisions: "Revisions",
            Search: "Search",
            Filters: $sce.trustAsHtml("<i class='fa fa-filter'></i>Filters"),
            Reviewer: "Reviewer",
            ValidityPeriod: "All quotes are valid for 30 days"
        },
        fr: {
            Header: $sce.trustAsHtml($scope.$parent.quotes.list.Meta.TotalCount.toString() + " cotation(s) sauvée(s)"),
            SortText: $sce.trustAsHtml("Vous pouvez filtrer par numéro de devis, montant"),
            QuoteNum: $sce.trustAsHtml("Référence de cotation chez WEIR"),
            QuoteName: $sce.trustAsHtml("Nom de la cotation"),
            QuoteRef: $sce.trustAsHtml("Votre Référence de cotation"),
            Total: $sce.trustAsHtml("Total"),
            Customer: $sce.trustAsHtml("Client"),
            Status: $sce.trustAsHtml("Statut"),
            deletedDate: $sce.trustAsHtml("FR: Date Deleted"),
            submittedDate: $sce.trustAsHtml("FR: Date Submitted"),
            ValidTo: $sce.trustAsHtml("Valide jusqu'&agrave;"),
            OwnProduct: $sce.trustAsHtml("Propre Produit"),
            View: $sce.trustAsHtml("Voir"),
            ReplaceCartMessage: $sce.trustAsHtml("La poursuite de cette action changera votre panier pour cette commande. Voulez-vous continuer?"),
            ConfirmedListMessage: $sce.trustAsHtml("Vous pouvez convertir des devis confirmés en commandes. Affichez le devis confirmé et sélectionnez: Soumettre l'ordre. Les devis confirmés sont valables pendant 30 jours &agrave; partir de la confirmation."),
            Revisions: $sce.trustAsHtml("Révisions"),
            Search: $sce.trustAsHtml("Rechercher"),
            Filters: $sce.trustAsHtml("<i class='fa fa-filter'></i> Filtres"),
            Reviewer: $sce.trustAsHtml("Révisé par"),
            ValidityPeriod: $sce.trustAsHtml("All quotes are valid for 30 days")
        }
    };
    if ($state.is('quotes.revised')) {
        labels.en.Header = $scope.$parent.quotes.list.Meta.TotalCount.toString() + " revised Quote" + ($scope.$parent.quotes.list.Meta.TotalCount === 1 ? "" : "s");
        labels.fr.Header = $scope.$parent.quotes.list.Meta.TotalCount.toString() + " Cotation révisée" + ($scope.$parent.quotes.list.Meta.TotalCount === 1 ? "" : "s");
    } else if ($state.is('quotes.confirmed')) {
        labels.en.Header = $scope.$parent.quotes.list.Meta.TotalCount.toString() + " confirmed Quote" + ($scope.$parent.quotes.list.Meta.TotalCount === 1 ? "" : "s");
        labels.fr.Header = $scope.$parent.quotes.list.Meta.TotalCount.toString() + " Cotation confirmée" + ($scope.$parent.quotes.list.Meta.TotalCount === 1 ? "" : "s");
    } else if ($state.is('quotes.all')) {
        labels.en.Header = $scope.$parent.quotes.list.Meta.TotalCount.toString() + " Quote" + ($scope.$parent.quotes.list.Meta.TotalCount === 1 ? "" : "s");
        labels.fr.Header = $scope.$parent.quotes.list.Meta.TotalCount.toString() + " Cotation" + ($scope.$parent.quotes.list.Meta.TotalCount === 1 ? "" : "s");
    }
    vm.labels = WeirService.LocaleResources(labels);
    vm.ReviewQuote = _reviewQuote;
}

function EnquiryQuotesController (WeirService,$scope,$sce) {
	var vm = this;
	var labels = {
		en: {
			Header: $scope.$parent.quotes.list.Meta.TotalCount.toString() + ($scope.$parent.quotes.list.Meta.TotalCount.length === 1 ? " Enquiry" : " Enquiries"),
			QuoteNum: "Weir Quote Number",
			Status: "Status",
			View: "View",
            ValidityPeriod: "All quotes are valid for 30 days"
		},
		fr: {
			Header: $sce.trustAsHtml($scope.$parent.quotes.list.Meta.TotalCount.toString() + ($scope.$parent.quotes.list.Meta.TotalCount.length === 1 ? " Demande" : " Demandes")),
			QuoteNum: $sce.trustAsHtml("Référence de cotation chez WEIR"),
			Status: $sce.trustAsHtml("Statut"),
			View: $sce.trustAsHtml("Voir"),
            ValidityPeriod: $sce.trustAsHtml("All quotes are valid for 30 days")
		}
	};
	vm.labels = labels[WeirService.Locale()];
}

function InReviewQuotesController(WeirService, $sce, $scope) {
    var vm = this;
	
	var labels = {
		en: {
		    Header: $scope.$parent.quotes.list.Meta.TotalCount.toString() + " Quote" +  ($scope.$parent.quotes.list.Meta.TotalCount.length === 1 ? "" : "s under review"),
		    QuoteNum: "Weir Quote Number",
		    QuoteRef: "Your Quote Ref;",
            Total: "Total",
            Customer: "Customer",
		    OwnProduct: "Own Product",
		    Approver: "Approver",
			Reviewer: "Reviewer",
            Status: "Status",
            Date: "Date",
            ValidTo: "Valid Until",
			View: "View",
            ValidityPeriod: "All quotes are valid for 30 days"
		},
		fr: {
		    Header: $sce.trustAsHtml($scope.$parent.quotes.list.Meta.TotalCount.toString() + " Cotation soumise à révision"),
		    QuoteNum: $sce.trustAsHtml("Référence de cotation chez WEIR"),
		    QuoteRef: $sce.trustAsHtml("Votre Référence de cotation"),
		    Total: $sce.trustAsHtml("Total"),
		    Customer: $sce.trustAsHtml("Client"),
		    OwnProduct: $sce.trustAsHtml("Propre Produit"),
		    Approver: $sce.trustAsHtml("Approbateur;"),
			Reviewer: $sce.trustAsHtml("Révisé par"),
            Status: $sce.trustAsHtml("Statut"),
            Date: $sce.trustAsHtml("Date"),
            ValidTo: $sce.trustAsHtml("Valide jusqu'&agrave;"),
			View: $sce.trustAsHtml("Voir"),
            ValidityPeriod: $sce.trustAsHtml("All quotes are valid for 30 days")
	}
	};
	vm.labels = WeirService.LocaleResources(labels);
}

function RouteToQuoteController($rootScope, $state, WeirService, toastr, Quote, Me) {
    if (Quote) {
        var status = Quote.xp.Status;
        var type = Quote.xp.Type;
        if (type === "Order") {
            $state.go('orders.goto', { orderID: Quote.ID });
        } else if (status === WeirService.OrderStatus.RevisedQuote.id) {
            if (Quote.xp.Active) {
                $state.go('revised', { quoteID: Quote.ID });
            } else {
                $state.go('readonly', { quoteID: Quote.ID });
            }
        } else if ([WeirService.OrderStatus.Submitted.id,
                    WeirService.OrderStatus.Review.id,
                    WeirService.OrderStatus.RejectedQuote.id,
                    WeirService.OrderStatus.Enquiry.id,
                    WeirService.OrderStatus.EnquiryReview.id,
                    WeirService.OrderStatus.Deleted.id].indexOf(status) > -1) {
            $state.go('readonly', {quoteID: Quote.ID});
        } else if ([WeirService.OrderStatus.ConfirmedQuote.id].indexOf(status) > -1) {
            $state.go('submit', {quoteID: Quote.ID});
        } else if([WeirService.OrderStatus.RevisedQuote.id].indexOf(status) > -1) {
            $state.go('revised', { quoteID: Quote.ID });
        } else { // DR, SV
            WeirService.SetQuoteAsCurrentOrder(Quote.ID)
            .then(function () {
                $rootScope.$broadcast('SwitchCart');
                $state.go('myquote.detail');
            });
        }
	} else {
        var errorMsg="";
        if(WeirService.Locale()==="fr"){
            errorMsg="Cotation non trouvée";
        }
        else{
            errorMsg="Quote not found";
        }
        toastr.error(errorMsg);
		$state.go('quotes.saved');
	}
}

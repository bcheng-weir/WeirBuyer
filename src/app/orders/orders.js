angular.module('orderCloud')
    .config(OrdersConfig)
    .controller('OrdersCtrl', OrdersController)
	.controller('RouteToOrderCtrl', RouteToOrderController)
;

function OrdersConfig($stateProvider) {
    $stateProvider
        .state('orders', {
            parent: 'base',
            templateUrl: 'orders/templates/orders.tpl.html',
	        controller: 'OrdersCtrl',
	        controllerAs: 'orders',
            url: '/orders?from&to&search&page&pageSize&searchOn&sortBy&filters&buyerid',
            data: {
            	componentName: 'Orders'
            },
            resolve: {
	            CurrentCustomer: function(CurrentOrder) {
		            return CurrentOrder.GetCurrentCustomer();
	            },
                Parameters: function($stateParams, OrderCloudParameters) {
                    return OrderCloudParameters.Get($stateParams);
                },
	            Orders: function(OrderCloudSDK, WeirService, Parameters, Me, CurrentUser, CurrentOrg) {
	                if(!Me.Profile || !Me.Org){
                        Me.Profile = CurrentUser;
                        Me.Org = CurrentOrg;
                    }
                    if(!Parameters.filters){
	                    Parameters.filters = {};
                    }
                    if (!Parameters.filters["xp.Status"]) Parameters.filters["xp.Status"] = "!DEL";
	                //return WeirService.FindOrders(Parameters, false);
		            if (Parameters.search) {
		                Parameters.searchOn = Parameters.searchOn ? Parameters.searchOn : "ID"; //FromUserID and Total were throwing errors
	                }
		            // Filter on Me.Profile.ID == FromUserID
					Parameters.filters = Parameters.filters || {};
		            Parameters.filters.FromUserID = Me.Profile.ID;
                    return OrderCloudSDK.Orders.List("Outgoing", {'from':Parameters.from, 'to':Parameters.to, 'search':Parameters.search, 'page':Parameters.page, 'pageSize':Parameters.pageSize || 10, 'searchOn':Parameters.searchOn, 'sortBy':Parameters.sortBy, 'filters':Parameters.filters, 'buyerID':Me.GetBuyerID()});
                },
                CountParameters: function ($stateParams, OrderCloudParameters) {
                    return OrderCloudParameters.Get($stateParams);
                },
                DraftCount: function (OrderCloudSDK, WeirService, CountParameters,  Me, CurrentUser, CurrentOrg) {
                    if(!Me.Profile || !Me.Org){
                        Me.Profile = CurrentUser;
                        Me.Org = CurrentOrg;
                    }
                    if(!CountParameters.filters){
                        CountParameters.filters = {};
                    }
                    CountParameters.filters = {
                        "xp.Type":"Order",
                        "xp.Status":WeirService.OrderStatus.SubmittedPendingPO.id + "|" + WeirService.OrderStatus.RevisedOrder.id + "|" + WeirService.OrderStatus.RejectedRevisedOrder.id + "|" + WeirService.OrderStatus.Despatched.id + "|" + WeirService.OrderStatus.Invoiced.id + "|" + WeirService.OrderStatus.ConfirmedOrder.id,
                        "xp.Active":true
                    };
                    CountParameters.filters.FromUserID = Me.Profile.ID;
                    var opts = {
                        'pageSize': 10,
                        'filters': CountParameters.filters,
                        'buyerID': Me.GetBuyerID()
                    };
                    return OrderCloudSDK.Orders.List("Outgoing", opts);
                },
                ConfirmedCount: function (OrderCloudSDK, WeirService, CountParameters,  Me, CurrentUser, CurrentOrg) {
                    if(!Me.Profile || !Me.Org){
                        Me.Profile = CurrentUser;
                        Me.Org = CurrentOrg;
                    }
                    if(!CountParameters.filters){
                        CountParameters.filters = {};
                    }
                    CountParameters.filters = {
                        "xp.Type":"Order",
                        "xp.Status":WeirService.OrderStatus.ConfirmedOrder.id + "|" + WeirService.OrderStatus.SubmittedWithPO.id,
                        "xp.Active": true
                    };
                    CountParameters.filters.FromUserID = Me.Profile.ID;
                    var opts = {
                        'pageSize': 10,
                        'filters': CountParameters.filters,
                        'buyerID': Me.GetBuyerID()
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
                        "xp.Type":"Order",
                        "xp.Status":WeirService.OrderStatus.Deleted.id
                    };
                    CountParameters.filters.FromUserID = Me.Profile.ID;
                    var opts = {
                        'pageSize': 10,
                        'filters': CountParameters.filters,
                        'buyerID': Me.GetBuyerID()
                    };
                    return OrderCloudSDK.Orders.List("Outgoing", opts);
                }
            }
        })
        .state('orders.all', {
            url: '/all',
            templateUrl: 'orders/templates/orders.all.tpl.html',
            parent: 'orders'
        })
	    .state('orders.draft', {
		    url: '/draft',
		    templateUrl: 'orders/templates/orders.draft.tpl.html',
		    parent: 'orders'
	    })
	    .state('orders.confirmed', {
		    url: '/confirmed',
		    templateUrl: 'orders/templates/orders.confirmed.tpl.html',
		    parent: 'orders'
	    })
	    .state('orders.deleted', {
	        url: '/deleted',
	        templateUrl: 'orders/templates/orders.deleted.tpl.html',
	        parent: 'orders'
	    })
		.state('orders.goto', {
		    url: '/:orderID',
		    controller: 'RouteToOrderCtrl',
		    resolve: {
		        Order: function ($q, appname, $localForage, $stateParams, OrderCloudSDK) {
		            var d = $q.defer();
		            var storageName = appname + '.routeto';
		            $localForage.setItem(storageName, { state: 'orders', id: $stateParams.orderID })
                        .then(function() {
                            OrderCloudSDK.Orders.Get("Outgoing",$stateParams.orderID)
                            .then(function (order) {
                                $localForage.removeItem(storageName);
                                d.resolve(order);
                            });
                        });
		            return d.promise;
		        }
		    }
		})
    ;
}

function OrdersController($rootScope, $state, $ocMedia, $sce, $document, $uibModal, OrderCloudSDK, OrderCloudParameters,
                          Orders, Parameters, Me, WeirService, CurrentCustomer, DraftCount, ConfirmedCount, DeletedCount) {
    var vm = this;
    vm.list = Orders;
    vm.parameters = Parameters;
	vm.MyOrg = Me.Org;
	vm.DefaultCurrency = WeirService.CurrentCurrency();
	vm.OrderCurrency = function (ord) {
	    return WeirService.CurrentCurrency(ord).curr;
	};
	vm.Customer = CurrentCustomer;
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
        return OrderCloudSDK.Orders.List("Outgoing", {'from':Parameters.from, 'to':Parameters.to, 'search':Parameters.search, 'page':vm.list.Meta.Page + 1, 'pageSize':Parameters.pageSize || vm.list.Meta.PageSize, 'searchOn':Parameters.searchOn, 'sortBy':Parameters.sortBy, 'filters':Parameters.filters})
            .then(function(data) {
                vm.list.Items = vm.list.Items.concat(data.Items);
                vm.list.Meta = data.Meta;
            });
    };

    vm.dateOf = function(utcDate) {
        return new Date(utcDate);
    };

    var labels = {
        en: {
            AllHeader: vm.list.Meta.TotalCount.toString() + " Order" + (vm.list.Meta.TotalCount == 1 ? "" : "s"),
    		DraftHeader: vm.list.Meta.TotalCount.toString() + " Draft Order" +  (vm.list.Meta.TotalCount == 1 ? "" : "s"),
		    ConfirmedHeader: vm.list.Meta.TotalCount.toString() + " Confirmed Order" +  (vm.list.Meta.TotalCount == 1 ? "" : "s"),
		    DeletedHeader: vm.list.Meta.TotalCount.toString() + " Deleted Order" + (vm.list.Meta.TotalCount == 1 ? "" : "s"),
		    InvoicedHeader: vm.list.Meta.TotalCount.toString() + " Invoiced Order" + (vm.list.Meta.TotalCount == 1 ? "" : "s"),
            SortText: "You can sort orders by Order No, Total, Date",
            View: "View",
            all: "All Orders",
            draft: "Submitted with PO",
            draftCount: DraftCount.Meta.TotalCount.toString() > 0 ? "Draft (" + DraftCount.Meta.TotalCount.toString() + ")" : "Draft",
            confirmed: "Confirmed",
            confirmedCount: ConfirmedCount.Meta.TotalCount.toString() > 0 ? "Confirmed (" + ConfirmedCount.Meta.TotalCount.toString() + ")" : "Confirmed",
            deleted: "Deleted",
            deletedCount: DeletedCount.Meta.TotalCount.toString() > 0 ? "Deleted (" + DeletedCount.Meta.TotalCount.toString() + ")" : "Deleted",
            invoiced: "Invoiced",
	        OrderNum: "Weir Order No.",
		    OrderName: "Your Order Name",
		    OrderRef: "Your Order ref;",
		    Total: "Order Value",
		    Customer: "Customer",
            Status: "Status",
            Date: "Date",
		    ReplaceCartMessage: "Continuing with this action will change your cart to this order. Are you sure you want to proceed?",
		    Revisions: "Revisions",
		    PONumber: "Your PO Number",
		    Reviewer: "Reviewer",
		    OrderDate: "Order Date",
		    ContractNum: "Weir Contract Number",
		    ConfirmedBy: "Confirmed By",
		    DateConfirmed: "Date Confirmed",
		    DateDespatched: "Date Despatched",
		    DateDeleted: "Date Deleted",
		    DateInvoiced: "Date Invoiced",
		    EstDelivery: "Estimated Delivery Date",
			NoMatches: "No Matches Found.",
            Search: "Search",
            SearchPlaceholder: "Search by Weir quote or order number",
            Clear: "Clear Search",
			Filters: $sce.trustAsHtml("<i class='fa fa-filter'></i>Filters"),
            statusDate: "Date Updated",
            submittedDate: "Submitted Date"
	    },
        fr: {
            AllHeader: $sce.trustAsHtml(vm.list.Meta.TotalCount.toString() + "  commande" + (vm.list.Meta.TotalCount == 1 ? "" : "s")),
	        DraftHeader: $sce.trustAsHtml(vm.list.Meta.TotalCount.toString() + "FR: commandes soumise" + (vm.list.Meta.TotalCount == 1 ? "" : "s")),
		    ConfirmedHeader: $sce.trustAsHtml(vm.list.Meta.TotalCount.toString() + "  commandes confirmée" + (vm.list.Meta.TotalCount == 1 ? "" : "s")),
		    DeletedHeader: $sce.trustAsHtml("FR: " + vm.list.Meta.TotalCount.toString() + "  commandes deleted" + (vm.list.Meta.TotalCount == 1 ? "" : "s")),
		    InvoicedHeader: $sce.trustAsHtml(vm.list.Meta.TotalCount.toString() + " commandes facturée" + (vm.list.Meta.TotalCount == 1 ? "" : "s")),
            SortText: $sce.trustAsHtml("Vous pouvez filtrer par numéro de devis, montant, et date"),
            View: $sce.trustAsHtml("Voir"),
            all: $sce.trustAsHtml("Toutes les commandes"),
            draft: $sce.trustAsHtml("FR: Commande avec Bon de Commande"),
            draftCount: $sce.trustAsHtml(DraftCount.Meta.TotalCount.toString() > 0 ? "FR: Commande avec Bon de Commande (" + DraftCount.Meta.TotalCount.toString() + ")" : "FR: Commande avec Bon de Commande"),
            confirmed: $sce.trustAsHtml("Confirmée"),
            confirmedCount: $sce.trustAsHtml(ConfirmedCount.Meta.TotalCount.toString() > 0 ? "Confirmée (" + ConfirmedCount.Meta.TotalCount.toString() + ")" : "Confirmée"),
            deleted: $sce.trustAsHtml("FR: Deleted"),
            deletedCount: $sce.trustAsHtml("FR: " + DeletedCount.Meta.TotalCount.toString() > 0 ? "Deleted (" + DeletedCount.Meta.TotalCount.toString() + ")" : "Deleted"),
            invoiced: $sce.trustAsHtml("Facturée"),
		    OrderNum: $sce.trustAsHtml("Numéro de commande WEIR"),
		    OrderName: $sce.trustAsHtml("Votre libellé de commande"),
		    OrderRef: $sce.trustAsHtml("Votre référence de commande"),
		    Total: $sce.trustAsHtml("Montant total"),
		    Customer: $sce.trustAsHtml("Client"),
            Status: $sce.trustAsHtml("Statut"),
            Date: $sce.trustAsHtml("Date"),
		    ReplaceCartMessage: $sce.trustAsHtml("La poursuite de cette action changera votre panier pour cette commande. Voulez-vous continuer?"),
		    Revisions: $sce.trustAsHtml("Révisions"),
		    PONumber: $sce.trustAsHtml("Votre numéro de commande"),
		    Reviewer: $sce.trustAsHtml("Révisé par"),
		    OrderDate: $sce.trustAsHtml("Date de commande"),
		    ContractNum: $sce.trustAsHtml("Numéro de contrat WEIR"),
		    ConfirmedBy: $sce.trustAsHtml("Confirmée par"),
		    DateConfirmed: $sce.trustAsHtml("Date confirmé"),
		    DateDespatched: $sce.trustAsHtml("Date d'envoi"),
		    DateDeleted: $sce.trustAsHtml("Date Deleted"),
		    DateInvoiced: $sce.trustAsHtml("Date de facturation"),
		    EstDelivery: $sce.trustAsHtml("Délai de livraison estimé"),
            NoMatches: $sce.trustAsHtml("Aucun résultat"),
            Search: $sce.trustAsHtml("Rechercher"),
            SearchPlaceholder: $sce.trustAsHtml("Rechercher par référence de cotation ou de commande WEIR"),
            Clear: $sce.trustAsHtml("Effacer le rechercher"),
            Filters: $sce.trustAsHtml("<i class='fa fa-filter'></i> Filtres"),
            statusDate: $sce.trustAsHtml("Date de mise à jour"),
            submittedDate: $sce.trustAsHtml("Date d’envoi")
	    }
    };
    vm.labels = labels[WeirService.Locale()];

	vm.FilterActions = _filterActions;
	function _filterActions(action) {
        var filter = {
            "orders.all": {
                "xp.Type":"Order",
                "xp.Active":true
            },
			"orders.draft": {
                "xp.Type":"Order",
                "xp.Status":WeirService.OrderStatus.SubmittedPendingPO.id + "|" + WeirService.OrderStatus.RevisedOrder.id + "|" + WeirService.OrderStatus.RejectedRevisedOrder.id + "|" + WeirService.OrderStatus.Despatched.id + "|" + WeirService.OrderStatus.Invoiced.id + "|" + WeirService.OrderStatus.ConfirmedOrder.id,
                "xp.Active":true
            },
			"orders.confirmed":{
                "xp.Type":"Order",
                "xp.Status":WeirService.OrderStatus.ConfirmedOrder.id + "|" + WeirService.OrderStatus.SubmittedWithPO.id,
                "xp.Active": true
            },
			"orders.deleted": {
                "xp.Type":"Order",
                "xp.Status":WeirService.OrderStatus.Deleted.id
            }
		};
		return JSON.stringify(filter[action]);
	}

	vm.ReviewOrder = _reviewOrder;
	function _reviewOrder(orderId, status, buyerId) {
	    if (status === WeirService.OrderStatus.ConfirmedOrder.id || status === WeirService.OrderStatus.Despatched.id || status === WeirService.OrderStatus.Invoiced.id || status === WeirService.OrderStatus.SubmittedWithPO.id || status === WeirService.OrderStatus.SubmittedPendingPO.id || status === WeirService.OrderStatus.Review.id || status === WeirService.OrderStatus.RejectedRevisedOrder.id || status === WeirService.OrderStatus.Deleted.id) {
			$state.transitionTo('readonly', {quoteID: orderId, buyerID: buyerId});
		} else if(status === WeirService.OrderStatus.RevisedOrder.id) {
			$state.transitionTo('revised', { quoteID: orderId, buyerID: buyerId });
		} else {
			var gotoReview = (vm.CurrentOrderId !== orderId) && (WeirService.CartHasItems()) ? confirm(vm.labels.ReplaceCartMessage) : true;
			if (gotoReview) {
				WeirService.SetQuoteAsCurrentOrder(orderId)
					.then(function () {
						$rootScope.$broadcast('SwitchCart');
						$state.transitionTo('myquote.detail');
					});
			}
		}
    }

    vm.GoToOrder = function (orderId) {
        $state.go("orders.goto", { orderID: orderId });
    };

    vm.delete = function (id, orderList, indx) {
        var parentElem = angular.element($document[0].querySelector('body'));
        $uibModal.open({
            animation: true,
            size: 'md',
            templateUrl: 'orders/templates/deleteordermodal.tpl.html',
            controller: function ($uibModalInstance, $state, Me, WeirService, toastr, $exceptionHandler) {
                var vm = this;
                labels = {
                    en: {
                        DeleteOrder: "Delete order?",
                        ConfirmDelete: "Delete order number " + id + "?",
                        CancelDelete: "Cancel",
                        DeletedTitle: "Success",
                        DeletedMessage: "Your order has been deleted"
                    },
                    fr: {
                        DeleteOrder: $sce.trustAsHtml("FR: Delete order?"),
                        ConfirmDelete: $sce.trustAsHtml("FR: Delete order number " + id + "?"),
                        CancelDelete: $sce.trustAsHtml("Annuler"),
                        DeletedTitle: "Success",
                        DeletedMessage: "Your order has been deleted"
                    }
                };
                vm.labels = WeirService.LocaleResources(labels);
                vm.close = function () {
                    $uibModalInstance.dismiss();
                };
                vm.deleteOrder = function () {
                    var mods = {
                        xp: {
                            DateDeleted: new Date(),
                            Status: WeirService.OrderStatus.Deleted.id
                        }
                    };
                    var qte = {
                        ID: id
                    };
                    console.log("Would mark order " + id + " as deleted now");
                    WeirService.UpdateQuote(qte, mods)
                        .then(function (qte) {
                            orderList.splice(indx, 1);
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
function RouteToOrderController($rootScope, $state, WeirService, toastr, Order, Me) {
    if (Order) {
        var type = Order.xp.Type;
        if (type === "Order") {
            reviewOrder(Order.ID, Order.xp.Status, Me.GetBuyerID());
        } else {
            $state.go('quotes.goto', { quoteID: Order.ID });
        }
    } else {
        var errorMsg="";
        if(WeirService.Locale()==="fr"){
            errorMsg="Commande non trouvée";
        }
        else{
            errorMsg="Order not found";
        }
        toastr.error(errorMsg);
        $state.go('orders.draft');
    }
    function reviewOrder(orderId, status, buyerId) {
        if (status === WeirService.OrderStatus.ConfirmedOrder.id || status === WeirService.OrderStatus.Despatched.id || status === WeirService.OrderStatus.Invoiced.id || status === WeirService.OrderStatus.SubmittedWithPO.id || status === WeirService.OrderStatus.SubmittedPendingPO.id || status === WeirService.OrderStatus.Review.id || status === WeirService.OrderStatus.Submitted.id) {
            $state.transitionTo('readonly', { quoteID: orderId, buyerID: buyerId });
        } else if (status === WeirService.OrderStatus.RevisedOrder.id) {
            $state.transitionTo('revised', {quoteID: orderId, buyerID: buyerId});
        } else {
            WeirService.SetQuoteAsCurrentOrder(orderId)
                .then(function () {
                    $rootScope.$broadcast('SwitchCart');
                    $state.transitionTo('myquote.detail');
                });
        }
    }
}
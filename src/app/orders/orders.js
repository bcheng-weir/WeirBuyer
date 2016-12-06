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
	            MyOrg: function(OrderCloud) {
		            return OrderCloud.Buyers.Get(OrderCloud.BuyerID.Get());
	            },
                Parameters: function($stateParams, OrderCloudParameters) {
                    return OrderCloudParameters.Get($stateParams);
                },
	            Orders: function(OrderCloud, Parameters, MyOrg) {
                    return OrderCloud.Orders.ListOutgoing(Parameters.from, Parameters.to, Parameters.search, Parameters.page, Parameters.pageSize || 20, Parameters.searchOn, Parameters.sortBy, Parameters.filters, MyOrg.ID);
				}
            }
        })
        .state('orders.submitted', {
            url: '/submitted',
            templateUrl: 'orders/templates/orders.submitted.tpl.html',
	        parent: 'orders'
        })
        .state('orders.pending', {
            url: '/pending',
            templateUrl: 'orders/templates/orders.pending.tpl.html',
	        parent: 'orders'
        })
	    .state('orders.revised', {
		    url: '/revised',
		    templateUrl: 'orders/templates/orders.revised.tpl.html',
		    parent: 'orders'
	    })
	    .state('orders.confirmed', {
		    url: '/confirmed',
		    templateUrl: 'orders/templates/orders.confirmed.tpl.html',
		    parent: 'orders'
	    })
	    .state('orders.despatched', {
		    url: '/despatched',
		    templateUrl: 'orders/templates/orders.despatched.tpl.html',
		    parent: 'orders'
	    })
	    .state('orders.invoiced', {
		    url: '/invoiced',
		    templateUrl: 'orders/templates/orders.invoiced.tpl.html',
		    parent: 'orders'
	    })
		.state('orders.goto', {
		    url: '/:orderID',
		    controller: 'RouteToOrderCtrl',
		    resolve: {
		        Order: function ($q, appname, $localForage, $stateParams, OrderCloud) {
		            var d = $q.defer();
		            var storageName = appname + '.routeto';
		            $localForage.setItem(storageName, { state: 'orders', id: $stateParams.orderID })
                        .then(function() {
                            OrderCloud.Orders.Get($stateParams.orderID)
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

function OrdersController($rootScope, $state, $ocMedia, $sce, OrderCloud, OrderCloudParameters, Orders, Parameters, MyOrg, WeirService, CurrentCustomer) {
    var vm = this;
    vm.list = Orders;
    vm.parameters = Parameters;
	vm.MyOrg = MyOrg;
	vm.Customer = CurrentCustomer;
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
    		SubmittedHeader: vm.list.Items.length.toString() + " submitted Order" +  (vm.list.Items.length == 1 ? "" : "s"),
		    PendingHeader: vm.list.Items.length.toString() + " pending Order" +  (vm.list.Items.length == 1 ? "" : "s"),
		    PendingNotice: "Orders submitted pending PO will not be confirmed until Weir have received a purchase order",
		    RevisedHeader: vm.list.Items.length.toString() + " revised Order" +  (vm.list.Items.length == 1 ? "" : "s"),
		    ConfirmedHeader: vm.list.Items.length.toString() + " confirmed Order" +  (vm.list.Items.length == 1 ? "" : "s"),
		    DespatchedHeader: vm.list.Items.length.toString() + " despatched Order" +  (vm.list.Items.length == 1 ? "" : "s"),
		    InvoicedHeader: vm.list.Items.length.toString() + " invoiced Order" +  (vm.list.Items.length == 1 ? "" : "s"),
		    View: "View",
		    submitted: "Submitted with PO",
		    pending: "Submitted pending PO",
		    revised: "Revised",
		    confirmed: "Confirmed",
		    despatched: "Despatched",
		    invoiced: "Invoiced",
	        OrderNum: "Weir Order No.",
		    OrderName: "Your Order Name",
		    OrderRef: "Your Order ref;",
		    Total: "Order value",
		    Customer: "Customer",
		    Status: "Status",
		    ReplaceCartMessage: "Continuing with this action will change your cart to this order. Are you sure you want to proceed?",
		    Revisions: "Revisions",
		    PONumber: "Your PO number",
		    Reviewer: "Reviewer",
		    OrderDate: "Order date",
		    ContractNum: "Weir Contract number",
		    ConfirmedBy: "Confirmed by",
		    DateConfirmed: "Date confirmed",
		    DateDespatched: "Date despatched",
		    DateInvoiced: "Date invoiced",
		    EstDelivery: "Estimated delivery date"
	    },
	    fr: {
	        SubmittedHeader: $sce.trustAsHtml("FR: " + vm.list.Items.length.toString() + " submitted Order" + (vm.list.Items.length == 1 ? "" : "s")),
	        PendingHeader: $sce.trustAsHtml("FR: " + vm.list.Items.length.toString() + " pending Order" + (vm.list.Items.length == 1 ? "" : "s")),
		    PendingNotice: $sce.trustAsHtml("FR: Orders submitted pending PO will not be confirmed until Weir have received a purchase order"),
		    RevisedHeader: $sce.trustAsHtml("FR: " + vm.list.Items.length.toString() + " revised Order" + (vm.list.Items.length == 1 ? "" : "s")),
		    ConfirmedHeader: $sce.trustAsHtml("FR: " + vm.list.Items.length.toString() + " confirmed Order" + (vm.list.Items.length == 1 ? "" : "s")),
		    DespatchedHeader: $sce.trustAsHtml("FR: " + vm.list.Items.length.toString() + " despatched Order" + (vm.list.Items.length == 1 ? "" : "s")),
		    InvoicedHeader: $sce.trustAsHtml("FR: " + vm.list.Items.length.toString() + " invoiced Order" + (vm.list.Items.length == 1 ? "" : "s")),
		    View: $sce.trustAsHtml("FR:View"),
		    submitted: $sce.trustAsHtml("FR:Submitted with PO"),
		    pending: $sce.trustAsHtml("FR:Submitted pending PO"),
		    revised: $sce.trustAsHtml("FR:Revised"),
		    confirmed: $sce.trustAsHtml("FR:Confirmed"),
		    despatched: $sce.trustAsHtml("FR:Despatched"),
		    invoiced: $sce.trustAsHtml("FR:Invoiced"),
		    OrderNum: $sce.trustAsHtml("FR:Weir Order No."),
		    OrderName: $sce.trustAsHtml("FR:Your Order Name"),
		    OrderRef: $sce.trustAsHtml("FR:Your Order ref;"),
		    Total: $sce.trustAsHtml("FR:Order value"),
		    Customer: $sce.trustAsHtml("Client"),
		    Status: $sce.trustAsHtml("Statut"),
		    ReplaceCartMessage: $sce.trustAsHtml("FR:Continuing with this action will change your cart to this order. Are you sure you want to proceed?"),
		    Revisions: $sce.trustAsHtml("FR:Revisions"),
		    PONumber: $sce.trustAsHtml("FR:Your PO number"),
		    Reviewer: $sce.trustAsHtml("FR:Reviewer"),
		    OrderDate: $sce.trustAsHtml("Date de commande"),
		    ContractNum: $sce.trustAsHtml("FR:Weir Contract number"),
		    ConfirmedBy: $sce.trustAsHtml("FR:Confirmed by"),
		    DateConfirmed: $sce.trustAsHtml("FR:Date confirmed"),
		    DateDespatched: $sce.trustAsHtml("FR:Date despatched"),
		    DateInvoiced: $sce.trustAsHtml("FR:Date invoiced"),
		    EstDelivery: $sce.trustAsHtml("FR:Estimated delivery date")
	    }
    };
    vm.labels = labels[WeirService.Locale()];

	vm.FilterActions = _filterActions;
	function _filterActions(action) {
		var filter = {
			"orders.submitted":{"xp.Type":"Order", "xp.Status":WeirService.OrderStatus.SubmittedWithPO.id, "xp.Active":true},
			"orders.pending":{"xp.Type":"Order", "xp.PendingPO":true, "xp.Active":true},
			"orders.revised":{"xp.Type":"Order","xp.Status":WeirService.OrderStatus.RevisedOrder.id+"|"+WeirService.OrderStatus.RejectedRevisedOrder, "xp.Active":true},
			"orders.confirmed":{"xp.Type":"Order","xp.Status":WeirService.OrderStatus.ConfirmedOrder.id, "xp.Active":true},
			"orders.despatched":{"xp.Type":"Order", "xp.Status":WeirService.OrderStatus.Despatched.id, "xp.Active":true},
			"orders.invoiced":{"xp.Type":"Order","xp.Status":WeirService.OrderStatus.Invoiced.id, "xp.Active":true}
		};
		return JSON.stringify(filter[action]);
	}

	vm.ReviewOrder = _reviewOrder;
	function _reviewOrder(orderId, status, buyerId) {
		if (status == WeirService.OrderStatus.ConfirmedOrder.id || status == WeirService.OrderStatus.Despatched.id || status == WeirService.OrderStatus.Invoiced.id || status == WeirService.OrderStatus.SubmittedWithPO.id || status == WeirService.OrderStatus.SubmittedPendingPO.id || status == WeirService.OrderStatus.Review.id) {
			$state.transitionTo('readonly', {quoteID: orderId, buyerID: buyerId});
		} else if(status == WeirService.OrderStatus.RevisedOrder.id) {
			$state.transitionTo('revised', { quoteID: orderId, buyerID: buyerId });
		} else {
			var gotoReview = (vm.CurrentOrderId != orderId) && (WeirService.CartHasItems()) ? confirm(vm.labels.ReplaceCartMessage) : true;
			if (gotoReview) {
				WeirService.SetQuoteAsCurrentOrder(orderId)
					.then(function () {
						$rootScope.$broadcast('SwitchCart');
						$state.transitionTo('myquote.detail');
					});
			}
		}
	}
}
function RouteToOrderController($rootScope, $state, WeirService, toastr, Order, OrderCloud) {
    if (Order) {
        var type = Order.xp.Type;
        if (type == "Order") {
            reviewOrder(Order.ID, Order.xp.Status, OrderCloud.BuyerID.Get());
        } else {
            $state.go('quotes.goto', { quoteID: Order.ID });
        }
    } else {
        toastr.error("Order not found");
        $state.go('orders.submitted');
    }
    function reviewOrder(orderId, status, buyerId) {
        if (status == WeirService.OrderStatus.ConfirmedOrder.id || status == WeirService.OrderStatus.Despatched.id || status == WeirService.OrderStatus.Invoiced.id || status == WeirService.OrderStatus.SubmittedWithPO.id || status == WeirService.OrderStatus.SubmittedPendingPO.id || status == WeirService.OrderStatus.Review.id) {
            $state.transitionTo('readonly', { quoteID: orderId, buyerID: buyerId });
        } else if (status == WeirService.OrderStatus.RevisedOrder.id) {
            $state.transitionTo('revised', { quoteID: orderId, buyerID: buyerId });
        } else {
            WeirService.SetQuoteAsCurrentOrder(orderId)
                .then(function () {
                    $rootScope.$broadcast('SwitchCart');
                    $state.transitionTo('myquote.detail');
                });
        }
    }
}
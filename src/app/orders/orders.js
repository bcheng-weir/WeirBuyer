angular.module('orderCloud')
    .config(OrdersConfig)
    .controller('OrdersCtrl', OrdersController);

function OrdersConfig($stateProvider, buyerid) {
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
                Parameters: function($stateParams, OrderCloudParameters) {
                    return OrderCloudParameters.Get($stateParams);
                },
	            Orders: function(OrderCloud, Parameters) {
                    return OrderCloud.Orders.ListOutgoing(Parameters.from, Parameters.to, Parameters.search, Parameters.page, Parameters.pageSize || 20, Parameters.searchOn, Parameters.sortBy, Parameters.filters, buyerid);
				},
	            MyOrg: function(OrderCloud) {
		            return OrderCloud.Buyers.Get(buyerid);
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
	    });
}

function OrdersController($state, $ocMedia, $sce, OrderCloud, OrderCloudParameters, Orders, Parameters, MyOrg, WeirService) {
    var vm = this;
    vm.list = Orders;
    vm.parameters = Parameters;
	vm.MyOrg = MyOrg;
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
		    Status: "Status"
	    },
	    fr: {
		    submitted: $sce.trustAsHtml("Submitted with PO"),
		    pending: $sce.trustAsHtml("Submitted pending PO"),
		    revised: $sce.trustAsHtml("Revised"),
		    confirmed: $sce.trustAsHtml("Confirmed"),
		    despatched: $sce.trustAsHtml("Despatched"),
		    invoiced: $sce.trustAsHtml("Invoiced")
	    }
    };
    vm.labels = labels[WeirService.Locale()];
	vm.FilterActions = _filterActions;
	function _filterActions(action) {
		var filter = {
			"orders.submitted":{"xp.Type":"Order", "xp.Status":WeirService.OrderStatus.SubmittedWithPO.id, "xp.Active":"true"},
			"orders.pending":{"xp.Type":"Order", "xp.PendingPO":"true", "xp.Active":"true"},
			"orders.revised":{"xp.Type":"Order","xp.Status":WeirService.OrderStatus.RevisedOrder.id, "xp.Active":"true"},
			"orders.confirmed":{"xp.Type":"Order","xp.Status":WeirService.OrderStatus.ConfirmedOrder.id, "xp.Active":"true"},
			"orders.despatched":{"xp.Type":"Order", "xp.Status":WeirService.OrderStatus.Despatched.id, "xp.Active":"true"},
			"orders.invoiced":{"xp.Type":"Order","xp.Status":WeirService.OrderStatus.Invoiced.id, "xp.Active":"true"}
		};
		return JSON.stringify(filter[action]);
		//$state.go(action, {filters:JSON.stringify(filter[action])},{reload:true});
	}
	vm.filters = function() {
		return JSON.stringify({"xp.Type":"Order", "xp.Status":WeirService.OrderStatus.SubmittedWithPO.id, "xp.Active":"true"});
	}
}
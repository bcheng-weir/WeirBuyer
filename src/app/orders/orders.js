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
            data: {componentName: 'Orders'},
            resolve: {
                Parameters: function($stateParams, OrderCloudParameters) {
                    return OrderCloudParameters.Get($stateParams);
                },
	            Orders: function(OrderCloud, Parameters) {
                    return OrderCloud.Orders.ListOutgoing(Parameters.from, Parameters.to, Parameters.search, Parameters.page, Parameters.pageSize || 20, Parameters.searchOn, Parameters.sortBy, Parameters.filters, buyerid);
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

function OrdersController($state, $ocMedia, $sce, OrderCloud, OrderCloudParameters, Orders, Parameters, WeirService) {
    var vm = this;
    vm.list = Orders;
    vm.parameters = Parameters;
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
		    submitted: "Submitted with PO",
		    pending: "Submitted pending PO",
		    revised: "Revised",
		    confirmed: "Confirmed",
		    despatched: "Despatched",
		    invoiced: "Invoiced"
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
}
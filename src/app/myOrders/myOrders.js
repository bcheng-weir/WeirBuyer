angular.module('orderCloud')
    .config(MyOrdersConfig)
    .controller('MyOrdersCtrl', MyOrdersController)
    .controller('MyOrderEditCtrl', MyOrderEditController)
    .factory('MyOrdersTypeAheadSearchFactory', MyOrdersTypeAheadSearchFactory)
;

function MyOrdersConfig($stateProvider) {
    $stateProvider
        .state('myOrders', {
            parent: 'base',
            templateUrl: 'myOrders/templates/myOrders.tpl.html',
            controller: 'MyOrdersCtrl',
            controllerAs: 'myOrders',
            url: '/myorders?from&to&search&page&pageSize&searchOn&sortBy&filters',
            data: {componentName: 'My Orders'},
            resolve: {
                Parameters: function($stateParams, OrderCloudParameters) {
                    return OrderCloudParameters.Get($stateParams);
                },
                OrderList: function(OrderCloudSDK, Parameters) {
                    return OrderCloudSDK.Orders.List("Outgoing", {'search':Parameters.search, 'page':Parameters.page, 'pageSize':Parameters.pageSize || 12, 'searchOn':Parameters.searchOn, 'sortBy':Parameters.sortBy, 'filters':Parameters.filters, 'from':Parameters.from, 'to':Parameters.to});
                }
            }
        })
        .state('myOrders.edit', {
            url: '/:orderid/edit',
            templateUrl: 'myOrders/templates/myOrderEdit.tpl.html',
            controller: 'MyOrderEditCtrl',
            controllerAs: 'myOrderEdit',
            resolve: {
                SelectedOrder: function($stateParams, OrderCloudSDK) {
                    return OrderCloudSDK.Orders.Get("Outgoing", $stateParams.orderid);
                },
                SelectedPayments: function($stateParams, $q, OrderCloudSDK, Me) {
                    var dfd = $q.defer();
                    var paymentList = {};

                    OrderCloudSDK.Payments.List("Outgoing", $stateParams.orderid, {'page':1, 'pageSize':100})
                        .then(function(data) {
                            paymentList = data.Items;
                            dfd.resolve(paymentList);
                            angular.forEach(paymentList, function(payment) {
                                if (payment.Type === 'CreditCard') {
                                    OrderCloudSDK.CreditCards.Get(Me.GetBuyerID(), payment.CreditCardID)
                                        .then(function(cc) {
                                            payment.creditCards = cc;
                                        })
                                }
                            });
                            dfd.resolve(paymentList);
                        });
                    return dfd.promise;
                },
                LineItemList: function($stateParams, OrderCloudSDK) {
                    return OrderCloudSDK.LineItems.List("Outgoing", $stateParams.orderid);
                }
            }
        })
    ;
}

function MyOrdersController($state, $ocMedia, OrderCloudSDK, OrderCloudParameters, OrderList, Parameters) {
    var vm = this;
    vm.list = OrderList;
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
        return OrderCloudSDK.Orders.List("Incoming", { 'from':Parameters.from, 'to':Parameters.to, 'search':Parameters.search, 'page':vm.list.Meta.Page + 1, 'pageSize':Parameters.pageSize || vm.list.Meta.PageSize, 'searchOn':Parameters.searchOn, 'sortBy':Parameters.sortBy, 'filters':Parameters.filters })
            .then(function(data) {
                vm.list.Items = vm.list.Items.concat(data.Items);
                vm.list.Meta = data.Meta;
            });
    };
}

function MyOrderEditController($scope, $q, $exceptionHandler, $state, toastr, OrderCloudSDK, OCGeography, MyOrdersTypeAheadSearchFactory, SelectedOrder, SelectedPayments, LineItemList) {
    var vm = this,
        orderid = SelectedOrder.ID;
    vm.order = SelectedOrder;
    vm.orderID = SelectedOrder.ID;
    vm.list = LineItemList;
    vm.paymentList = SelectedPayments;
    vm.states = OCGeography.States;
    vm.countries = OCGeography.Countries;


    vm.pagingfunction = PagingFunction;
    $scope.isCollapsedPayment = true;
    $scope.isCollapsedBilling = true;
    $scope.isCollapsedShipping = true;

    vm.deletePayment = function(payment) {
        OrderCloudSDK.Payments.Delete("Outgoing",orderid, payment.ID)
            .then(function() {
                $state.go($state.current, {}, {reload: true});
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    };

    vm.deleteLineItem = function(lineitem) {
        OrderCloudSDK.LineItems.Delete("Outgoing", orderid, lineitem.ID)
            .then(function() {
                $state.go($state.current, {}, {reload: true});
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    };

    vm.updateBillingAddress = function() {
        vm.order.BillingAddressID = null;
        vm.order.BillingAddress.ID = null;
        OrderCloudSDK.Orders.Patch("Outgoing", orderid, vm.order)
            .then(function() {
                OrderCloudSDK.Orders.SetBillingAddress("Outgoing", orderid, vm.order.BillingAddress)
                    .then(function() {
                        $state.go($state.current, {}, {reload: true});
                    });
            });
    };

    vm.updateShippingAddress = function() {
        OrderCloudSDK.Orders.SetShippingAddress("Outgoing", orderid, vm.ShippingAddress);
    };

    vm.Submit = function() {
        var dfd = $q.defer();
        var queue = [];
        angular.forEach(vm.list.Items, function(lineitem, index) {
            if ($scope.EditForm.PaymentInfo.LineItems['Quantity' + index].$dirty || $scope.EditForm.PaymentInfo.LineItems['UnitPrice' + index].$dirty) {
                queue.push(OrderCloudSDK.LineItems.Update("Outgoing", orderid, lineitem.ID, lineitem));
            }
        });
        $q.all(queue)
            .then(function() {
                dfd.resolve();
                OrderCloudSDK.Orders.Patch("Outgoing", orderid, vm.order)
                    .then(function() {
                        toastr.success('Order Updated', 'Success');
                        $state.go('myOrders', {}, {reload: true});
                    })
                    .catch(function(ex) {
                        $exceptionHandler(ex)
                    });
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });

        return dfd.promise;
    };

    vm.Delete = function() {
        OrderCloudSDK.Orders.Delete("Outgoing", orderid)
            .then(function() {
                $state.go('myOrders', {}, {reload: true});
                toastr.success('Order Deleted', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    };

    function PagingFunction() {
        if (vm.list.Meta.Page < vm.list.Meta.PageSize) {
            OrderCloudSDK.LineItems.List("Outgoing", vm.order.ID, {'page':vm.list.Meta.Page + 1, 'pageSize':vm.list.Meta.PageSize})
                .then(function(data) {
                    vm.list.Meta = data.Meta;
                    vm.list.Items = [].concat(vm.list.Items, data.Items);
                });
        }
    }
    vm.spendingAccountTypeAhead = MyOrdersTypeAheadSearchFactory.SpendingAccountList;
    vm.shippingAddressTypeAhead = MyOrdersTypeAheadSearchFactory.ShippingAddressList;
    vm.billingAddressTypeAhead = MyOrdersTypeAheadSearchFactory.BillingAddressList;
}

function MyOrdersTypeAheadSearchFactory($q, Underscore, OrderCloudSDK, Me) {
    return {
        SpendingAccountList: _spendingAccountList,
        ShippingAddressList: _shippingAddressList,
        BillingAddressList: _billingAddressList
    };

    function _spendingAccountList(term) {
        return OrderCloudSDK.SpendingAccounts.List(Me.GetBuyerID(), {'serach':term})
            .then(function(data) {
                return data.Items;
            });
    }

    function _shippingAddressList(term) {
        var dfd = $q.defer();
        var queue = [];
        queue.push(OrderCloudSDK.Addresses.List(Me.GetBuyerID(), {'search':term}));
        queue.push(OrderCloudSDK.Addresses.ListAssignments( Me.GetBuyerID(),{ 'isShipping':true }));
        $q.all(queue)
            .then(function(result) {
                var searchAssigned = Underscore.intersection(Underscore.pluck(result[0].Items, 'ID'), Underscore.pluck(result[1].Items, 'AddressID'));
                var addressList = Underscore.filter(result[0].Items, function(address) {
                    if (searchAssigned.indexOf(address.ID) > -1) {
                        return address;
                    }
                });
                dfd.resolve(addressList);
            });
        return dfd.promise;
    }

    function _billingAddressList(term) {
        var dfd = $q.defer();
        var queue = [];
        queue.push(OrderCloudSDK.Addresses.List(Me.GetBuyerID(), {'search':term}));
        queue.push(OrderCloudSDK.Addresses.ListAssignments(Me.GetBuyerID(), { 'isShipping':true}));
        $q.all(queue)
            .then(function(result) {
                var searchAssigned = Underscore.intersection(Underscore.pluck(result[0].Items, 'ID'), Underscore.pluck(result[1].Items, 'AddressID'));
                var addressList = Underscore.filter(result[0].Items, function(address) {
                    if (searchAssigned.indexOf(address.ID) > -1) {
                        return address;
                    }
                });
                dfd.resolve(addressList);
            });
        return dfd.promise;
    }
}
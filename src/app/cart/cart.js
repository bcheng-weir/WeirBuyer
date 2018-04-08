angular.module('orderCloud')
    .config(CartConfig)
    .controller('CartCtrl', CartController)
    .controller('MiniCartCtrl', MiniCartController)
    .directive('ordercloudMinicart', OrderCloudMiniCartDirective)
    .controller('MinicartModalController', MinicartModalController)
;

function CartConfig($stateProvider) {
    $stateProvider
        .state('cart', {
            parent: 'base',
            data: {componentName: 'Cart'},
            url: '/cart',
            templateUrl: 'cart/templates/cart.tpl.html',
            controller: 'CartCtrl',
            controllerAs: 'cart',
            resolve: {
                Order: function($rootScope, $q, $state, toastr, CurrentOrder) {
                    var dfd = $q.defer();
                    CurrentOrder.Get()
                        .then(function(order) {
                            dfd.resolve(order)
                        })
                        .catch(function() {
                            dfd.resolve(null);
                        });
                    return dfd.promise;
                },
                CurrentOrderResolve: function($state, Order) {
                    if (!Order) {
                        $state.go('home');
                    }
                },
                LineItemsList: function($q, $state, toastr, Underscore, OrderCloudSDK, WeirService, LineItemHelpers, Order) {
                    var dfd = $q.defer();
                    //testing the locale to give appropiate toastr
                    var errorMsg = "";
                    var errorTitle= "";
                    if(WeirService.Locale() == "fr"){
                        errorMsg = "Votre commande ne contient pas d'éléments";
                        errorTitle = "Erreur";
                    }
                    else{
                        errorMsg = "Your order does not contain any line items";
                        errorTitle = "Error";
                    }
	                OrderCloudSDK.LineItems.List("Outgoing",Order.ID)
                        .then(function(data) {
                            if (!data.Items.length) {
                                toastr.error(errorMsg , errorTitle);
                                if ($state.current.name === 'cart') {
                                    $state.go('home');
                                }
                                dfd.reject();
                            }
                            else {
                                LineItemHelpers.GetProductInfo(data.Items)
                                    .then(function() {
                                        dfd.resolve(data);
                                    });
                            }
                        })
                        .catch(function() {
                            toastr.error(errorMsg , errorTitle);
                            dfd.reject();
                        });
                    return dfd.promise;
                },
                PromotionsList: function(OrderCloudSDK, Order) {
                    return OrderCloudSDK.Orders.ListPromotions("Outgoing", Order.ID);
                }
            }
        });
}

function CartController($q, $rootScope, $timeout, OrderCloudSDK, LineItemHelpers, Order, LineItemsList, PromotionsList) {
    var vm = this;
    vm.order = Order;
    vm.lineItems = LineItemsList;
    vm.promotions = PromotionsList;
    vm.removeItem = LineItemHelpers.RemoveItem;
    vm.pagingfunction = PagingFunction;

    var curr = WeirService.CurrentCurrency(Order);
    vm.currency = curr.symbol;

    vm.updateQuantity = function(cartOrder,lineItem) {
        $timeout.cancel();
        $timeout(function() {
            LineItemHelpers.UpdateQuantity(cartOrder,lineItem);
        },800);
    };

    function PagingFunction() {
        var dfd = $q.defer();
        if (vm.lineItems.Meta.Page < vm.lineItems.Meta.TotalPages) {
	        OrderCloudSDK.LineItems.List("Outgoing", vm.order.ID, { 'page':vm.lineItems.Meta.Page + 1, 'pageSize':vm.lineItems.Meta.PageSize })
                .then(function(data) {
                    vm.lineItems.Meta = data.Meta;
                    vm.lineItems.Items = [].concat(vm.lineItems.Items, data.Items);
                    LineItemHelpers.GetProductInfo(vm.lineItems.Items)
                        .then(function() {
                            dfd.resolve(vm.lineItems);
                        });
                });
        }
        else dfd.reject();
        return dfd.promise;
    }

    $rootScope.$on('OC:UpdateOrder', function(event, OrderID) {
	    OrderCloudSDK.Orders.Get("Outgoing", OrderID)
            .then(function(data) {
                vm.order = data;
            });
    });

    $rootScope.$on('OC:UpdateLineItem', function(event,Order) {
	    OrderCloudSDK.LineItems.List("Outgoing", Order.ID)
                .then(function(data) {
                    LineItemHelpers.GetProductInfo(data.Items)
                        .then(function() {
                            vm.lineItems = data;
                        });
                });
    });
}

function MiniCartController($q, $sce, $state, $rootScope,$uibModal, $ocMedia, OrderCloudSDK, LineItemHelpers, CurrentOrder, Underscore, WeirService) {
    var vm = this;
    vm.Order = {}; //TODO: currency sumbol does not display on initial load.
    vm.LineItems = {};
    vm.currency = "";

    vm.showLineItems = false;
    vm.$ocMedia = $ocMedia;
    vm.TotalItems = 0;

	var labels = {
		en: {
			view: "View ",
			oneItem: "1 item in your ",
            //toDo get the number of items in the order
			moreItems: " items in your ",
			quote: "Quote",
            order: "Order",
            buttonLabel: "Quote"
		},
		fr: {
		    view: $sce.trustAsHtml("Voir d&eacute;tails "),
			oneItem: $sce.trustAsHtml("1 article dans votre cotation (ou commande) "),
            //toDo get the number of items in the order
			moreItems: $sce.trustAsHtml(" articles dans votre cotation (ou commande) "),
			quote: $sce.trustAsHtml("Cotation"),
			order: $sce.trustAsHtml("Commande"),
			buttonLabel: $sce.trustAsHtml("Cotation")
		}
	};
	vm.labels = labels[WeirService.Locale()];

    vm.checkForExpress = function() {
        var expressCheckout = false;
        angular.forEach($state.get(), function(state) {
            if (state.url && state.url == '/expressCheckout') {
                expressCheckout = true;
                return expressCheckout;
            }
        });
        return expressCheckout;
    };

    vm.checkForCheckout = function() {
        var checkout = false;
        angular.forEach($state.get(), function(state) {
            if (state.url && state.url == '/checkout') {
                checkout = true;
                return checkout;
            }
        });
        return checkout;
    };

    vm.goToCart = function() {
        $state.go('myquote.detail', {}, {reload: true});
    };

    vm.lineItemCall = function /*getLineItems*/(order) {
        var dfd = $q.defer();
        var queue = [];
        vm.TotalItems = 0;

        vm.Order = order;
        var curr = WeirService.CurrentCurrency(vm.Order);
        vm.currency = curr.symbol;

	    OrderCloudSDK.LineItems.List("Outgoing", order.ID, { 'page':1, 'pageSize':100 })
            .then(function(li) {
                vm.LineItems = li;
                if (li.Meta.TotalPages > li.Meta.Page) {
                        queue.push(OrderCloudSDK.LineItems.List("Outgoing", order.ID, { 'page':li.Meta.Page + 1, 'pageSize':100 }));
                }
                $q.all(queue)
                    .then(function(results) {
                        angular.forEach(results, function(result) {
                            vm.LineItems.Items = [].concat(vm.LineItems.Items, result.Items);
                            vm.LineItems.Meta = result.Meta;
                        });
                        LineItemHelpers.GetBlankProductInfo(vm.LineItems.Items, {"id":order.xp.BuyerID});
                        dfd.resolve(LineItemHelpers.GetProductInfo(vm.LineItems.Items)); // This used to be reversed and i do not know why. it is removed.
                    });
                Underscore.map(vm.LineItems.Items, function(value, key){
                    vm.TotalItems += value.Quantity;
                });
            });
        return dfd.promise;
    };

    $rootScope.$on('LineItemAddedToCart', function() {
        CurrentOrder.Get()
            .then(function(order) {
                if (vm.$ocMedia('max-width:767px')) {
                    vm.openModal(order);
                } else {
                    vm.lineItemCall(order);
                    vm.showLineItems = true;
                }
            });
    });

    $rootScope.$on('SwitchCart', function() {
        CurrentOrder.Get()
            .then(function(order) {
                if(vm.$ocMedia('max-width:767px')) {
                    vm.openModal(order);
                } else {
                    vm.lineItemCall(order);
                }
            });
    });

    $rootScope.$on('OC:RemoveOrder', function() {//broadcast is in build > src > app > common > line items
        vm.Order = null;
        vm.LineItems = {};
        vm.TotalItems = 0;
    });

    vm.toggleDropdown = function($event) {
        // $event.preventDefault();
        // $event.stopPropagation();
        // $scope.status.isopen = !$scope.status.isopen;
        vm.showLineItems = true;
        if (vm.$ocMedia('max-width:767px')) {
            vm.goToCart();
        }
    };

    vm.openModal = function(order) {
        $uibModal.open({
            animation: true,
            size: 'lg',
            templateUrl: 'cart/templates/modalMinicart.tpl.html',
            controller: 'MinicartModalController',
            controllerAs: 'minicartModal',
            resolve: {
                LineItems: vm.lineItemCall(order),
                Currency: vm.currency,
                Order: vm.Order
            }
        });
    };
}

function OrderCloudMiniCartDirective() {
    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'cart/templates/minicart.tpl.html',
        controller: 'MiniCartCtrl',
        controllerAs: 'minicart'
    };
}

function MinicartModalController($state, $uibModalInstance, LineItems, Currency, Order) {
    var vm = this;
    vm.lineItems = LineItems;
    vm.lineItemsLength = vm.lineItems.length;
    vm.currency = Currency;
    vm.Order = Order;

    vm.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

    vm.goToCart = function() {
        $state.go('cart');
        $uibModalInstance.close();
    };

    vm.goToExpressCheckout = function() {
        $state.go('expressCheckout');
        $uibModalInstance.close();
    };

    vm.goToCheckout = function() {
        $state.go('checkout');
        $uibModalInstance.close();
    };
}


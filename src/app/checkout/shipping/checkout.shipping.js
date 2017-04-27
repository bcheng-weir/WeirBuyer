angular.module('orderCloud')
	.config(checkoutShippingConfig)
	.controller('CheckoutShippingCtrl', CheckoutShippingController)
    .factory('OrderShippingAddress', OrderShippingAddressFactory)
;

function checkoutShippingConfig($stateProvider) {
	$stateProvider
		.state('checkout.shipping', {
			url: '/shipping',
			templateUrl: 'checkout/shipping/templates/checkout.shipping.tpl.html',
			controller: 'CheckoutShippingCtrl',
			controllerAs: 'checkoutShipping'
		})
    ;
}

function CheckoutShippingController($state, $rootScope, OrderCloudSDK, OrderShippingAddress) {
	var vm = this;
    vm.saveAddress = null;
    vm.isAlsoBilling = null;
    vm.address = {};
    vm.SaveShippingAddress = saveShipAddress;
    vm.SaveCustomAddress = saveCustomAddress;
    vm.customShipping = false;
    vm.shippingAddress = null;

    function saveShipAddress(order) {
        if (order && order.ShippingAddressID) {
            OrderShippingAddress.Set(order.ShippingAddressID);
            OrderCloudSDK.Addresses.Get(order.ShippingAddressID)
                .then(function(address) {
	                OrderCloudSDK.Orders.Patch(order.ID, {ShippingAddressID: address.ID})
                        .then(function() {
                            $rootScope.$broadcast('OrderShippingAddressChanged', order, address);
                        });
                });
        }
    }

    function saveCustomAddress(order) {
        if (vm.saveAddress) {
	        OrderCloudSDK.Addresses.Create(vm.address)
                .then(function(address) {
	                OrderCloudSDK.Me.Get()
                        .then(function(me) {
	                        OrderCloudSDK.Addresses.SaveAssignment({
                                    AddressID: address.ID,
                                    UserID: me.ID,
                                    IsBilling: vm.isAlsoBilling,
                                    IsShipping: true
                                })
                                .then(function() {
	                                OrderCloudSDK.Addresses.Get(address.ID)
                                        .then(function(address) {
	                                        OrderCloudSDK.Orders.Patch(order.ID, {ShippingAddressID: address.ID})
                                                .then(function() {
                                                    $state.reload();
                                                });
                                        });
                                });
                        });
                });
        }
        else {
	        OrderCloudSDK.Orders.Patch(order.ID, {ShippingAddressID: vm.address.ID})
                .then(function() {
                    $state.reload();
                });
        }
    }
}

function OrderShippingAddressFactory($q, $localForage, OrderCloudSDK, appname) {
    var StorageName = appname + '.ShippingAddressID';
    return {
        Get: _get,
        Set: _set,
        Clear: _clear
    };

    function _get() {
        var dfd = $q.defer();
        $localForage.getItem(StorageName)
            .then(function(shipID) {
                if (shipID) {
	                OrderCloudSDK.Addresses.Get(shipID)
                        .then(function(address) {
                            if (!address.Items) {
                                dfd.resolve(address);
                            }
                            else dfd.reject();
                        })
                        .catch(function() {
                            _clear();
                            dfd.reject();
                        });
                }
                else dfd.reject();
            })
            .catch(function() {
                dfd.reject();
            });
        return dfd.promise;
    }

    function _set(ShipAddressID) {
        $localForage.setItem(StorageName, ShipAddressID);
    }

    function _clear() {
        $localForage.removeItem(StorageName);
    }
}

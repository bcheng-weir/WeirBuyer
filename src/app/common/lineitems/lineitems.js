angular.module('ordercloud-lineitems', [])
    .factory('LineItemHelpers', LineItemFactory)
    .controller('LineItemModalCtrl', LineItemModalController)
;

function LineItemFactory($rootScope, $q, $state, $uibModal, Underscore, OrderCloudSDK, CurrentOrder, Me) {
    return {
        SpecConvert: _specConvert,
        RemoveItem: _removeItem,
        UpdateQuantity: _updateQuantity,
        GetProductInfo: _getProductInfo,
	    GetBlankProductInfo: _getBlankProductInfo,
        CustomShipping: _customShipping,
        UpdateShipping: _updateShipping,
        ListAll: _listAll
    };

    function _specConvert(specs) {
        var results = [];
        angular.forEach(specs, function (spec) {
            var spec_to_push = {SpecID: spec.ID};
            if (spec.Options.length > 0) {
                if (spec.DefaultOptionID) {
                    spec_to_push.OptionID = spec.DefaultOptionID;
                }
                if (spec.OptionID) {
                    spec_to_push.OptionID = spec.OptionID;
                }
                if (spec.Value) {
                    spec_to_push.Value = spec.Value;
                }
            }
            else {
                spec_to_push.Value = spec.Value || spec.DefaultValue || null;
            }
            results.push(spec_to_push);
        });
        return results;
    }

    function _removeItem(Order, LineItem) {
	    OrderCloudSDK.LineItems.Delete("Outgoing", Order.ID, LineItem.ID)
            .then(function () {
                // If all line items are removed delete the order.
	            OrderCloudSDK.LineItems.List("Outgoing", Order.ID)
                    .then(function (data) {
                        if (!data.Items.length) {
                            CurrentOrder.Remove();
	                        OrderCloudSDK.Orders.Delete("Outgoing", Order.ID).then(function () {
                                $state.reload();
                                $rootScope.$broadcast('OC:RemoveOrder');
                            });
                        }
                        else {
                            $state.reload();
                        }
                    });
            });
    }

    function _updateQuantity(Order, LineItem) {
        if (LineItem.Quantity > 0) {
	        OrderCloudSDK.LineItems.Patch("Outgoing", Order.ID, LineItem.ID, {Quantity: LineItem.Quantity})
                .then(function () {
                    $rootScope.$broadcast('OC:UpdateOrder', Order.ID);
                    $rootScope.$broadcast('OC:UpdateLineItem',Order);
                });
        }
    }

    function _getProductInfo(LineItems) {
        var li = LineItems.Items || LineItems;
        var productIDs = Underscore.uniq(Underscore.pluck(li, 'ProductID'));
        var dfd = $q.defer();
        var queue = [];
        angular.forEach(productIDs, function (productid) {
            if(productid != "PLACEHOLDER") {
                queue.push(OrderCloudSDK.Me.GetProduct(productid));
            }
        });
        $q.all(queue)
            .then(function (results) {
                angular.forEach(li, function (item) {
                    if(item.ProductID != "PLACEHOLDER") {
                        item.Product = angular.copy(Underscore.where(results, {ID: item.ProductID})[0]);
                        item.xp.ProductName = typeof item.xp.ProductName === 'undefined' ? item.Product.Name: item.xp.ProductName;
                        item.xp.Description = typeof item.xp.Description === 'undefined' ? item.Product.Description : item.xp.Description;
                        item.xp.ReplacementSchedule = typeof item.xp.ReplacementSchedule === 'undefined' ? item.Product.xp.ReplacementSchedule : item.xp.ReplacementSchedule;
                        item.xp.LeadTime = typeof item.xp.LeadTime === 'undefined' ?  item.Product.xp.LeadTime: item.xp.LeadTime;
                    }
                });
                dfd.resolve(li);
            });
        return dfd.promise;
    }

	function _getBlankProductInfo(LineItems, Customer) {
		var li = LineItems || LineItems.Items;

		angular.forEach(li, function(item) {
			if(item.ProductID == "PLACEHOLDER") {
				item.Product = {
					"Name": item.xp.ProductName,
					"Description": item.xp.Description,
					"StandardPriceSchedule": {
						"xp": {
							"Currency":Customer.id.substring(0,5)=='WPIFR'?'EUR':'GBP'
						}
					}
				};
                item.xp.ProductName = typeof item.xp.ProductName === 'undefined' ? item.Product.Name: item.xp.ProductName;
                item.xp.Description = typeof item.xp.Description === 'undefined' ? item.Product.Description : item.xp.Description;
                item.xp.ReplacementSchedule = typeof item.xp.ReplacementSchedule === 'undefined' ? item.Product.xp.ReplacementSchedule : item.xp.ReplacementSchedule;
                item.xp.LeadTime = typeof item.xp.LeadTime === 'undefined' ?  item.Product.xp.LeadTime: item.xp.LeadTime;
                item.xp.TagNumber = typeof item.xp.TagNumber === 'undefined' ? "" : item.xp.TagNumber;
                item.xp.SN = typeof item.xp.SN === 'undefined' ? "" : item.xp.SN;
			}
		});

		return li;
	}

    function _customShipping(Order, LineItem) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'common/lineitems/templates/shipping.tpl.html',
            controller: 'LineItemModalCtrl',
            controllerAs: 'liModal',
            size: 'lg'
        });

        modalInstance.result
            .then(function (address) {
                address.ID = Math.floor(Math.random() * 1000000).toString();
	            OrderCloudSDK.LineItems.SetShippingAddress("Outgoing", Order.ID, LineItem.ID, address)
                    .then(function () {
                        $rootScope.$broadcast('LineItemAddressUpdated', LineItem.ID, address);
                    });
            });
    }

    function _updateShipping(Order, LineItem, AddressID) {
	    OrderCloudSDK.Addresses.Get(AddressID)
            .then(function (address) {
	            OrderCloudSDK.LineItems.SetShippingAddress("Outgoing", Order.ID, LineItem.ID, address);
                $rootScope.$broadcast('LineItemAddressUpdated', LineItem.ID, address);
            });
    }

    function _listAll(orderID) {
        var li;
        var dfd = $q.defer();
        var queue = [];
	    OrderCloudSDK.LineItems.List("Outgoing", orderID, { 'page':1, 'pageSize': 100 })
            .then(function (data) {
                li = data;
                if (data.Meta.TotalPages > data.Meta.Page) {
                    var page = data.Meta.Page;
                    while (page < data.Meta.TotalPages) {
                        page += 1;
                        queue.push(OrderCloudSDK.LineItems.List("Outgoing", orderID, { 'page':page, 'pageSize':100 }));
                    }
                }
                $q.all(queue)
                    .then(function (results) {
                        angular.forEach(results, function (result) {
                            li.Items = [].concat(li.Items, result.Items);
                            li.Meta = result.Meta;
                        });
                        dfd.resolve(li.Items);
                    });
            });
        return dfd.promise;
    }
}

function LineItemModalController($uibModalInstance) {
    var vm = this;
    vm.address = {};

    vm.submit = function () {
        $uibModalInstance.close(vm.address);
    };

    vm.cancel = function () {
        vm.address = {};
        $uibModalInstance.dismiss('cancel');
    };
}

angular.module('orderCloud')
    .factory( 'QuoteShareService', QuoteShareService)
	.config(MyQuoteConfig)
	.controller('MyQuoteCtrl', MyQuoteController)
	.controller('MyQuoteDetailCtrl', MyQuoteDetailController)
	.controller('QuoteDeliveryOptionCtrl', QuoteDeliveryOptionController )
	.controller('ReviewQuoteCtrl', ReviewQuoteController )
	.controller('ConfirmQuoteCtrl', ConfirmQuoteController )
	.controller('ModalInstanceCtrl', ModalInstanceController)
	.controller('MoreQuoteInfoCtrl', MoreQuoteInfoController)
	.controller('NewAddressModalCtrl', NewAddressModalController)
;

function QuoteShareService() {
    var svc = {
	    LineItems: []
    };
    return svc;
}

function MyQuoteConfig($stateProvider,buyerid) {
	$stateProvider
		.state('myquote', {
			parent: 'base',
			url: '/myquote',
			templateUrl: 'myquote/templates/myquote.tpl.html',
			controller: 'MyQuoteCtrl',
			controllerAs: 'myquote',
			resolve: {
				Quote: function(CurrentOrder) {
					return CurrentOrder.Get();
				},
				Customer: function(CurrentOrder) {
				    return CurrentOrder.GetCurrentCustomer();
				},
                LineItems: function($q, $state, toastr, Underscore, CurrentOrder, OrderCloud, LineItemHelpers, QuoteShareService) {
                    QuoteShareService.LineItems.length = 0;
                    var dfd = $q.defer();
				    CurrentOrder.GetID()
                        .then(function(id) {
                            OrderCloud.LineItems.List(id)
                                .then(function(data) {
                                    if (!data.Items.length) {
										toastr.error('Your quote does not contain any line items.', 'Error');
                                        dfd.resolve({Items: []});
                                    } else {
                                        LineItemHelpers.GetProductInfo(data.Items)
                                            .then(function() { dfd.resolve(data); });
                                    }
                                })
                            })
                        .catch(function() {
							toastr.error('Your quote does not contain any line items.', 'Error');
							dfd.resolve({ Items: [] });
                        });
                    return dfd.promise;
				}
			}
		})
		.state( 'myquote.detail', {
			url: '/detail',
			templateUrl: 'myquote/templates/myquote.detail.tpl.html',
			controller: 'MyQuoteDetailCtrl',
			controllerAs: 'detail'
		})
		.state( 'myquote.delivery', {
			url: '/delivery',
			templateUrl: 'myquote/templates/myquote.delivery.tpl.html',
			controller: 'QuoteDeliveryOptionCtrl',
			controllerAs: 'delivery',
			resolve: {
				Addresses: function(OrderCloud) {
					return OrderCloud.Addresses.List(null,null,null,null,null,null,buyerid);
				}
			}
		})
		.state( 'myquote.review', {
			url: '/review',
		        templateUrl: 'myquote/templates/myquote.review.tpl.html',
			controller: 'ReviewQuoteCtrl',
			controllerAs: 'review'
		})
		.state( 'myquote.confirm', {
			url: '/confirm',
			templateUrl: 'myquote/templates/myquote.confirm.tpl.html',
			controller: 'ConfirmQuoteCtrl',
			controllerAs: 'confirm'
		})
	;
}

function MyQuoteController($sce, $state, $document, $uibModal, toastr, WeirService, Quote, Customer, LineItems, QuoteShareService) {
	var vm = this;
	vm.Quote = Quote;
	vm.Customer = Customer;
	vm.SaveableStatuses = [
		WeirService.OrderStatus.Draft.id,
		WeirService.OrderStatus.Saved.id,
		WeirService.OrderStatus.Shared.id
	];
	QuoteShareService.LineItems.push.apply(QuoteShareService.LineItems, LineItems.Items);
	vm.HasLineItems = function() {
	    return (QuoteShareService.LineItems && QuoteShareService.LineItems.length);
	};

	function save() {
		if (vm.Quote.xp.Status == WeirService.OrderStatus.Draft.id) {
		    // TODO: FAIL if no line items
		}
		var mods = {
		    Comments: vm.Quote.Comments,
		    xp: {
		        StatusDate: new Date(),
			RefNum: vm.Quote.xp.RefNum,
			Name: vm.Quote.xp.Name
		    }
		};
		var assignQuoteNumber = false;

		if (vm.Quote.xp.Status == WeirService.OrderStatus.Draft.id) {
		    mods.xp.Status = WeirService.OrderStatus.Saved.id;
		    assignQuoteNumber = true;
		}

		WeirService.UpdateQuote(vm.Quote.ID, mods, assignQuoteNumber, vm.Customer.id)
			.then(function(quote) {
			    vm.Quote = quote;
			    toastr.success(vm.labels.SaveSuccessMessage, vm.labels.SaveSuccessTitle);
				// TODO Dave - Make this call the new modalNotice directive.
				var modalInstance = $uibModal.open({
					animation: true,
					ariaLabelledBy: 'modal-title',
					ariaDescribedBy: 'modal-body',
					templateUrl: 'modalConfirmation.html',
					controller: 'ModalInstanceCtrl',
					controllerAs: 'myQuote',
					resolve: {
						quote: function() {
							return vm.Quote;
						},
						labels: function() {
							return vm.labels;
						}
					}
				});
				modalInstance.result;
			});
	}
	function gotoDelivery() {
		if (vm.Quote.Comments && vm.Quote.xp.RefNum && vm.Quote.xp.RefDocs && vm.Quote.xp.RefDocs.length) {
            $state.go("myquote.delivery");
		} else {
            var modalInstance = $uibModal.open({
                animation: true,
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: 'myquote/templates/myquote.missingdetail.tpl.html',
                controller: 'MoreQuoteInfoCtrl',
                controllerAs: 'moreInfo',
				size: 'sm',
                resolve: {
                    quote: function() {
                        return vm.Quote;
                    }
                }
            });
            modalInstance.result;
		}
	}
	function noItemsMessage() {
        toastr.error(vm.labels.NoItemsError);
	}
	function cannotContinueNoItemsMessage() {
		toastr.error(vm.labels.CannotContinueNoItems);
	}
	function share() {
		alert("TODO: Implement share quote");
	}
	function download() {
		alert("TODO: Implement download quote");
	}
	function print() {
		alert("TODO: Implement print quote");
	}

	var labels = {
		en: {
			YourQuote: "Your Quote",
			DeliveryOptions: "Delivery Options",
			ReviewQuote: "Review Quote",
			ConfirmOrder: "Confirm Order",
			Save: "Save",
			Share: "Share",
			Download: "Download",
			Print: "Print",
            SaveSuccessTitle: "Quote Saved",
            SaveSuccessMessage: "Your changes have been saved",
			NoItemsError: "Please add parts to quote before saving",
			CannotContinueNoItems: "Please add parts to quote before continuing",
			SaveBody: "Quote number " + vm.Quote.ID + " has been saved to Your Quotes.",
			SaveFooter: "View Your Quotes"
		},
		fr: {
			YourQuote: $sce.trustAsHtml("FR: Your Quote"),
			DeliveryOptions: $sce.trustAsHtml("FR: Delivert Options"),
			ReviewQuote: $sce.trustAsHtml("FR: Review Quote"),
			ConfirmOrder: $sce.trustAsHtml("FR: Confirm Order"),
			Save: $sce.trustAsHtml("FR: Save"),
			Share: $sce.trustAsHtml("FR: Share"),
			Download: $sce.trustAsHtml("FR: Download"),
			Print: $sce.trustAsHtml("FR: Print"),
            SaveSuccessTitle: $sce.trustAsHtml("FR: Quote Saved"),
            SaveSuccessMessage: $sce.trustAsHtml("FR: Your changes have been saved"),
			NoItemsError: $sce.trustAsHtml("FR: Please add parts to quote before saving"),
			CannotContinueNoItems: $sce.trustAsHtml("FR: Please add parts to quote before continuing"),
			SaveBody: $sce.trustAsHtml("FR: Quote number " + vm.Quote.ID + " has been saved to Your Quotes."),
			SaveFooter: $sce.trustAsHtml("FR: View Your Quotes")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
	vm.GotoDelivery = gotoDelivery;
	vm.Save = save;
	vm.NoItemsMessage = noItemsMessage;
	vm.CannotContinueNoItemsMessage = cannotContinueNoItemsMessage;
	vm.Share = share;
	vm.Download = download;
	vm.Print = print;
}

function MyQuoteDetailController(WeirService, $state, $sce, $exceptionHandler, $rootScope, buyerid, OrderCloud, QuoteShareService) {
	var vm = this;
	vm.LineItems = QuoteShareService.LineItems;
	
	var labels = {
		en: {
            Customer: "Customer; ",
            QuoteNumber: "Quote number ",
            QuoteName: "Quote name ",
            AddNew: "Add new items",
            SerialNum: "Serial number",
            TagNum: "Tag number (if available)",
            PartNum: "Part number",
            PartDesc: "Description of part",
            RecRepl: "Recommended replacement",
            LeadTime: "Lead time",
            PricePer: "Price per item or set",
            Quantity: "Quantity",
            Total: "Total",
            UploadHeader: "Upload your service or operating condition document",
            UploadInstruct: "Please upload any supporting documentation you have for valves  or spares requested so we can ensure use these for reference for this quote.",
            RefNumHeader: "Add your reference number for this quote",
            CommentsHeader: "Your comments or instructions",
            CommentsInstr: "Please add any specific comments or instructions for this quote",
		    DeliveryOptions: "Delivery Options",
			Update: "Update",
			DragAndDrop: "Drag and drop files here to upload"
		},
		fr: {
			Customer: $sce.trustAsHtml("FR: Customer"),
            QuoteNumber: $sce.trustAsHtml("FR: Quote number"),
            QuoteName: $sce.trustAsHtml("Quote name "),
            AddNew: $sce.trustAsHtml("FR: Add new items"),
            SerialNum: $sce.trustAsHtml("FR: Serial number"),
            TagNum: $sce.trustAsHtml("FR: Tag number (if available)"),
            PartNum: $sce.trustAsHtml("FR: Part number"),
            PartDesc: $sce.trustAsHtml("FR: Description of part"),
            RecRepl: $sce.trustAsHtml("FR: Recommended replacement"),
            LeadTime: $sce.trustAsHtml("FR: Lead time"),
            PricePer: $sce.trustAsHtml("FR: Price per item or set"),
            Quantity: $sce.trustAsHtml("FR: Quantity"),
            Total: $sce.trustAsHtml("FR: Total"),
            UploadHeader: $sce.trustAsHtml("FR: Upload your service or operating condition document"),
            UploadInstruct: $sce.trustAsHtml("FR: Please upload any supporting documentation you have for valves  or spares requested so we can ensure use these for reference for this quote."),
            RefNumHeader: $sce.trustAsHtml("FR: Add your reference number for this quote"),
            CommentsHeader: $sce.trustAsHtml("FR: Your comments or instructions"),
            CommentsInstr: $sce.trustAsHtml("FR: Please add any specific comments or instructions for this quote"),
		    DeliveryOptions: $sce.trustAsHtml("FR: Delivery Options"),
			Update: $sce.trustAsHtml("FR: Mettre à jour"),
			DragAndDrop: $sce.trustAsHtml("FR: Drag and drop files here to upload")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);

	vm.deleteLineItem = _deleteLineItem;
	function _deleteLineItem(quoteNumber, itemid) {
		OrderCloud.LineItems.Delete(quoteNumber, itemid, buyerid)
			.then(function() {
				// Testing. Should make another event for clarity. At this time I believe it just updates the cart items.
				$rootScope.$broadcast('LineItemAddedToCart', quoteNumber, itemid); //This kicks off an event in cart.js
			})
			.then(function() {
				$state.reload($state.current);
			})
			.catch(function(ex){
				$exceptionHandler(ex);
			});
	}

	vm.updateLineItem = _updateLineItem;
	function _updateLineItem(quoteNumber, item) {
		OrderCloud.LineItems.Update(quoteNumber,item.ID,item,buyerid)
			.then(function(resp) {
				$rootScope.$broadcast('LineItemAddedToCart', quoteNumber, resp.ID);
			})
			.then(function() {
				$state.reload($state.current);
			})
			.catch(function(ex) {
				$exceptionHandler(ex);
			});
	}

}

function QuoteDeliveryOptionController($uibModal, WeirService, $state, $sce, $scope, $exceptionHandler, Underscore, toastr, Addresses, OrderCloud, buyerid) {
	var vm = this;
	var activeAddress = function(address) { return !address.xp.inactive; };
	vm.addresses = Underscore.sortBy(Addresses.Items, function(address) {
		return address.xp.primary;
	}).filter(activeAddress).reverse();
	vm.customShipping = false;

	var labels = {
		en: {
			DefaultAddress: "Your default address",
			AddNew: "Add a new address",
			DeliveryType: "Delivery type",
			DeliverHere: "Deliver to this address",
			ReviewQuote: "Review quote",
			BackToQuote: "Back to your quote"
		},
		fr: {
			DefaultAddress: $sce.trustAsHtml("FR: Your default address"),
			AddNew: $sce.trustAsHtml("FR: Add a new address"),
			DeliveryType: $sce.trustAsHtml("FR: Delivery type"),
			DeliverHere: $sce.trustAsHtml("FR: Deliver to this address"),
			ReviewQuote: $sce.trustAsHtml("FR: Review quote"),
			BackToQuote: $sce.trustAsHtml("FR: Back to your quote")
		}
	};

	// We do this so we can display the addresses in a two column table.
	vm.ChunkedData = _chunkData(vm.addresses,2);
	function _chunkData(arr,size) {
		var newArray = [];
		for(var i=0;i<arr.length;i+=size) {
			newArray.push(arr.slice(i,i+size));
		}
		return newArray;
	}

	vm.setShippingAddress = _setShippingAddress;
	function _setShippingAddress(QuoteID, Address) {
		OrderCloud.Orders.SetShippingAddress(QuoteID, Address, buyerid)
			.then(function(order) {
				$state.go($state.current, {}, {reload: true});
				toastr.success("Shipping address set to " + order.ShippingAddressID,"Shipping Address Set");
			})
			.catch(function(ex) {
				$exceptionHandler(ex);
			});
	}

	vm.SaveCustomAddress = _saveCustomAddress;
	function _saveCustomAddress() { return true; }

	vm.CustomShipping = _customShipping;
	function _customShipping(QuoteID) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: 'newAddress.html',
			controller: 'NewAddressModalCtrl',
			controllerAs: 'NewAddressModal',
			size: 'lg'
		});

		modalInstance.result
			.then(function (address) {
				return OrderCloud.Addresses.Create(address, buyerid);
			})
			.then(function(newAddress) {
				return OrderCloud.Orders.SetShippingAddress(QuoteID, newAddress, buyerid);
			})
			.then(function(order) {
				$state.go($state.current, {}, {reload: true});
				toastr.success("Shipping address set to " + order.ShippingAddressID,"Shipping Address Set");
			})
			.catch(function(ex) {
				if(ex !== 'cancel') {
					$exceptionHandler(ex);
				}
			});
	}

	vm.labels = WeirService.LocaleResources(labels);
}

function ReviewQuoteController(WeirService, $state, $sce) {
	var vm = this;
	var labels = {
		en: {
		},
		fr: {
		}
	};
}

function ConfirmQuoteController(WeirService, $state, $sce) {
	var vm = this;
	var labels = {
		en: {
		},
		fr: {
		}
	};
}

function ModalInstanceController($uibModalInstance, $state, quote, labels) {
	var vm = this;
	vm.quote = quote;
	vm.labels = labels;
	vm.ok = function(navigatePage) {
		if(navigatePage) {
			$uibModalInstance.close();
			$state.go("quotes.saved");
		}
		else {
			$uibModalInstance.close();
		}
	}
}

function MoreQuoteInfoController($uibModalInstance, $state, $sce, WeirService, quote) {
    var vm = this;
    vm.Cancel = cancel;
    vm.Continue = gotoDelivery;

	var vm = this;
	var labels = {
		en: {
		    Title: "You can add more information to this quote;",
		    Documents: "add service documentation",
		    RefNum: "add your references",
		    Comments: "add comments to your quote",
		    Continue: "continue to delivery options"
		},
		fr: {
			Title: $sce.trustAsHtml("FR: You can add more information to this quote;"),
		    Documents: $sce.trustAsHtml("FR: add service documentation"),
		    RefNum: $sce.trustAsHtml("FR: add your references"),
		    Comments: $sce.trustAsHtml("FR: add comments to your quote"),
		    Continue: $sce.trustAsHtml("continue to delivery options")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);

    function gotoDelivery() {
		$uibModalInstance.close();
        $state.go("myquote.delivery");
    }
    function cancel() {
		$uibModalInstance.close();
    }
}

function NewAddressModalController($uibModalInstance) {
	var vm = this;
	vm.address = {};
	vm.address.xp = {};
	vm.address.xp.inactive = false;
	vm.address.xp.primary = false;

	vm.submit = function () {
		$uibModalInstance.close(vm.address);
	};

	vm.cancel = function () {
		vm.address = {};
		$uibModalInstance.dismiss('cancel');
	};
}
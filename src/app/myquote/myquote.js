angular.module('orderCloud')
    .service( 'QuoteShareService', QuoteShareService)
    .service('QuoteHelperService', QuoteHelperService)
	.service('QuoteCommentsService', QuoteCommentsService)
    .config(MyQuoteConfig)
	.controller('MyQuoteCtrl', MyQuoteController)
	.controller('MyQuoteDetailCtrl', MyQuoteDetailController)
	.controller('QuoteDeliveryOptionCtrl', QuoteDeliveryOptionController )
	.controller('ReviewQuoteCtrl', ReviewQuoteController)
	.controller('RevisedQuoteCtrl', RevisedQuoteController)
	.controller('ReadonlyQuoteCtrl', ReadonlyQuoteController)
	.controller('QuoteRevisionsCtrl', QuoteRevisionsController)
	.controller('ModalInstanceCtrl', ModalInstanceController)
	.controller('MoreQuoteInfoCtrl', MoreQuoteInfoController)
	.controller('NewAddressModalCtrl', NewAddressModalController)
	.controller('SubmitConfirmCtrl', SubmitConfirmController)
	.controller('SubmitConfirmOrderCtrl', SubmitConfirmOrderController)
	.controller('ChooseSubmitCtrl', ChooseSubmitController)
	.controller('SubmitCtrl',SubmitController)
    .controller('TermsAndConditionsCtrl', TermsAndConditionsController)
	.controller('CarriageModalCtrl', MissingCarriageDetailController)
;

function QuoteShareService() {
    var svc = {
        LineItems: [],
        Payments: [],
	    Comments: [],
	    Quote: null,
	    Me: null,
	    UiTotal: null,
	    ShippingAddress: null,
	    IsPOA: _isPOA
    };

    function _isPOA() {
    	var poa = false;
    	angular.forEach(svc.LineItems, function(value, key) {
    		if(value.LineTotal == 0) {
    			poa = true;
		    }
	    });
	    return poa;
    }
    return svc;
}

function QuoteHelperService($q, OrderCloudSDK) {
    function findRevisions(quoteID) {
        var filter = {
                "xp.OriginalOrderID": quoteID
        };
        return OrderCloudSDK.Orders.List("Outgoing",{ 'page':1, 'pageSize':100, 'sortBy':"DateCreated", 'filters':filter });
    }

    var service = {
        FindQuoteRevisions: findRevisions
    };
    return service;
}

function QuoteCommentsService(OrderCloudSDK, QuoteShareService, Me, $q) {
	var service = {
		AddComment: _addComment
	};

	function _addComment(commentText) {
		var dfd = $q.defer();
		var comment = {
			date: new Date(),
			by: Me.Profile.FirstName + " " + Me.Profile.LastName,
			val: commentText,
			IsWeirComment: false
		};

		// Take the new comment, push it onto the current comments to weir then patch.
		if (!QuoteShareService.Quote.xp.CommentsToWeir || Object.prototype.toString.call(QuoteShareService.Quote.xp.CommentsToWeir) !== '[object Array]') {
			QuoteShareService.Quote.xp.CommentsToWeir = [];
		}
		QuoteShareService.Quote.xp.CommentsToWeir.push(comment);
		OrderCloudSDK.Orders.Patch("Outgoing", QuoteShareService.Quote.ID, {xp: {CommentsToWeir: QuoteShareService.Quote.xp.CommentsToWeir}})
			.then(function (quote) {
				QuoteShareService.Quote = quote;
				QuoteShareService.Comments = quote.xp.CommentsToWeir;
				dfd.resolve(quote);
			})
			.catch(function(ex) {
				dfd.resolve(ex);
			});
		return dfd.promise;
	}

	return service;
}

function MyQuoteConfig($stateProvider) {
	$stateProvider
		.state('myquote.termsandconditions',{
			url: 'termsandconditions',
            templateUrl: 'myquote/templates/termsandconditions.tpl.html',
            controller: 'TermsAndConditionsCtrl',
            controllerAs: 'termsAndCondition'
        })
		.state('myquote', {
		    parent: 'base',
		    url: '/myquote',
		    templateUrl: 'myquote/templates/myquote.tpl.html',
		    controller: 'MyQuoteCtrl',
		    controllerAs: 'myquote',
		    resolve: {
			    Customer: function (CurrentOrder) {
				    return CurrentOrder.GetCurrentCustomer();
			    },
		        Quote: function (CurrentOrder) {
		            return CurrentOrder.Get();
		        },
		        ShippingAddress: function (Quote, OrderCloudSDK, Me) {
		            if (Quote.ShippingAddressID) return OrderCloudSDK.Addresses.Get(Me.GetBuyerID(), Quote.ShippingAddressID);
		            return null;
		        },
		        LineItems: function ($q, $state, toastr, Underscore, WeirService, CurrentOrder, OrderCloudSDK, LineItemHelpers, QuoteShareService, Customer, Me) {
		            QuoteShareService.LineItems.length = 0;
                    var errorMsg = "";
                    var errorTitle= "";
                    if(WeirService.Locale() == "fr"){
                        errorMsg = "Votre cotation ne contient aucune ligne";
                        errorTitle = "Erreur";
                    }
                    else{
                        errorMsg = "Your quote does not contain any line items";
                        errorTitle = "Error";
                    }
		            var dfd = $q.defer();
		            CurrentOrder.GetID()
                        .then(function (id) {
	                        OrderCloudSDK.LineItems.List("Outgoing",id, { 'page':1, 'pageSize':100 })
                                .then(function (data) {
                                    if (!data.Items.length) {
                                        toastr.error(errorMsg , errorTitle);
                                        dfd.resolve({ Items: [] });
                                    } else {
	                                    LineItemHelpers.GetBlankProductInfo(data.Items, Customer);
                                        LineItemHelpers.GetProductInfo(data.Items)
                                            .then(function () { dfd.resolve(data); });
                                    }
                                })
		                        .catch(function(ex) {
		                        	toastr.error('List Line Items failed.','Error');
			                        dfd.resolve({ Items: [] });
		                        });
                        })
                        .catch(function (ex) {
                            toastr.error(errorMsg , errorTitle);
                            dfd.resolve({ Items: [] });
                        });
		            return dfd.promise;
		        },
			    PreviousLineItems: function($q, toastr, OrderCloudSDK, Quote, LineItemHelpers, Customer, WeirService, Me) {
				    // We can't have a quantity of 0 on a line item. With show previous line items
				    // Split the current order ID. If a rec exists, get, else do nothing.
				    var pieces = Quote.ID.split('-Rev');
                    var errorMsg = "";
                    var errorTitle= "";
                    if(WeirService.Locale() == "fr"){
                        errorMsg = "La cotation précédente ne contient aucune ligne";
                        errorTitle = "Erreur";
                    }
                    else{
                        errorMsg = "Previous quote does not contain any line items";
                        errorTitle = "Error";
                    }
				    if(pieces.length > 1) {
					    var prevId = pieces[0] + "-Rev" + (pieces[1] - 1).toString();
					    var dfd = $q.defer();
					    OrderCloudSDK.LineItems.List("Outgoing", prevId,{ 'page':1, 'pageSize':100 })
						    .then(function(data) {
							    if (!data.Items.length) {
								    dfd.resolve({ Items: [] });
							    } else {
								    LineItemHelpers.GetBlankProductInfo(data.Items, Customer);
								    LineItemHelpers.GetProductInfo(data.Items)
									    .then(function () { dfd.resolve(data); });
							    }
						    })
						    .catch(function () {
							    toastr.error(errorMsg, errorTitle);
							    dfd.resolve({ Items: [] });
						    });
					    return dfd.promise;
				    } else {
					    return null;
				    }
			    },
		        Payments: function (Quote, OrderCloudSDK, Me) {
		            return OrderCloudSDK.Payments.List("Outgoing",Quote.ID,{ 'page':1, 'pageSize':100 });
		        },
		        IsBuyer: function (UserGroupsService) {
                    return UserGroupsService.IsUserInGroup([UserGroupsService.Groups.Buyers])
		        },
		        IsShopper: function (UserGroupsService) {
		            return UserGroupsService.IsUserInGroup([UserGroupsService.Groups.Shoppers])
		        },
				Catalog:  function (OrderCloudSDK, Me) {
                    return OrderCloudSDK.Catalogs.Get(Me.Org.xp.WeirGroup.label);
                },
                Buyer : function(OrderCloudSDK, Me){
					return OrderCloudSDK.Buyers.Get(Me.GetBuyerID());
                },
                UITotal: function(Catalog, Buyer, Quote) {
	                var rateToUse = 0;
                	if (Catalog.xp) {
		                rateToUse = Buyer.xp.UseCustomCarriageRate == true ? Buyer.xp.CustomCarriageRate : Catalog.xp.StandardCarriage;
	                }
                    if(Quote.xp.CarriageRateType == 'standard'){
                        return (rateToUse + Quote.Subtotal).toFixed(2);
                    }
                    else{
                        return Quote.Subtotal.toFixed(2);
                    }
                }
		    }
		})
		.state('myquote.detail', {
			url: '/detail',
			templateUrl: 'myquote/templates/myquote.detail.tpl.html',
			controller: 'MyQuoteDetailCtrl',
			controllerAs: 'detail'
		})
		.state('myquote.delivery', {
			url: '/delivery',
			templateUrl: 'myquote/templates/myquote.delivery.tpl.html',
			controller: 'QuoteDeliveryOptionCtrl',
			controllerAs: 'delivery',
			resolve: {
				Addresses: function(OrderCloudSDK, Me) {
					return OrderCloudSDK.Addresses.List(Me.GetBuyerID());
				}
			}
		})
		.state('myquote.review', {
			url: '/review',
			templateUrl: 'myquote/templates/myquote.review.tpl.html',
			controller: 'ReviewQuoteCtrl',
			controllerAs: 'review'
		})
		.state('myquote.submitquote', {
			url: '/submitquote',
			templateUrl: 'myquote/templates/myquote.review.tpl.html',
			controller: 'ReviewQuoteCtrl',
			controllerAs: 'review'
		})
		.state('myquote.submitorder', {
			url: '/submitorder',
			templateUrl: 'myquote/templates/myquote.review.tpl.html',
			controller: 'ReviewQuoteCtrl',
			controllerAs: 'review'
		})
		.state('revisions', {
		    parent: 'base',
		    url: '/revisions?quoteID',
		    templateUrl: 'myquote/templates/myquote.revisions.tpl.html',
		    controller: 'QuoteRevisionsCtrl',
		    controllerAs: 'revisions',
		    resolve: {
		        Revisions: function ($stateParams, QuoteHelperService) {
		            return QuoteHelperService.FindQuoteRevisions($stateParams.quoteID);
		        },
		        QuoteID: function($stateParams) {
		            return $stateParams.quoteID;
		        }
		    }
		})
		.state('revised', {
			parent: 'base',
			url: '/revised?quoteID&buyerID',
			templateUrl: 'myquote/templates/myquote.revised.tpl.html',
			controller: 'RevisedQuoteCtrl',
			controllerAs: 'revised',
			resolve: {
				Quote: function ($stateParams, OrderCloudSDK) {
					return OrderCloudSDK.Orders.Get("Outgoing", $stateParams.quoteID);
				},
				ShippingAddress: function (Quote, OrderCloudSDK, Me) {
					if (Quote.ShippingAddressID) return OrderCloudSDK.Addresses.Get(Me.GetBuyerID(), Quote.ShippingAddressID);
					return null;
				},
				LineItems: function ($q, toastr, OrderCloudSDK, LineItemHelpers, Quote, Me, WeirService) {
					//QuoteShareService.LineItems.length = 0;
                    var errorMsg = "";
                    var errorTitle= "";
                    if(WeirService.Locale() == "fr"){
                        errorMsg = "Votre cotation ne contient aucune ligne";
                        errorTitle = "Erreur";
                    }
                    else{
                        errorMsg = "Your quote does not contain any line items";
                        errorTitle = "Error";
                    }
					var dfd = $q.defer();
					OrderCloudSDK.LineItems.List("Outgoing", Quote.ID)
						.then(function (data) {
							if (!data.Items.length) {
								toastr.error(errorMsg, errorTitle);
								dfd.resolve({ Items: [] });
							} else {
								LineItemHelpers.GetBlankProductInfo(data.Items,{"id":Me.Org.ID});
								LineItemHelpers.GetProductInfo(data.Items)
									.then(function () { dfd.resolve(data); });
							}
						})
						.catch(function () {
							toastr.error(errorMsg, errorTitle);
							dfd.resolve({ Items: [] });
						});
					return dfd.promise;
				},
				PreviousLineItems: function($q, toastr, OrderCloudSDK, Quote, LineItemHelpers, Me, WeirService) {
					// We can't have a quantity of 0 on a line item. With show previous line items
					// Split the current order ID. If a rec exists, get, else do nothing.
                    var errorMsg = "";
                    var errorTitle= "";
                    if(WeirService.Locale() == "fr"){
                        errorMsg = "La cotation précédente ne contient aucune ligne";
                        errorTitle = "Erreur";
                    }
                    else{
                        errorMsg = "Previous quote does not contain any line items";
                        errorTitle = "Error";
                    }
					var pieces = Quote.ID.split('-Rev');
					if(pieces.length > 1) {
						var prevId = pieces[0] + "-Rev" + (pieces[1] - 1).toString();
						var dfd = $q.defer();
						OrderCloudSDK.LineItems.List("Outgoing", prevId)
							.then(function(data) {
								if (!data.Items.length) {
									toastr.error(errorMsg, errorTitle);
									dfd.resolve({ Items: [] });
								} else {
									LineItemHelpers.GetBlankProductInfo(data.Items,{"id":Me.Org.ID});
									LineItemHelpers.GetProductInfo(data.Items)
										.then(function () { dfd.resolve(data); });
								}
							})
							.catch(function () {
								dfd.resolve({ Items: [] });
							});
						return dfd.promise;
					} else {
						return null;
					}
				},
				Payments: function ($stateParams, OrderCloudSDK) {
					return OrderCloudSDK.Payments.List("Outgoing", $stateParams.quoteID);
				},
				Catalog:  function (OrderCloudSDK, Me) {
					return OrderCloudSDK.Catalogs.Get(Me.Org.xp.WeirGroup.label);
				},
                Buyer : function(OrderCloudSDK, Me){
                    return OrderCloudSDK.Buyers.Get(Me.GetBuyerID());
                }
			}
		})
		.state('readonly', {
			parent: 'base',
		    url: '/readonly?quoteID&buyerID',
		    templateUrl: 'myquote/templates/myquote.readonly.tpl.html',
		    controller: 'ReadonlyQuoteCtrl',
		    controllerAs: 'readonly',
			resolve: {
				Quote: function ($stateParams, OrderCloudSDK) {
					return OrderCloudSDK.Orders.Get("Outgoing", $stateParams.quoteID);
				},
				ShippingAddress: function (Quote, OrderCloudSDK, Me) {
					if (Quote.ShippingAddressID) return OrderCloudSDK.Addresses.Get(Me.GetBuyerID(), Quote.ShippingAddressID);
					return null;
				},
				LineItems: function ($q, toastr, OrderCloudSDK, LineItemHelpers, Quote, Me, WeirService) {
					//QuoteShareService.LineItems.length = 0;
					var errorMsg = "";
					var errorTitle= "";
					if(WeirService.Locale() == "fr"){
						errorMsg = "Votre cotation ne contient aucune ligne";
						errorTitle = "Erreur";
					}
					else{
						errorMsg = "Your quote does not contain any line items";
						errorTitle = "Error";
					}
					var dfd = $q.defer();
					OrderCloudSDK.LineItems.List("Outgoing", Quote.ID)
						.then(function (data) {
							if (!data.Items.length) {
								toastr.error(errorMsg, errorTitle);
								dfd.resolve({ Items: [] });
							} else {
								LineItemHelpers.GetBlankProductInfo(data.Items,{"id":Me.Org.ID});
								LineItemHelpers.GetProductInfo(data.Items)
									.then(function () { dfd.resolve(data); });
							}
						})
						.catch(function () {
							toastr.error(errorMsg, errorTitle);
							dfd.resolve({ Items: [] });
						});
					return dfd.promise;
				},
				PreviousLineItems: function($q, toastr, OrderCloudSDK, Quote, LineItemHelpers, Me, WeirService) {
					// We can't have a quantity of 0 on a line item. With show previous line items
					// Split the current order ID. If a rec exists, get, else do nothing.
					var errorMsg = "";
					var errorTitle= "";
					if(WeirService.Locale() == "fr"){
						errorMsg = "La cotation précédente ne contient aucune ligne";
						errorTitle = "Erreur";
					}
					else{
						errorMsg = "Previous quote does not contain any line items";
						errorTitle = "Error";
					}
					var pieces = Quote.ID.split('-Rev');
					if(pieces.length > 1) {
						var prevId = pieces[0] + "-Rev" + (pieces[1] - 1).toString();
						var dfd = $q.defer();
						OrderCloudSDK.LineItems.List("Outgoing", prevId)
							.then(function(data) {
								if (!data.Items.length) {
									toastr.error(errorMsg, errorTitle);
									dfd.resolve({ Items: [] });
								} else {
									LineItemHelpers.GetBlankProductInfo(data.Items,{"id":Me.Org.ID});
									LineItemHelpers.GetProductInfo(data.Items)
										.then(function () { dfd.resolve(data); });
								}
							})
							.catch(function () {
								dfd.resolve({ Items: [] });
							});
						return dfd.promise;
					} else {
						return null;
					}
				},
				Payments: function ($stateParams, OrderCloudSDK) {
					return OrderCloudSDK.Payments.List("Outgoing", $stateParams.quoteID);
				},
				Catalog:  function (OrderCloudSDK, Me) {
					return OrderCloudSDK.Catalogs.Get(Me.Org.xp.WeirGroup.label);
				},
				Buyer : function(OrderCloudSDK, Me){
					return OrderCloudSDK.Buyers.Get(Me.GetBuyerID());
				}
			}
		})
		.state('submit', {
			parent: 'base',
			url: '/submit?quoteID&buyerID',
			templateUrl: 'myquote/templates/myquote.submit.tpl.html',
			controller: 'SubmitCtrl',
			controllerAs: 'submit',
			resolve: {
				Quote: function ($stateParams, OrderCloudSDK) {
					return OrderCloudSDK.Orders.Get("Outgoing", $stateParams.quoteID);
				},
				ShippingAddress: function (Quote, OrderCloudSDK, Me) {
					if (Quote.ShippingAddressID) return OrderCloudSDK.Addresses.Get(Me.GetBuyerID(), Quote.ShippingAddressID);
					return null;
				},
				LineItems: function ($q, toastr, OrderCloudSDK, LineItemHelpers, Quote, Me, WeirService) {
					//QuoteShareService.LineItems.length = 0;
					var errorMsg = "";
					var errorTitle= "";
					if(WeirService.Locale() == "fr"){
						errorMsg = "Votre cotation ne contient aucune ligne";
						errorTitle = "Erreur";
					}
					else{
						errorMsg = "Your quote does not contain any line items";
						errorTitle = "Error";
					}
					var dfd = $q.defer();
					OrderCloudSDK.LineItems.List("Outgoing", Quote.ID)
						.then(function (data) {
							if (!data.Items.length) {
								toastr.error(errorMsg, errorTitle);
								dfd.resolve({ Items: [] });
							} else {
								LineItemHelpers.GetBlankProductInfo(data.Items,{"id":Me.Org.ID});
								LineItemHelpers.GetProductInfo(data.Items)
									.then(function () { dfd.resolve(data); });
							}
						})
						.catch(function () {
							toastr.error(errorMsg, errorTitle);
							dfd.resolve({ Items: [] });
						});
					return dfd.promise;
				},
				PreviousLineItems: function($q, toastr, OrderCloudSDK, Quote, LineItemHelpers, Me, WeirService) {
					// We can't have a quantity of 0 on a line item. With show previous line items
					// Split the current order ID. If a rec exists, get, else do nothing.
					var errorMsg = "";
					var errorTitle= "";
					if(WeirService.Locale() == "fr"){
						errorMsg = "La cotation précédente ne contient aucune ligne";
						errorTitle = "Erreur";
					}
					else{
						errorMsg = "Previous quote does not contain any line items";
						errorTitle = "Error";
					}
					var pieces = Quote.ID.split('-Rev');
					if(pieces.length > 1) {
						var prevId = pieces[0] + "-Rev" + (pieces[1] - 1).toString();
						var dfd = $q.defer();
						OrderCloudSDK.LineItems.List("Outgoing", prevId)
							.then(function(data) {
								if (!data.Items.length) {
									toastr.error(errorMsg, errorTitle);
									dfd.resolve({ Items: [] });
								} else {
									LineItemHelpers.GetBlankProductInfo(data.Items,{"id":Me.Org.ID});
									LineItemHelpers.GetProductInfo(data.Items)
										.then(function () { dfd.resolve(data); });
								}
							})
							.catch(function () {
								dfd.resolve({ Items: [] });
							});
						return dfd.promise;
					} else {
						return null;
					}
				},
				Payments: function ($stateParams, OrderCloudSDK) {
					return OrderCloudSDK.Payments.List("Outgoing", $stateParams.quoteID);
				},
				Catalog:  function (OrderCloudSDK, Me) {
					return OrderCloudSDK.Catalogs.Get(Me.Org.xp.WeirGroup.label);
				},
				Buyer : function(OrderCloudSDK, Me){
					return OrderCloudSDK.Buyers.Get(Me.GetBuyerID());
				}
			}
		})
    ;
}

function MyQuoteController($q, $sce, $state, $uibModal, $timeout, $window, toastr, WeirService, Me, Quote, ShippingAddress,
                           Customer, LineItems, Payments, QuoteShareService, imageRoot, QuoteToCsvService, IsBuyer,
                           IsShopper, QuoteCommentsService, CurrentOrder, Catalog, OrderCloudSDK, Buyer, UITotal, $rootScope, $exceptionHandler) {
    var vm = this;
	QuoteShareService.Quote = Quote;
    vm.currentState = $state.$current.name;
    vm.IsBuyer = IsBuyer;
    vm.IsShopper = IsShopper;
    vm.Catalog = Catalog;
    vm.CarriageRateForBuyer = Buyer.xp.UseCustomCarriageRate == true ? Buyer.xp.CustomCarriageRate : Catalog.xp.StandardCarriage;
    vm.CarriageRateForBuyer = vm.CarriageRateForBuyer.toFixed(2);
	vm.Quote = QuoteShareService.Quote;
	vm.currency = (vm.Quote.FromCompanyID.substr(0,5) == "WVCUK") ? ("£") : ((vm.Quote.FromCompanyID.substr(0,5) == "WPIFR") ? ("€") : (""));
	vm.Customer = Customer;
	vm.buyer = Me.Org; //For the print directive.
	vm.ShippingAddress = ShippingAddress;
	vm.ImageBaseUrl = imageRoot;
	vm.SaveableStatuses = [
		WeirService.OrderStatus.Draft.id,
		WeirService.OrderStatus.Saved.id
	];
	QuoteShareService.ShippingAddress = ShippingAddress;
	QuoteShareService.Me = Me;
	QuoteShareService.LineItems.push.apply(QuoteShareService.LineItems, LineItems.Items);
	vm.lineItems = QuoteShareService.LineItems;
	QuoteShareService.Payments = Payments.Items;
	QuoteShareService.Comments = Quote.xp.CommentsToWeir;
	QuoteShareService.UiTotal = UITotal;
	vm.UiTotal = QuoteShareService.UiTotal;

	vm.isActive = function(viewLocation) {
		return viewLocation == $state.current.name;
	};

	vm.GetImageUrl = function(img) {
	    return vm.ImageBaseUrl + img;
	};
	vm.HasLineItems = function () {
	    return (QuoteShareService.LineItems && QuoteShareService.LineItems.length);
	};
	vm.Readonly = function () {
	    $state.go("readonly", { quoteID: vm.Quote.ID, buyerID: Me.GetBuyerID() });
	};
	vm.imageRoot = imageRoot;
	function toCsv() {
		var printLabels = angular.copy(vm.labels);
		var printQuote = angular.copy(QuoteShareService.Quote);
		printQuote.ShippingCost = printQuote.xp.CarriageRateType == 'standard' ? vm.CarriageRateForBuyer : 0.00;
		printQuote.Total = vm.UiTotal;
		return QuoteToCsvService.ToCsvJson(printQuote, QuoteShareService.LineItems, vm.ShippingAddress, QuoteShareService.Payments, printLabels);
	}
	vm.ToCsvJson = toCsv;
	vm.CsvFilename = vm.Quote.ID + ".csv";
    vm.IsCarriageSelected = function() {
        isCarriageReadyForBeyondDelivery();
    };
	function getStatusLabel() {
	    if (vm.Quote.xp.Status) {
	        var status = WeirService.LookupStatus(vm.Quote.xp.Status);
	        if (status) {
	            return status.label[WeirService.Locale()];
	            // TODO: Address localization
	        }
	    }
	    return "";
	}
	function save() {
		if (vm.Quote.xp.Status == WeirService.OrderStatus.Draft.id) { /*TODO: FAIL if no line items*/ }
		var mods = {
		    Comments: vm.Quote.Comments,
		    xp: {
		        StatusDate: new Date(),
				RefNum: vm.Quote.xp.RefNum,
				Name: vm.Quote.xp.Name,
			    CarriageRateType: vm.Quote.xp.CarriageRateType,
			    ShippingDescription: $sce.getTrustedHtml(vm.labels.DescriptionOfShipping[vm.Quote.xp.CarriageRateType])
		    }
		};
		var assignQuoteNumber = false;

		if (vm.Quote.xp.Status == WeirService.OrderStatus.Draft.id) {
		    mods.xp.Status = WeirService.OrderStatus.Saved.id;
			mods.xp.Active = true;
		    assignQuoteNumber = true;
		}

		WeirService.UpdateQuote(vm.Quote, mods, assignQuoteNumber, vm.Customer.id)
			.then(function(quote) {
				QuoteShareService.Quote = quote;
				var rateToUse = Buyer.xp.UseCustomCarriageRate == true ? Buyer.xp.CustomCarriageRate : Catalog.xp.StandardCarriage;
				if(quote.xp.CarriageRateType == 'standard'){
					QuoteShareService.UiTotal = (rateToUse + Quote.Subtotal).toFixed(2);
				} else {
					QuoteShareService.UiTotal = Quote.Subtotal.toFixed(2);
				}
				return CurrentOrder.Set(quote.ID);
			})
			.then(function() {
				toastr.success(vm.labels.SaveSuccessMessage, vm.labels.SaveSuccessTitle);
				if(assignQuoteNumber) {
					vm.Quote = QuoteShareService.Quote;
					//$window.location.reload();
				}
			})
			.catch(function(ex) {
				$exceptionHandler(ex);
			});
	}
	function _approve() {
	    if (vm.Quote.xp.Status == 'RV') {
	        var mods = {
	            xp: {
	                StatusDate: new Date(),
	                Status: WeirService.OrderStatus.ConfirmedQuote.id
	            }
	        };
	        WeirService.UpdateQuote(vm.Quote, mods)
            .then(function (qte) {
                toastr.success(vm.labels.ApprovedMessage, vm.labels.ApprovedTitle);
	            $state.go('readonly', { quoteID: vm.Quote.ID, buyerID: Me.GetBuyerID() });
            });
	    }
	}
	function _reject() {
	    if (vm.Quote.xp.Status == 'RV') {
	        var mods = {
	            xp: {
	                StatusDate: new Date(),
	                Status: WeirService.OrderStatus.RejectedQuote.id
	            }
	        };
	        WeirService.UpdateQuote(vm.Quote, mods)
            .then(function (qte) {
                toastr.success(vm.labels.RejectedMessage, vm.labels.RejectedTitle);
	            $state.go('readonly', { quoteID: vm.Quote.ID, buyerID: Me.GetBuyerID() });
            });
        }
	}
	function gotoDelivery(dirty) {
		if(dirty) {
			save();
		}

		if (!$state.is("myquote.detail") || ((vm.Quote.xp.CommentsToWeir && vm.Quote.xp.CommentsToWeir.length > 0) && vm.Quote.xp.RefNum && vm.Quote.xp.Files && vm.Quote.xp.Files.length)) {
            $state.go("myquote.delivery");
        } else {
            var modalInstance = $uibModal.open({
                animation: true,
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: 'myquote/templates/myquote.missingdetail.tpl.html',
                controller: 'MoreQuoteInfoCtrl',
                controllerAs: 'moreInfo',
                resolve: {
                    quote: function() {
                        return vm.Quote;
                    }
                }
            });
            modalInstance.result;
		}
	}
	function isCarriageReadyForBeyondDelivery(){
        //additional check if carriage rate type is set. if not show modal and do nothing.
		var validForReview = true;
        if(!vm.Quote.xp.CarriageRateType) {
            validForReview = false;
            var modalInstance = $uibModal.open({
                animation: true,
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: 'myquote/templates/myquote.choosecarriagetypeErrorModal.tpl.html',
                controller: 'CarriageModalCtrl',
                controllerAs: 'carriageCtrl',
                size: 'sm'
            });
            return false;
        }//end of else where they dont have a carriageratetype
        return true; //quote has carriage selected.
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
	//TODO - Remove. We now use toCsv().
	function download() {
		$timeout($window.print,1);
	}

	function _next() {
		// ToDo combine gotoDelivery() and next(), iot handle the "workflow" in one spot.
		var goto = {
			"myquote.detail":"myquote.delivery",
			"myquote.delivery":"myquote.review",
			"myquote.review":"myquote.submitquote"
		};
		var isValidForReview = function () {
		    var validForReview = true;
            validForReview = isCarriageReadyForBeyondDelivery() && validForReview;
            validForReview = validForReview && (vm.Quote.ShippingAddressID != null);
            validForReview = validForReview && vm.HasLineItems();
		    return validForReview;
		};
		if(isValidForReview()) {
			//here is the patch- runs everytime it is chosen in case the user goes back to change it. //todo should this lock down when status changes?
			    //ex works does not have a set amount yet
				//admin side setting exworks shipping description so first time they edit they have a default value
            OrderCloudSDK.Orders.Patch("Outgoing", vm.Quote.ID, {xp: {CarriageRateType: vm.Quote.xp.CarriageRateType, ShippingDescription: $sce.getTrustedHtml(vm.labels.DescriptionOfShipping[vm.Quote.xp.CarriageRateType])}})
                .then(function (Quote) {
	                var rateToUse = Buyer.xp.UseCustomCarriageRate == true ? Buyer.xp.CustomCarriageRate : Catalog.xp.StandardCarriage;
	                if(Quote.xp.CarriageRateType == 'standard') {
		                vm.UiTotal = (rateToUse + Quote.Subtotal).toFixed(2);
	                }
	                else{
		                vm.UiTotal = Quote.Subtotal.toFixed(2);
	                }
	                QuoteShareService.Quote = Quote;
	                QuoteShareService.UiTotal = vm.UiTotal;
                    $state.go(goto[$state.current.name]);
                })
                .catch(function (ex) {
                    $exceptionHandler(ex);
                })
		}
		else{
			$state.go($state.current, {}, {reload: false});
		}
	};

	vm.SetShippingPrice = function() {
        var isValidForReview = function () {
            var validForReview = true;
            validForReview = isCarriageReadyForBeyondDelivery() && validForReview;
            validForReview = validForReview && (vm.Quote.ShippingAddressID != null);
            validForReview = validForReview && vm.HasLineItems();
            return validForReview;
        };
        if(isValidForReview()) {
            //here is the patch- runs everytime it is chosen in case the user goes back to change it. //todo should this lock down when status changes?
            //ex works does not have a set amount yet
            OrderCloudSDK.Orders.Patch("Outgoing", vm.Quote.ID, {xp: {CarriageRateType: vm.Quote.xp.CarriageRateType, ShippingDescription: $sce.getTrustedHtml(vm.labels.DescriptionOfShipping[vm.Quote.xp.CarriageRateType])}})
                .then(function (Quote) {
	                var rateToUse = Buyer.xp.UseCustomCarriageRate == true ? Buyer.xp.CustomCarriageRate : Catalog.xp.StandardCarriage;
	                if(Quote.xp.CarriageRateType == 'standard'){
		                vm.UiTotal = (rateToUse + Quote.Subtotal).toFixed(2);
	                }
	                else{
		                vm.UiTotal = Quote.Subtotal.toFixed(2);
	                }
	                QuoteShareService.Quote = Quote;
	                QuoteShareService.UiTotal = vm.UiTotal;
                    //$state.go(goto[$state.current.name]);
                })
                .catch(function (ex) {
                    $exceptionHandler(ex);
                })
        }
        else{
            $state.go($state.current, {}, {reload: false});
        }
    };

	var labels = {
	    en: {
	        YourQuote: "Your Quote",
	        QuoteNumber: "Quote number; ",
            QuoteName: "Quote Name; ",
	        YourReference: "Your Reference No; ",
	        DeliveryOptions: "Delivery Options",
	        ReviewQuote: "Review Quote",
	        SubmitQuote: "Submit Quote or Order",
            PONumber: "PO Number",
            SerialNum: "Serial Number",
            TagNum: "Tag Number (if available)",
            PartNum: "Part Number",
            PartDesc: "Description of Part",
            RecRepl: "Recommended Replacement (yrs)",
            LeadTime: "Lead Time (days)",
            PricePer: "Price per Item or Set",
            Quantity: "Quantity",
            Total: "Total",
            DeliveryAddress: "Delivery Address",
            Save: "Save",
	        Share: "Share",
	        Download: "Download",
	        Print: "Print",
	        SaveSuccessTitle: "Quote Saved",
	        SaveSuccessMessage: "Your Changes Have Been Saved",
	        NoItemsError: "Please Add Parts to Quote Before Saving",
	        CannotContinueNoItems: "Please Add Parts to Quote Before Continuing",
	        SaveBody: "Your Quote Has Been Saved.",
	        SaveFooter: "View Your Quotes",
	        Approve: "Approve",
	        Reject: "Reject",
	        Comments: "Comments",
            CommentNotice: "Comments will not be received by Weir until your quote is submitted for review.",
            Status: "Status",
	        OrderDate: "Order date;",
	        RejectedMessage: "The revised quote has been rejected.",
	        RejectedTitle: "Quote Updated",
	        ApprovedMessage: "The revised quote has been accepted",
	        ApprovedTitle: "Quote Updated",
	        SubmitWithPO: "Submit Order",
	        PriceDisclaimer: "All prices stated do not include UK VAT or delivery",
		    ReplacementGuidance: "Recommended replacement guidance; If ordering 5 year spares you should also order all 2 year spares. If ordering 10 year spares, you should also order all 5 year and 2 year spares.",
		    POAGuidance: "POA; You can add POA items to your quote and submit your quote for review. We will endeavour to respond with a price for POA items within two days of receipt of your quote request.",
		    LeadTimeNotice: "Lead time for all orders will be based on the longest lead time from the list of spares requested",
		    Currency: "Currency",
			Search: "Search",
            EmptyComments: $sce.trustAsHtml("Cannot save an empty comment."),
            EmptyCommentTitle: $sce.trustAsHtml("Empty Comment"),
		    AddNew: "Add New Items",
		    DescriptionOfShipping: {
			    exworks:'Carriage - Ex Works',
			    standard:'Carriage Charge'
		    }
	    },
		fr: {
		    YourQuote: $sce.trustAsHtml("Vos Cotations"),
		    QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation"),
            QuoteName: $sce.trustAsHtml("Nom de la cotation "),
		    YourReference: $sce.trustAsHtml("Votre num&eacute;ro de r&eacute;f&eacute;rence; "),
		    DeliveryOptions: $sce.trustAsHtml("Options de livraison"),
		    ReviewQuote: $sce.trustAsHtml("Récapitulatif"),
			SubmitQuote: $sce.trustAsHtml("Soumettre votre cotation ou commande"),
			PONumber: $sce.trustAsHtml("Numéro de bon de commande"),
			SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
			TagNum: $sce.trustAsHtml("Num&eacute;ro de Tag"),
			PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
			PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
			RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute; (ans)"),
			LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison (journées)"),
			PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
			Quantity: $sce.trustAsHtml("Quantit&eacute;"),
			Total: $sce.trustAsHtml("Total"),
			DeliveryAddress: $sce.trustAsHtml("Adresse de livraison"),
			Save: $sce.trustAsHtml("Sauvegarder"),
			Share: $sce.trustAsHtml("Partager"),
			Download: $sce.trustAsHtml("T&eacute;l&eacute;charger"),
			Print: $sce.trustAsHtml("Imprimer"),
			SaveSuccessTitle: $sce.trustAsHtml("Cotation enregistrée"),
			SaveSuccessMessage: $sce.trustAsHtml("Vos modifications ont été enregistrées"),
			NoItemsError: $sce.trustAsHtml("Veuillez ajouter des pi&egrave;ces de rechanges avant de sauvegarder"),
			CannotContinueNoItems: $sce.trustAsHtml("Veuillez ajouter des pi&egrave;ces de rechanges avant de continuer"),
			SaveBody: $sce.trustAsHtml("Votre cotation a été enregistrée."),
			SaveFooter: $sce.trustAsHtml("Voir vos cotations"),
			Approve: $sce.trustAsHtml("Approuver"),
			Reject: $sce.trustAsHtml("Rejeter"),
			Comments: $sce.trustAsHtml("Commentaires"),
            CommentNotice: "Les commentaires ne seront pas reçus par Weir jusqu'à ce que votre cotation soit soumis à révision.",
            Status: $sce.trustAsHtml("Statut"),
			OrderDate: $sce.trustAsHtml("Date de commande;"),
			RejectedMessage: $sce.trustAsHtml("La cotation révisée a ét&eacute; rejetée."),
			RejectedTitle: $sce.trustAsHtml("Cotation mise &agrave; jour"),
			ApprovedMessage: $sce.trustAsHtml("La cotation r&eacute;vis&eacute;e a &eacute;t&eacute; accept&eacute;e"),
			ApprovedTitle: $sce.trustAsHtml("Cotation mise à jour"),
			SubmitWithPO: $sce.trustAsHtml("Soumettre une commande avec bon de commande"),
			PriceDisclaimer: $sce.trustAsHtml("Tous les prix indiqués ne comprennent pas la livraison ni la TVA."),
			ReplacementGuidance: $sce.trustAsHtml("Remplacement recommandé: Si vous commandez les pièces recommandées à 5 ans, vous devriez également commander toutes les pièces recommandées à 2 ans. Si vous commandez des pièces recommandées à 10 ans , vous devez également commander toutes les pièces recommandées à 5 et 2 ans."),
			POAGuidance: $sce.trustAsHtml("Prix à confirmer: Vous pouvez ajouter des articles dont les prix ne sont pas renseignés à votre cotation et soumettre à révision. Nous les renseignerons sur la révision."),
			LeadTimeNotice: $sce.trustAsHtml("Le délai de livraison pour toutes les commandes sera basé sur le délai le plus long de la liste des pièces de rechanges demandées"),
			Currency: $sce.trustAsHtml("Devise"),
            Search: $sce.trustAsHtml("Rechercher"),
			EmptyComments: $sce.trustAsHtml("Impossible d'enregistrer un commentaire vide."),
			EmptyCommentTitle: $sce.trustAsHtml("Commentaire vide"),
			AddNew: $sce.trustAsHtml("Ajouter un item"),
			DescriptionOfShipping: {
				exworks:$sce.trustAsHtml('Livraison Départ-Usine (EXW)'),
				standard:$sce.trustAsHtml('Frais de livraison')
			}
		}
	};

	vm.AddNewComment = function(CommentToBeAdded) {
		var dfd = $q.defer();
		if (CommentToBeAdded) {
			QuoteCommentsService.AddComment(CommentToBeAdded)
				.then(function(result) {
					QuoteShareService.Quote = result;
					vm.Quote = result;
					dfd.resolve(result);
				})
		} else {
			toastr.info(vm.labels.EmptyComments,vm.labels.EmptyCommentTitle);
			dfd.resolve();
		}
		return dfd.promise;
	};

	function _proceedToSubmit() {
		vm.SubmittingToReview = false;
		vm.SubmittingWithPO = false;
		//if (!$state.is('myquote.submitquote')) return;
		var modalInstance = $uibModal.open({
			animation: true,
			ariaLabelledBy: 'modal-title',
			ariaDescribedBy: 'modal-body',
			templateUrl: 'myquote/templates/myquote.submitorconfirm.tpl.html',
			controller: 'ChooseSubmitCtrl',
			controllerAs: 'choosesubmit'
		});
		modalInstance.result.then(
			function (val) {
				if (val == "Review") {
					_submitForReview(true); //POC-410 udpate this to not need a param.
					//vm.SubmittingToReview = true;
					//$state.go('myquote.submitquote');
				} else if (val == "Submit") {
					vm.SubmittingWithPO = true;
					$state.go('myquote.submitorder');
				}
			}
		);
	}

	// Moved from Review Controller.
	function _submitForReview(dirty) {
		var data = {
			xp: {
				Status: WeirService.OrderStatus.Submitted.id,
				StatusDate: new Date(),
				Revised: false
			}
		};

		WeirService.UpdateQuote(vm.Quote, data)
			.then(function (qt) {
				return OrderCloudSDK.Orders.Submit("Outgoing",vm.Quote.ID);
			})
			.then(function (info) {
				CurrentOrder.Set(null);
			})
			.then(function () {
				var modalInstance = $uibModal.open({
					animation: true,
					ariaLabelledBy: 'modal-title',
					ariaDescribedBy: 'modal-body',
					templateUrl: 'myquote/templates/myquote.orderplacedconfirm.tpl.html',
					size: 'lg',
					controller: 'SubmitConfirmOrderCtrl',
					controllerAs: 'submitconfirm',
					resolve: {
						Quote: function () {
							return vm.Quote;
						}
					}
				})
			.closed.then(function () {
				$rootScope.$broadcast('OC:RemoveOrder');
				$state.go("home");
			});
		});
	}

	vm.labels = WeirService.LocaleResources(labels);
	vm.GotoDelivery = gotoDelivery;
	vm.Save = save;
	vm.NoItemsMessage = noItemsMessage;
	vm.CannotContinueNoItemsMessage = cannotContinueNoItemsMessage;
	vm.Share = share;
	vm.Download = download;
	vm.Print = print;
	vm.GetStatusLabel = getStatusLabel;
	vm.Approve = _approve;
	vm.Reject = _reject;
	vm.Next = _next;
	vm.proceedToSubmit = _proceedToSubmit;
	vm.submitForReview = _submitForReview;
}

function MissingCarriageDetailController(WeirService, $uibModalInstance, $sce) {
    //translations
    var vm = this;
    var labels = {
        en: {
        	ModalMessage: "Please select your carriage option before reviewing your quote",
            Close: "Close"
		},
        fr: {
            ModalMessage: $sce.trustAsHtml("Veuillez sélectionner votre option de livraison avant d’examiner le récap de votre cotation"),
            Close: "Fermer"
		}
    };
    vm.labels = WeirService.LocaleResources(labels);

    //modal logic
    vm.Close = function () {
        $uibModalInstance.close();
    };
}

function MyQuoteDetailController(WeirService, $state, $sce, $exceptionHandler, $scope, $rootScope, OrderCloudSDK, QuoteShareService, Me) {
    if ((QuoteShareService.Quote.xp.Status == WeirService.OrderStatus.RevisedQuote.id) ||
        (QuoteShareService.Quote.xp.Status == WeirService.OrderStatus.RevisedOrder.id)) {
        $state.go("revised", {quoteID: QuoteShareService.Quote.ID, buyerID: Me.GetBuyerID()});
    }
	var vm = this;
	vm.Quote = QuoteShareService.Quote;
	vm.NewComment = null;
	vm.LineItems = QuoteShareService.LineItems;
	vm.Comments = QuoteShareService.Comments;
	var labels = {
		en: {
            Customer: "Customer; ",
            QuoteNumber: "Quote Number; ",
            QuoteName: "Add your Quote Name ",
            AddNew: "Add New Items",
            SerialNum: "Serial Number",
            TagNum: "Tag Number (if available)",
            PartNum: "Part Number",
            PartDesc: "Description of Part",
            RecRepl: "Recommended Replacement (yrs)",
            LeadTime: "Lead Time (days)",
            PricePer: "Price per Item Or Set",
            Quantity: "Quantity",
            Total: "Total",
            UploadHeader: "Upload your Service or Operating Condition Document",
            RefNumHeader: "Add your Reference Number ",
            CommentsHeader: "Your Comments or Instructions",
		    DeliveryOptions: $sce.trustAsHtml("Continue to Delivery Options <i class='fa fa-angle-right' aria-hidden='true'></i>"),
			Update: "Update",
			DragAndDrop: "Save your Draft before Uploading Documents.",
			Add: "Add",
			Cancel: "Cancel",
			Comments: "Comments",
			AddedComment: " added a comment - ",
			PriceDisclaimer: "All prices stated do not include UK VAT or delivery",
			SaveToContinue: "*Save to Continue",
			POA: "POA"
		},
		fr: {
			Customer: $sce.trustAsHtml("Client "),
			QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation "),
			QuoteName: $sce.trustAsHtml("Ajouter un libellé à votre cotation "),
			AddNew: $sce.trustAsHtml("Ajouter un item"),
			SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
			TagNum: $sce.trustAsHtml("Num&eacute;ro de Tag"),
			PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
			PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
			RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute; (ans)"),
			LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison (journées)"),
			PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
			Quantity: $sce.trustAsHtml("Quantit&eacute;"),
			Total: $sce.trustAsHtml("Total"),
			UploadHeader: $sce.trustAsHtml("T&eacute;l&eacute;charger vos documents concernant vos conditions de services"),
            UploadInstruct: $sce.trustAsHtml("Veuillez t&eacute;l&eacute;charger tout type de document concernant vos soupapes ou vos pi&egrave;ces de rechanges. De ce fait, nous pouvons les utiliser comme r&eacute;f&eacute;rence pour cette cotation."),
            RefNumHeader: $sce.trustAsHtml("Ajouter votre num&eacute;ro de r&eacute;f&eacute;rence "),
            CommentsHeader: $sce.trustAsHtml("Vos commentaires ou instructions"),
            CommentsInstr: $sce.trustAsHtml("Veuillez ajouter tout commentaire ou instructions sp&eacute;cifiques pour cette cotation"),
            DeliveryOptions: $sce.trustAsHtml("Continuer vers les options de livraison <i class='fa fa-angle-right' aria-hidden='true'></i>"),
			Update: $sce.trustAsHtml("Mettre &agrave; jour"),
			DragAndDrop: $sce.trustAsHtml("Enregistrez votre ébauche avant de télécharger des documents."),
			Add: $sce.trustAsHtml("Ajouter"),
			Cancel: $sce.trustAsHtml("Annuler"),
			Comments: $sce.trustAsHtml("Commentaires"),
			AddedComment: $sce.trustAsHtml(" A ajouté un commentaire - "),
			PriceDisclaimer: $sce.trustAsHtml("Tous les prix indiqués ne comprennent pas la livraison ni la TVA."),
			SaveToContinue: $sce.trustAsHtml("*Veuillez enregistrer afin de continuer"),
            POA: $sce.trustAsHtml("POA")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);

	vm.deleteLineItem = _deleteLineItem;
	function _deleteLineItem(quoteNumber, itemid) {
		OrderCloudSDK.LineItems.Delete("Outgoing",quoteNumber, itemid)
			.then(function() {
				// Testing. Should make another event for clarity. At this time I believe it just updates the cart items.
				$rootScope.$broadcast('SwitchCart', quoteNumber, itemid); //This kicks off an event in cart.js
			})
			.then(function() {
				//$state.reload($state.current, {}, {reload:true}); This is bugged: https://github.com/angular-ui/ui-router/issues/582
				$state.transitionTo($state.current, $state.$current.params, { reload: true, inherit: true, notify: true });
			})
			.catch(function(ex){
				$exceptionHandler(ex);
			});
	}

	vm.updateLineItem = _updateLineItem;
	function _updateLineItem(quoteNumber, item) {
		var patch = {
			Quantity: item.Quantity
		};
		OrderCloudSDK.LineItems.Patch("Outgoing", quoteNumber, item.ID, patch)
			.then(function(resp) {
				$rootScope.$broadcast('SwitchCart', quoteNumber, resp.ID);
			})
			.then(function() {
				//$state.reload($state.current, {}, {reload:true}); This is bugged: https://github.com/angular-ui/ui-router/issues/582
				$state.transitionTo($state.current, $state.$current.params, { reload: true, inherit: true, notify: true });
			})
			.catch(function(ex) {
				$exceptionHandler(ex);
			});
	}

	vm.AddComment = function() {
		$scope.$parent.myquote.AddNewComment(vm.NewComment)
			.then(function(result) {
				if(result) {
					vm.Comments = result.xp.CommentsToWeir;
				}
			});
		vm.NewComment = null;
	}
}

function QuoteDeliveryOptionController($uibModal, WeirService, $state, $sce, $exceptionHandler, Underscore, toastr, Addresses, OrderCloudSDK, QuoteShareService, OCGeography, $scope, Me) {
    var vm = this;
    var activeAddress = function (address) {
        return address.xp.active == true;
    };
    vm.addresses = Underscore.sortBy(Addresses.Items, function (address) {
        return address.xp.primary;
    }).filter(activeAddress).reverse();

    //if the QuoteShareService.Quote.ShippingAddressID is null, set it to the vm.addresses[0] if the vm.addresses.length > 0
    if (QuoteShareService.Quote.ShippingAddressID == null && vm.addresses.length > 0) {
        //function _setShippingAddress(QuoteID, Address) {
        _setShippingAddress(QuoteShareService.Quote.ID, vm.addresses[0]);
    }

    vm.country = function (c) {
        var result = Underscore.findWhere(OCGeography.Countries, {value: c});
        return result ? result.label : '';
    };

    var labels = {
        en: {
            DefaultAddress: "Your Default Address",
            AddNew: $sce.trustAsHtml("<i class='fa fa-plus-circle'></i> Add a New Address"),
            DeliveryInfo: "Delivery Information",
            DeliverHere: "Deliver to this Address",
            ReviewQuote: "Continue to Review Quote <i class='fa fa-angle-right' aria-hidden='true'></i>",
            BackToQuote: "<i class='fa fa-angle-left' aria-hidden='true'></i> Back to your Quote",
            InfoText1: "Delivery costs will be confirmed on Order.",
            InfoText2: "Deliveries will be prepared for shipping based on your standard delivery instructions.",
            InfoText3: "Lead time for all orders will be based on the longest lead time from the list of spares requested.",
            ShippingAddress: "Shipping address successfully selected.",
            ShippingAddressSet: "Shipping address set to ",
            Success: "Success",
            ShippingAddressTitle: "Shipping Address Set",
            //carriage labels
            CarriageOptionsMsg: "Carriage Options",
            CarriageStandardPrice: "£ " +  $scope.$parent.myquote.CarriageRateForBuyer + " UK delivery",
            CarriageExWorks: "Ex works",
            SelectOption: "*please select your carriage option",
            CarriageInfo: "Delivery Information",
            CarriageInfoP1: "For spares orders placed on this platform, we offer a flat rate carriage charge of £"+ $scope.$parent.myquote.CarriageRateForBuyer +  " per order to one UK address.",
            CarriageInfoP2: "Deliveries will be prepared for shipping based on your standard delivery instructions.",
            CarriageInfoP3: "Lead time for all orders will be based on the longest lead time from the list of spares requested."
        },
        fr: {
            DefaultAddress: $sce.trustAsHtml("Votre adresse par d&eacute;faut"),
            AddNew: $sce.trustAsHtml("<i class='fa fa-plus-circle'></i> Ajouter une nouvelle adresse"),
            DeliveryInfo: $sce.trustAsHtml("Informations de livraison"),
            DeliverHere: $sce.trustAsHtml("Livrer &agrave; cette adresse"),
            ReviewQuote: $sce.trustAsHtml("Continuer vers le récapitulatif <i class='fa fa-angle-right' aria-hidden='true'></i>"),
            BackToQuote: $sce.trustAsHtml("<i class='fa fa-angle-left' aria-hidden='true'></i> Retour &agrave; votre cotation"),
            InfoText1: $sce.trustAsHtml("Les frais de livraison seront confirm&eacute;s &agrave; la commande."),
            InfoText2: $sce.trustAsHtml("Les livraisons seront pr&eacute;par&eacute;es pour l'exp&eacute;dition sur la base de vos instructions de livraison standard."),
            InfoText3: $sce.trustAsHtml("Le d&eacute;lai de livraison pour toutes les commandes sera bas&eacute; sur le d&eacute;lai le plus long de la liste des pi&egrave;ces de rechanges demand&eacute;es"),
            ShippingAddress: $sce.trustAsHtml("Votre adresse de livraison a bien été séléctionnée"),
            ShippingAddressSet: $sce.trustAsHtml("Livraison confirmée à cette adresse "),
            Success: $sce.trustAsHtml("Succès"),
            ShippingAddressTitle: "Adresse de livraison",
            //carriage labels
            CarriageOptionsMsg: "Options de transport",
            CarriageStandardPrice: $scope.$parent.myquote.CarriageRateForBuyer + " € livraison",
            CarriageExWorks: "Départ Usine",
            SelectOption: "Veuillez sélectionner votre option de transport",
            CarriageInfo: "Informations de livraison",
            CarriageInfoP1: "Pour les commandes de pièces de rechange effectuées sur cette plate-forme, le prix forfaitaire est de "+ $scope.$parent.myquote.CarriageRateForBuyer +  "  €  par commande.",
            CarriageInfoP2: "La livraison sera préparé en fonction de vos instructions.",
            CarriageInfoP3: "Le délai de livraison pour toutes les commandes sera basé sur le délai le plus long de la liste des pièces de rechanges demandées"

        }
    };
    vm.labels = WeirService.LocaleResources(labels);
    // We do this so we can display the addresses in a two column table.
    vm.ChunkedData = _chunkData(vm.addresses, 2);
    function _chunkData(arr, size) {
        var newArray = [];
        for (var i = 0; i < arr.length; i += size) {
            newArray.push(arr.slice(i, i + size));
        }
        return newArray;
    }

    vm.setShippingAddress = _setShippingAddress;
    function _setShippingAddress(QuoteID, Address) {
        OrderCloudSDK.Orders.SetShippingAddress("Outgoing", QuoteID, Address)
	        .then(function(order) {
	        	return OrderCloudSDK.Addresses.Get(Me.GetBuyerID(), order.ShippingAddressID)
	        })
            .then(function (address) {
            	QuoteShareService.ShippingAddress = address;
                $state.go($state.current, {}, {reload: true});
                toastr.success(vm.labels.ShippingAddress, vm.labels.Success);
            })
            .catch(function (ex) {
                $exceptionHandler(ex);
            });
    }

    vm.SaveCustomAddress = _saveCustomAddress;
    function _saveCustomAddress() {
        return true;
    }

    vm.CustomShipping = _customShipping;
    function _customShipping(QuoteID) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'newAddress.html',
            controller: 'NewAddressModalCtrl',
            controllerAs: 'NewAddressModal',
            size: 'lg'
        });

        var newAddressResults = {};
        modalInstance.result
            .then(function (address) {
                return OrderCloudSDK.Addresses.Create(Me.GetBuyerID(),address);
            })
            .then(function (newAddress) {
                newAddressResults.ID = newAddress.ID;
                newAddressResults.Name = newAddress.AddressName;
                return OrderCloudSDK.Orders.SetShippingAddress("Outgoing", QuoteID, newAddress);
            })
            .then(function () {
                return WeirService.AssignAddressToGroups(newAddressResults.ID);
            })
            .then(function () {
                $state.go($state.current, {}, {reload: true});
                toastr.success(vm.labels.ShippingAddressSet + newAddressResults.Name, vm.labels.ShippingAddressTitle);
            })
            .catch(function (ex) {
                if (ex !== 'cancel') {
                    $exceptionHandler(ex);
                }
            });
    }
}

function ReviewQuoteController(WeirService, $state, $sce, $exceptionHandler, $rootScope, $uibModal,
    OrderCloudSDK, QuoteShareService, Underscore, OCGeography, CurrentOrder, Customer, fileStore, FilesService,
	$scope, FileSaver, UITotal) {
	//CheckStateChangeService.checkFormOnStateChange($scope);
	var vm = this;
	vm.currentState = $state.$current.name;
	if( (typeof(QuoteShareService.Quote.xp) == 'undefined') || QuoteShareService.Quote.xp == null) QuoteShareService.Quote.xp = {};
	vm.LineItems = QuoteShareService.LineItems;
    vm.Quote = QuoteShareService.Quote;
	vm.Comments = QuoteShareService.Comments;
	//due to latency from the webhook need to set the ui to render a mock total value.
	vm.TotalUsingUI = UITotal;
    vm.PONumber = "";
    var payment = (QuoteShareService.Payments.length > 0) ? QuoteShareService.Payments[0] : null;
    if (payment && payment.xp && payment.xp.PONumber) vm.PONumber = payment.xp.PONumber;
    vm.country = function (c) {
        var result = Underscore.findWhere(OCGeography.Countries, { value: c });
        return result ? result.label : '';
    };
    vm.Step = $state.is('myquote.review') ? "Review" : ($state.is('myquote.submitquote') ? "Submit" : "Unknown");
    vm.SubmittingToReview = false;
    vm.SubmittingWithPO = false;
	// TODO: Updates so that the user can come back to a submitted order, and submit with the PO. Might need to add extra code so that when just adding
	// a PO, we do not re-submit the Order: simply add the PO and change the status.
	if(vm.Quote.xp.PendingPO == true &&($state.$current.name == "myquote.submitquote") && (vm.Quote.xp.Status == WeirService.OrderStatus.ConfirmedQuote.id || vm.Quote.xp.Type=="Order")) {
		vm.SubmittingWithPO = true;
	}
    // TODO: Also add condition that user has Buyer role
    var allowNextStatuses = [WeirService.OrderStatus.Draft.id, WeirService.OrderStatus.Saved.id];
	// TODO a user could have multiple rolls or groups. look for the usermembership in the buyers group.
    vm.ShowNextButton = allowNextStatuses.indexOf(vm.Quote.xp.Status) > -1;
					//(QuoteShareService.Me.xp.Roles && QuoteShareService.Me.xp.Roles.indexOf("Buyer") > -1) &&
                            //((vm.Quote.xp.Status == WeirService.OrderStatus.ConfirmedQuote.id) ||
                            //(vm.Quote.FromUserID == QuoteShareService.Me.ID && (allowNextStatuses.indexOf(vm.Quote.xp.Status) > -1)));
	vm.fileStore = fileStore;
    var labels = {
        en: {
            Customer: "Customer; ",
            QuoteNumber: "Quote Number; ",
            QuoteName: "Quote Name; ",
	        NextStep: "Submit Quote or Order",
            Submit: $sce.trustAsHtml("Continue to Submit Quote or Order <i class='fa fa-angle-right aria-hidden='true'></i>"),
            BackToReview: "Review Quote",
            BackToDelivery: "<i class='fa fa-angle-left' aria-hidden='true'></i> Back to Delivery Options",
            TagNum: "Tag Number (if available)",
            PartNum: "Part Number",
            PartDesc: "Description of Part",
            RecRepl: "Recommended Replacement (yrs)",
            LeadTime: "Lead Time (days)",
            PricePer: "Price per Item or Set",
            Quantity: "Quantity",
            Total: "Total",
            YourAttachments: "Your Attachments",
            YourReference: "Your Reference No; ",
            CommentsHeader: "Your Comments or Instructions",
            CommentsInstr: "Please Add any Specific Comments or Instructions for this Quote",
            DeliveryOptions: "Delivery Options <i class='fa fa-angle-right' aria-hidden='true'></i>",
            DeliveryAddress: "Delivery Address",
            ChangeAddr: "Change Address",
            Update: "Update",
            WeirComment: "Comment",
            AddComment: "Add",
            CancelComment: "Cancel",
            SubmitForReview: "Submit Quote for Review <i class='fa fa-angle-right' aria-hidden='true'></i>",
            CommentSavedMsg: "Your Quote has been Updated",
            PONeededHeader: "Please provide a Purchase Order to finalise your Order",
            POUpload: "Upload PO Document",
            POEntry: "Enter PO Number",
            SubmitOrderAndEmail: "Submit Order & Email PO <i class='fa fa-angle-right' aria-hidden='true'></i>",
	        SubmitOrderWithPO: "Submit Order with PO <i class='fa fa-angle-right' aria-hidden='true'></i>",
	        SerialNum: "Serial Number",
	        EmailPoMessage: "*Your order will be confirmed<br class='message-break'>following receipt of your PO.",
	        Add: "Add",
	        Cancel: "Cancel",
	        Comments: "Comments",
	        AddedComment: " added a comment - ",
			POA: "POA",
	        DescriptionOfShipping: {
		        exworks:'Carriage - Ex Works',
		        standard:'Carriage Charge'
	        },
            POAShipping: "POA"
        },
        fr: {
            Customer: $sce.trustAsHtml("Client "),
            QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation "),
            QuoteName: $sce.trustAsHtml("Libellé de la cotation "),
            NextStep: $sce.trustAsHtml("Suivant"),
            Submit: $sce.trustAsHtml("Continuer vers la soumission de cotation <i class='fa fa-angle-right aria-hidden='true'></i>"),
            BackToReview: $sce.trustAsHtml("Réviser la cotation"),
            BackToDelivery: $sce.trustAsHtml("<i class='fa fa-angle-left' aria-hidden='true'></i> Retour vers les options de livraison"),
            TagNum: $sce.trustAsHtml("Num&eacute;ro de Tag"),
            PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
            PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
            RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute; (ans)"),
            LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison (journées)"),
            PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
            Quantity: $sce.trustAsHtml("Quantit&eacute;"),
            Total: $sce.trustAsHtml("Total"),
            YourAttachments: $sce.trustAsHtml("Vos pi&eacute;ces jointes"),
            YourReference: $sce.trustAsHtml("Votre num&eacute;ro de r&eacute;f&eacute;rence; "),
            CommentsHeader: $sce.trustAsHtml("Vos commentaires ou instructions"),
            CommentsInstr: $sce.trustAsHtml("Veuillez ajouter tout commentaire ou instructions sp&eacute;cifiques pour cette cotation"),
            DeliveryOptions: $sce.trustAsHtml("Options de livraison <i class='fa fa-angle-right' aria-hidden='true'></i>"),
            DeliveryAddress: $sce.trustAsHtml("Adresse de livraison"),
            ChangeAddr: $sce.trustAsHtml("Changer d'adresse"),
            Update: $sce.trustAsHtml("Mettre à jour"),
            WeirComment: $sce.trustAsHtml("Commenter"),
            AddComment: $sce.trustAsHtml("Ajouter"),
            CancelComment: $sce.trustAsHtml("Annuler"),
            SubmitForReview: $sce.trustAsHtml("Soumettre votre cotation pour révision <i class='fa fa-angle-right' aria-hidden='true'></i>"),
            CommentSavedMsg: $sce.trustAsHtml("Votre cotation a été mise à jour"),
            PONeededHeader: $sce.trustAsHtml("Veuillez fournir un bon de commande pour finaliser votre commande"),
            POUpload: $sce.trustAsHtml("T&eacute;l&eacute;charger le bon de commande"),
            POEntry: $sce.trustAsHtml("Entrer une référence de commande"),
            SubmitOrderAndEmail: $sce.trustAsHtml("Soumettre une commande<br>& E-Mail de pi&egrave;ce de rechange <i class='fa fa-angle-right' aria-hidden='true'></i>"),
            SubmitOrderWithPO: $sce.trustAsHtml("Soumettre une commande<br>avec bon de commande <i class='fa fa-angle-right' aria-hidden='true'></i>"),
            SerialNum: $sce.trustAsHtml("Num&eacute;ro de s&eacute;rie"),
	        EmailPoMessage: $sce.trustAsHtml("Votre commande sera confirmée <br class='message-break'>  après réception de votre commande."),
	        Add: $sce.trustAsHtml("Ajouter"),
	        Cancel: $sce.trustAsHtml("Annuler"),
	        Comments: $sce.trustAsHtml("Commentaires"),
	        AddedComment: $sce.trustAsHtml("A ajouté un commentaire "),
            POA: $sce.trustAsHtml("POA"),
	        DescriptionOfShipping: {
		        exworks:$sce.trustAsHtml('Livraison Départ-Usine (EXW)'),
		        standard:$sce.trustAsHtml('Frais de livraison')
	        },
            POAShipping: "POA"
        }
    };
    vm.labels = WeirService.LocaleResources(labels);

	vm.GetFile = function(fileName) {
		var orderid = vm.Quote.xp.OriginalOrderID ? vm.Quote.xp.OriginalOrderID : vm.Quote.ID;

		FilesService.Get(orderid + fileName)
			.then(function(fileData) {
				//console.log(fileData);
				var file = new Blob([fileData.Body], {type: fileData.ContentType});
				FileSaver.saveAs(file, fileName);
				//var fileURL = URL.createObjectURL(file);
				//window.open(fileURL, "_blank");
			});
	};

    function _deleteLineItem(quoteNumber, itemid) {
        OrderCloudSDK.LineItems.Delete("Outgoing", quoteNumber, itemid)
			.then(function () {
			    // Testing. Should make another event for clarity. At this time I believe it just updates the cart items.
			    $rootScope.$broadcast('SwitchCart', quoteNumber, itemid); //This kicks off an event in cart.js
			})
			.then(function () {
				//$state.reload($state.current, {}, {reload:true}); This is bugged: https://github.com/angular-ui/ui-router/issues/582
				$state.transitionTo($state.current, $state.$current.params, { reload: true, inherit: true, notify: true });
			})
			.catch(function (ex) {
			    $exceptionHandler(ex);
			});
    }

    function _updateLineItem(quoteNumber, item) {
    	var patch = {
		    Quantity: item.Quantity
	    };
        OrderCloudSDK.LineItems.Patch("Outgoing", quoteNumber, item.ID, patch)
			.then(function (resp) {
			    $rootScope.$broadcast('LineItemAddedToCart', quoteNumber, resp.ID);
			})
			.then(function () {
				//$state.reload($state.current, {}, {reload:true}); This is bugged: https://github.com/angular-ui/ui-router/issues/582
				$state.transitionTo($state.current, $state.$current.params, { reload: true, inherit: true, notify: true });
			})
			.catch(function (ex) {
			    $exceptionHandler(ex);
			});
    }

    function _gotoDelivery() {
        $state.go("myquote.delivery");
    }
    function _gotoSubmit() {
        $state.go("myquote.submitquote");
    }
    function _gotoReview() {
        $state.go("myquote.review");
    }

    // ToDo Accept a parameter withPO. It will be true or false.
    function _submitOrder(withPO) {
        if (payment == null) {
            if (vm.PONumber) {
                var data = {
                    Type: "PurchaseOrder",
                    xp: {
                        PONumber: vm.PONumber
                    }
                };
                OrderCloudSDK.Payments.Create("Outgoing", vm.Quote.ID, data)
                    .then(function (pmt) {
                        QuoteShareService.Payments.push(pmt);
                        payment = pmt;
                        completeSubmit(withPO);
                    })
            } else {
            	// email the PO later. Can we acutally submit without a PO?
	            completeSubmit(withPO);
            }
        } else if (!payment.xp || payment.xp.PONumber != vm.PONumber) {
            var data = {
                xp: {
                    PONumber: vm.PONumber
                }
            };
            OrderCloudSDK.Payments.Patch("Outgoing", vm.Quote.ID, payment.ID, data)
                .then(function (pmt) {
                    QuoteShareService.Payments[0] = pmt;
                    payment = pmt;
                    completeSubmit(withPO);
                })
        } else {
            completeSubmit(withPO);
        }
    }

    function completeSubmit(withPO) {
    	var data = {};
    	if(withPO) {
		    data = {
			    xp: {
				    Status: WeirService.OrderStatus.SubmittedWithPO.id,
				    StatusDate: new Date(),
				    Type: "Order",
				    Revised: false,
				    PONumber: vm.PONumber
			    }
		    };
	    } else {
	    	//TODO check admin app. Can we set PONUmber to null instead of pending?
		    data = {
			    xp: {
				    Status: WeirService.OrderStatus.SubmittedPendingPO.id,
				    StatusDate: new Date(),
				    Type: "Order",
				    PendingPO: true,
				    Revised: false,
				    PONumber: "Pending"
			    }
		    };
	    }

	    WeirService.UpdateQuote(vm.Quote, data)
            .then(function (qt) {
                return OrderCloudSDK.Orders.Submit("Outgoing", vm.Quote.ID);
            })
            .then(function (info) {
                CurrentOrder.Set(null);
            })
           .then(function () {
               var modalInstance = $uibModal.open({
                   animation: true,
                   ariaLabelledBy: 'modal-title',
                   ariaDescribedBy: 'modal-body',
                   templateUrl: 'myquote/templates/myquote.orderplacedconfirm.tpl.html',
                   size: 'lg',
                   controller: 'SubmitConfirmCtrl',
                   controllerAs: 'submitconfirm',
                   resolve: {
                       Quote: function () {
                           return vm.Quote;
                       },
	                   WithPO: function() {
							return withPO;
	                   }
                   }
               })
               .closed.then(function () {
               	   $rootScope.$broadcast('OC:RemoveOrder');
                   $state.go("home");
               });
           });
    }

	vm.NewComment = null;
	vm.AddComment = function() {
		$scope.$parent.myquote.AddNewComment(vm.NewComment)
			.then(function(result) {
				if(result) {
					vm.Comments = result.xp.CommentsToWeir;
				}
			});
		vm.NewComment = null;
	};

    vm.deleteLineItem = _deleteLineItem;
    vm.updateLineItem = _updateLineItem;
    //vm.submitForReview = _submitForReview; //Move to myQuote.
    vm.submitOrder = _submitOrder;
    vm.backToDelivery = _gotoDelivery;
    vm.toSubmit = _gotoSubmit;
    vm.toReview = _gotoReview;
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

function MoreQuoteInfoController($uibModalInstance, $state, $sce, WeirService) {
    var vm = this;
    vm.Cancel = cancel;
    vm.Continue = gotoDelivery;

	var labels = {
		en: {
		    Title: "You Can Add More Information to this Quote;",
		    Documents: "Add Service Documentation",
		    RefNum: "Add your References",
		    Comments: "Add Comments to your Quote",
		    Continue: "Continue to Delivery Options <i class='fa fa-angle-right' aria-hidden='true'></i>"
		},
		fr: {
			Title: $sce.trustAsHtml("Vous avez la possibilité d'ajouter plus d'informations à cette cotation;"),
		    Documents: $sce.trustAsHtml("Ajouter des documents sur les conditions de services"),
		    RefNum: $sce.trustAsHtml("Ajouter votre référence"),
		    Comments: $sce.trustAsHtml("Ajouter des commentaires à votre cotation"),
		    Continue: $sce.trustAsHtml("Continuer vers les options de livraison <i class='fa fa-angle-right' aria-hidden='true'></i>")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);

    function gotoDelivery() {
		$uibModalInstance.close();
	    if($state.$current.name != "myquote.delivery") {
            $state.go("myquote.delivery");
	    }
    }

    function cancel() {
		$uibModalInstance.close();
	    $state.go("myquote.detail");
    }
}

function NewAddressModalController($uibModalInstance, $sce, WeirService) {
	var vm = this;
	vm.address = {};
	vm.address.xp = {};
	vm.address.xp.active = true;
	vm.address.xp.primary = false;

    var labels = {
        en: {
            Submit: "Submit",
            Cancel: "Cancel"
        },
        fr: {
            Submit: $sce.trustAsHtml("Soumettre"),
            Cancel: $sce.trustAsHtml("Annuler")
        }
    };

    vm.labels = WeirService.LocaleResources(labels);

	vm.submit = function () {
		$uibModalInstance.close(vm.address);
	};

	vm.cancel = function () {
		vm.address = {};
		$uibModalInstance.dismiss('cancel');
	};
}

function SubmitConfirmOrderController($sce, WeirService, Quote, $uibModalInstance) {
	var vm = this;
	vm.Quote = Quote;

	var labels = {
		en: {
			Title: "Thank you. Your order has submitted for review.​",
			MessageText1: "We have sent you a confirmation email.​",
			MessageText2: "We will be in touch with you to discuss the items you have requested to be reviewed.",
			MessageText3: "If your order needs to be revised we will send you an updated quote.",
			Submit: "Submit",
			Close: "Close"
		},
		fr: {
			Title: $sce.trustAsHtml("Nous vous remercions. Votre commande a bien été soumise à la révision.​"),
			MessageText1: $sce.trustAsHtml("Nous vous avons envoyé un e-mail de confirmation"),
			MessageText2: $sce.trustAsHtml("Nous serons en contact avec vous pour discuter des éléments que vous avez demandé d'être examinés"),
			MessageText3: $sce.trustAsHtml("Si votre commande doit être révisée, nous vous enverrons une cotation actualisé."),
            Submit: $sce.trustAsHtml("Soumettre"),
            Close: $sce.trustAsHtml("Fermer")
		}
	};

	vm.Close = function() {
		$uibModalInstance.close();
	};
	vm.labels = WeirService.LocaleResources(labels);
}

function SubmitConfirmController($sce, WeirService, Quote, WithPO, $uibModalInstance) {
    var vm = this;
    vm.Quote = Quote;

	var labels = {
		en: {
		    Title: "Thank you. Your order has been placed",
		    MessageText1: "We have sent you a confirmation email.",
		    MessageText2: "Order number; " + Quote.ID,
		    MessageText3: "We will also send you a detailed order confirmation document via email",
			Close: "Close"
		},
		fr: {
		    Title: $sce.trustAsHtml("Nous vous remercions. Votre commande a bien été reçu."),
		    MessageText1: $sce.trustAsHtml("Nous vous avons envoyé un e-mail de confirmation"),
		    MessageText2: $sce.trustAsHtml("Numéro de cotation: " + Quote.ID),
		    MessageText3: $sce.trustAsHtml("Nous vous enverrons également un document détaillé de confirmation de commande par courrier électronique"),
            Close: $sce.trustAsHtml("Fermer")
		}
	};

	var labelsPending = {
		en: {
			Title: "Thank you. Your order has been submitted pending your PO.",
			MessageText1: "We have sent you a confirmation email.",
			MessageText2: "When we have received your PO we will confirm your order.",
			MessageText3: "If your order needs to be revised we will send you an updated quote.",
            Cancel: "Annuler",
            Close: "Close"
		},
		fr: {
			Title: $sce.trustAsHtml("Nous vous remercions. Votre commande a été soumise en attendant votre commande"),
			MessageText1: $sce.trustAsHtml("Nous vous avons envoyé un e-mail de confirmation"),
			MessageText2: $sce.trustAsHtml("Nous confirmerons votre commande à la réception de votre bon de commande."),
			MessageText3: $sce.trustAsHtml("Si votre commande doit être révisée, nous vous enverrons une cotation actualisée."),
            Cancel: $sce.trustAsHtml("Annuler"),
            Close: $sce.trustAsHtml("Fermer")
		}
	};

	vm.Close = function() {
		$uibModalInstance.dismiss();
	};
	vm.labels = WeirService.LocaleResources(labels);

	if(WithPO) {
		vm.labels = WeirService.LocaleResources(labels);
	} else {
		vm.labels = WeirService.LocaleResources(labelsPending);
	}
}

function ChooseSubmitController($uibModalInstance, $sce, $state, WeirService, QuoteShareService) {
    var vm = this;
    vm.Quote = QuoteShareService.Quote;
	vm.isPOA = QuoteShareService.IsPOA();

    var labels = {
        en: {
            SubmitReview: "Submit quote for review",
            SubmitReviewMessage: $sce.trustAsHtml("<p>Please select Submit quote for review if;<br><br>1. There are items in your quote that you would like Weir to review and confirm.<br>2. You have items in your quote that are POA. Weir will review the quote and provide prices for the POA items.</p>"),
            SubmitReviewBtn: "Submit quote for review",
            ConfirmPO: "Submit Order",
            ConfirmPOMessage: $sce.trustAsHtml("<p>If you select Submit Order you will be able to submit your order as follows;<br><br>1. Submit Order with PO – add your PO number or upload your PO document.<br>2. Submit Order & email PO – submit your order and email your PO (we’ll add it to the order for you).</p>"),
            ConfirmPOBtn: "Submit Order",
			TermsAndConditions: "Review Terms and Conditions"
        },
        fr: {
            SubmitReview: $sce.trustAsHtml("Soumettre un devis pour examen"),
            SubmitReviewMessage: $sce.trustAsHtml("<p>Veuillez sélectionner 'Soumettre votre cotation pour révision' si;<br><br>1. Il y a des articles dans votre cotation que vous souhaitez que Weir révise et confirme. <br>2. Vous avez des articles dans votre cotation qui sont POA. Weir passera en revue le devis et fournira les prix des articles POA.</p>"),
            SubmitReviewBtn: $sce.trustAsHtml("Soumettre un devis pour examen"),
            ConfirmPO: $sce.trustAsHtml("Confirmer la commande"),
            ConfirmPOMessage: $sce.trustAsHtml("<p>Si vous sélectionnez 'Soumettre votre commande', vous pourrez confirmer votre commande comme suit: <br><br> 1.Soumettre votre commande avec bon de commande :  ajoutez votre numéro de commande ou téléchargez votre document de commande.  <br><br>2.Soumettre votre commande & envoyer par mail votre bon de commande  (nous l'ajouterons à la commande pour vous)</p>"),
            ConfirmPOBtn: $sce.trustAsHtml("Confirmer la commande"),
            TermsAndConditions: $sce.trustAsHtml("Termes et conditions")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);

    function _submitForReview() {
        $uibModalInstance.close("Review");
    }

    function _confirmOrderWithPO() {
        $uibModalInstance.close("Submit");
    }

    function _goToTerms() {
    	$uibModalInstance.close();
	    $state.go('myquote.termsandconditions');
    }

    vm.submitForReview = _submitForReview;
    vm.confirmOrderWithPO = _confirmOrderWithPO;
	vm.goToTerms = _goToTerms;
}

function QuoteRevisionsController(WeirService, $state, $sce, QuoteID, Revisions) {
    var vm = this;
    vm.Revisions = Revisions;
    vm.QuoteID = QuoteID;

    function getStatusLabel(statusId) {
        if (statusId) {
            var status = WeirService.LookupStatus(statusId);
            if (status) {
	            return status.label[WeirService.Locale()];
                // TODO: Address localization
            }
        }
        return "";
    }
    function view(quote) {
    	// Catch orders that are despatched, invoiced, or confirmed. they are read only
        if (quote.xp.Active && quote.xp.Status != WeirService.OrderStatus.Despatched.id && quote.xp.Status != WeirService.OrderStatus.Invoiced.id && quote.xp.Status != WeirService.OrderStatus.ConfirmedOrder.id) {
            // ToDo TEST: Current order should be this one. No altering revised quotes.
	        $state.go("revised", {quoteID: quote.ID, buyerID: quote.xp.BuyerID});
        } else {
            $state.go("readonly", { quoteID: quote.ID, buyerID: quote.xp.BuyerID });
        }
    }

    var labels = {
        en: {
            QuoteHeading: "Quote revisions for Quote; " + vm.QuoteID,
            Instructions1: "Select 'view' to view previous revisions for reference",
            Instructions2: "You can view and comment on the current revision",
            SearchQuotes: "Search Quotes",
            Search: "Search",
            QuoteID: "Quote ID",
            CustomerRef: "Customer Ref",
            BusinessName: "Business Name",
            SubmittedBy: "Submitted By",
            QuoteValue: "Quote Value",
            DateRevised: "Date Revised",
            Reviewer: "Reviewer",
            Status: "Status",
            View: "View",
            LoadMore: "Load More",
            NoMatchesFound : $sce.trustAsHtml("<b>No matches found.</b>")
        },
        fr: {
            QuoteHeading: $sce.trustAsHtml("Révision de cotation pour la cotation: " + QuoteID),
            Instructions1: $sce.trustAsHtml("Sélectionnez 'voir' pour afficher les révisions précédentes"),
            Instructions2: $sce.trustAsHtml("Vous pouvez consulter et commenter la révision en cours"),
            SearchQuotes: $sce.trustAsHtml("Rechercher une cotation"),
            Search: $sce.trustAsHtml("Rechercher"),
            QuoteID: $sce.trustAsHtml("Identité de la cotation"),
            CustomerRef: $sce.trustAsHtml("Référence client"),
            BusinessName: $sce.trustAsHtml("Nom de l'entreprise"),
            SubmittedBy: $sce.trustAsHtml("Soumit par"),
            QuoteValue: $sce.trustAsHtml("Montant"),
            DateRevised: $sce.trustAsHtml("Date révisée"),
            Reviewer: $sce.trustAsHtml("Révisé par"),
            Status: $sce.trustAsHtml("Statut"),
            View: $sce.trustAsHtml("Voir"),
            LoadMore: $sce.trustAsHtml("Afficher plus"),
            NoMatchesFound :  $sce.trustAsHtml("<b>No matches found.</b>")

        }
    };
    vm.labels = WeirService.LocaleResources(labels);
    vm.GetStatusLabel = getStatusLabel;
    vm.View = view;
}

function RevisedQuoteController(WeirService, $state, $sce, $timeout, $window, OrderCloudSDK,  Underscore, OCGeography,
                                Quote, ShippingAddress, LineItems, PreviousLineItems, Payments, imageRoot, toastr, Me,
                                fileStore, FilesService, FileSaver, QuoteToCsvService, Catalog, Buyer) {
	var vm = this;
	vm.ImageBaseUrl = imageRoot;
	vm.Zero = 0;

	//Part of the label comparison
	function compare(current,previous) {
		if(current.Quantity === previous.Quantity &&
			current.UnitPrice === previous.UnitPrice &&
			current.xp.TagNumber === previous.xp.TagNumber &&
			current.xp.SN === previous.xp.SN &&
			(
				(typeof current.Product.xp.LeadTime !== "undefined" && typeof previous.Product.xp.LeadTime !== "undefined" &&
					current.Product.xp.LeadTime === previous.Product.xp.LeadTime) ||
				(typeof current.xp.LeadTime !== "undefined" && typeof previous.xp.LeadTime !== "undefined" &&
					current.xp.LeadTime === previous.xp.LeadTime)
			) &&
			(
				(typeof current.Product.xp.ReplacementSchedule !== "undefined" && typeof previous.Product.xp.ReplacementSchedule !== "undefined" &&
					current.Product.xp.ReplacementSchedule === previous.Product.xp.ReplacementSchedule) ||
				(typeof current.xp.ReplacementSchedule !== "undefined" && typeof previous.xp.ReplacementSchedule !== "undefined" &&
					current.xp.ReplacementSchedule === previous.xp.ReplacementSchedule)
			) &&
			(
				(typeof current.Product.Description !== "undefined" && typeof previous.Product.Description !== "undefined" &&
					current.Product.Description === previous.Product.Description) ||
				(typeof current.xp.Description !== "undefined" && typeof previous.xp.Description !== "undefined" &&
					current.xp.Description === previous.xp.Description)
			)
			&&
			(
				(typeof current.Product.Name !== "undefined" && typeof previous.Product.Name !== "undefined" &&
					current.Product.Name === previous.Product.Name) ||
				(typeof current.xp.ProductName !== "undefined" && typeof previous.xp.ProductName !== "undefined" &&
					current.xp.ProductName === previous.xp.ProductName)
			)
		) {
			return null;
		} else {
			return "UPDATED"
		}
	}
	if(LineItems) { //hopefully an easier way to set labels.
		// For each line item, does it exist in previous line items?  If NO then NEW, else are the fields different between the two? If YES then updated.
		vm.LineItems = Underscore.filter(LineItems.Items, function(item) {
			console.log(item);
			var found = false;
			if(item.ProductID == "PLACEHOLDER") { //Match a blank line item
				angular.forEach(PreviousLineItems.Items, function(value, key) {
					if(value.xp.SN == item.xp.SN) {
						found = true;
						item.displayStatus = compare(item,value);
					}
				});
			} else { // Match regular line items
				angular.forEach(PreviousLineItems.Items, function(value, key) {
					if(value.ProductID === item.ProductID) {
						found = true;
						item.displayStatus = compare(item,value);
					}
				});
			}

			if(!found) {
				//new!
				item.displayStatus = "NEW";
			}

			return item;
		});
	} else {
		vm.LineItems = null;
	}

	vm.BuyerID = Me.GetBuyerID();
	vm.Catalog = Catalog;

	if(PreviousLineItems) {
		vm.PreviousLineItems = Underscore.filter(PreviousLineItems.Items, function (item) {
			if(item.ProductID == "PLACEHOLDER") {
				var found = false;
				angular.forEach(LineItems.Items, function(value, key) {
					if(value.xp.SN == item.xp.SN) {
						found = true;
						return;
					}
				});
				if(found) {
					return;
				} else {
					item.displayStatus="DELETED";
					return item; //Deleted blank line item.
				}
			} else {
				if (Underscore.findWhere(LineItems.Items, {ProductID:item.ProductID})) {
					return;
				} else {
					item.displayStatus="DELETED";
					return item; //Deleted normal line item.
				}
			}
		});
	} else {
		vm.PreviousLineItems = null;
	}
	vm.buyer = Me.Org;
	vm.Quote = Quote;
	vm.currency = (vm.Quote.FromCompanyID.substr(0,5) == "WVCUK") ? ("£") : ((vm.Quote.FromCompanyID.substr(0,5) == "WPIFR") ? ("€") : (""));
	vm.ShippingAddress = ShippingAddress;
	vm.CommentsToWeir = Quote.xp.CommentsToWeir;
	vm.CarriageRateForBuyer = Buyer.xp.UseCustomCarriageRate == true ? Buyer.xp.CustomCarriageRate : Catalog.xp.StandardCarriage;
	vm.CarriageRateForBuyer = vm.CarriageRateForBuyer.toFixed(2);
	vm.PONumber = "";
	vm.Payments = Payments.Items;
	var payment = (vm.Payments.length > 0) ? vm.Payments[0] : null;
	if (payment && payment.xp && payment.xp.PONumber) vm.PONumber = payment.xp.PONumber;
	vm.country = function (c) {
		var result = Underscore.findWhere(OCGeography.Countries, { value: c });
		return result ? result.label : '';
	};
	vm.ShowCommentBox = false;
	vm.CommentToWeir = "";
	vm.fileStore = fileStore;
    vm.ShowUpdatedShipping = function () {
        if(vm.Quote.xp.OldShippingData) {
            if (vm.Quote.ShippingCost != vm.Quote.xp.OldShippingData.ShippingCost || vm.Quote.xp.ShippingDescription != vm.Quote.xp.OldShippingData.ShippingDescription) {
                return true;
            } else {
                return false;
            }
        }
        else {
            return false;
        }
    };
	var labels = {
		en: {
			Customer: "Customer; ",
			QuoteNumber: "Quote Number; ",
			QuoteName: "Quote Name; ",
			BackToQuotes: "Back to your Quotes",
			SerialNum: "Serial Number",
			TagNum: "Tag Number (if available)",
			PartNum: "Part Number",
			PartDesc: "Description of Part",
			RecRepl: "Recommended Replacement (yrs)",
			LeadTime: "Lead Time / Availability (days)",
			PricePer: "Price per Item",
			Quantity: "Quantity",
			Total: "Total",
			Removed: "Removed",
			Updated: "Updated",
			New: "New",
			YourAttachments: "Your Attachments",
			YourReference: "Your Reference No; ",
			CommentsHeader: "Your Comments or Instructions",
			DeliveryAddress: "Delivery Address",
			ViewRevisions: "View Previous Revisions",
			Save: "Save",
			Share: "Share",
			Download: "Download",
			Print: "Print",
			Approve: "Approve",
			Reject: "Reject",
			Comments: "Comments",
			Status: "Status",
			OrderDate: "Order Date;",
			Currency: "Currency",
			RejectedMessage: "The Revised Quote has been Rejected.",
			RejectedTitle: "Quote Updated",
			ApprovedMessage: "The Revised Quote has been Accepted",
			ApprovedTitle: "Quote Updated",
			Comment: "Comment",
			AddedComment: " added a comment - ",
			Add: "Add",
			Cancel: "Cancel",
			PriceDisclaimer: "All prices stated do not include UK VAT or delivery",
			ReplacementGuidance: "Recommended replacement guidance; If ordering 5 year spares you should also order all 2 year spares. If ordering 10 year spares, you should also order all 5 year and 2 year spares.",
			POAGuidance: "POA; You can add POA items to your quote and submit your quote for review. We will endeavour to respond with a price for POA items within two days of receipt of your quote request.",
			LeadTimeNotice: "Lead time for all orders will be based on the longest lead time from the list of spares requested",
			PONumber: "PO Number;",
			POA: "POA",
			DescriptionOfShipping: {
				exworks:'Carriage - Ex Works',
				standard:'Carriage Charge'
			},
            POAShipping: "POA"
		},
		fr: {
			Customer: $sce.trustAsHtml("Client "),
			QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation "),
			QuoteName: $sce.trustAsHtml("Nom de la cotation "),
			BackToQuotes: $sce.trustAsHtml("Retour &agrave; vos cotations"),
			SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
			TagNum: $sce.trustAsHtml("Num&eacute;ro de Tag"),
			PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
			PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
			RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute; (ans)"),
			LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison (journées)"),
			PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
			Quantity: $sce.trustAsHtml("Quantit&eacute;"),
			Total: $sce.trustAsHtml("Total"),
			Removed: $sce.trustAsHtml("Supprimé"),
			Updated: $sce.trustAsHtml("Modifié"),
			New: $sce.trustAsHtml("Nouveau"),
			YourAttachments: $sce.trustAsHtml("Vos pi&egrave;ces jointes"),
			YourReference: $sce.trustAsHtml("Votre num&eacute;ro de r&eacute;f&eacute;rence; "),
			CommentsHeader: $sce.trustAsHtml("Vos commentaires ou instructions"),
			DeliveryAddress: $sce.trustAsHtml("Adresse de livraison"),
			ViewRevisions: $sce.trustAsHtml("Voir les r&eacute;visions de commande"),
			Save: $sce.trustAsHtml("Sauvegarder"),
			Share: $sce.trustAsHtml("Partager"),
			Download: $sce.trustAsHtml("T&eacute;l&eacute;charger"),
			Print: $sce.trustAsHtml("Imprimer"),
			Approve: $sce.trustAsHtml("Approuver"),
			Reject: $sce.trustAsHtml("Rejeter"),
			Comments: $sce.trustAsHtml("Commentaires"),
			Status: $sce.trustAsHtml("Statut"),
			OrderDate: $sce.trustAsHtml("Date de commande"),
			Currency: $sce.trustAsHtml("Devise"),
            RejectedMessage: $sce.trustAsHtml("La cotation révisée a ét&eacute; rejetée."),
			RejectedTitle: $sce.trustAsHtml("Cotation mise &agrave; jour"),
			ApprovedMessage: $sce.trustAsHtml("La cotation révisée a été acceptée"),
			ApprovedTitle: $sce.trustAsHtml("Cotation mise à jour"),
			Comment: $sce.trustAsHtml("Commentaire"),
			AddedComment: $sce.trustAsHtml(" A ajouté un commentaire - "),
			Add: $sce.trustAsHtml("Ajouter"),
			Cancel: $sce.trustAsHtml("Annuler"),
			PriceDisclaimer: $sce.trustAsHtml("Tous les prix indiqués ne comprennent pas la TVA ni la livraison en France"),
			ReplacementGuidance: $sce.trustAsHtml("Remplacement recommandé: Si vous commandez les pièces recommandées à 5 ans, vous devriez également commander toutes les pièces recommandées à 2 ans. Si vous commandez des pièces recommandées à 10 ans , vous devez également commander toutes les pièces recommandées à 5 et 2 ans."),
			POAGuidance: $sce.trustAsHtml("Prix à confirmer: Vous pouvez ajouter des articles dont les prix ne sont pas renseignés à votre cotation et soumettre à révision. Nous les renseignerons sur la révision."),
			LeadTimeNotice: $sce.trustAsHtml("Le délai de livraison pour toutes les commandes sera basé sur le délai le plus long de la liste des pièces de rechanges demandées"),
			PONumber: $sce.trustAsHtml("Numéro de bon de commande;"),
            POA: $sce.trustAsHtml("POA"),
			DescriptionOfShipping: {
				exworks:$sce.trustAsHtml('Livraison Départ-Usine (EXW)'),
				standard:$sce.trustAsHtml('Frais de livraison')
			},
            POAShipping: "POA"
		}
	};
	vm.labels = WeirService.LocaleResources(labels);

	vm.GetFile = function(fileName) {
		var orderid = vm.Quote.xp.OriginalOrderID ? vm.Quote.xp.OriginalOrderID : vm.Quote.ID;
		FilesService.Get(orderid + fileName)
			.then(function(fileData) {
				//console.log(fileData);
				var file = new Blob([fileData.Body], {type: fileData.ContentType});
				FileSaver.saveAs(file, fileName);
				//var fileURL = URL.createObjectURL(file);
				//window.open(fileURL, "_blank");
			});
	};

	function _gotoQuotes() {
		if(vm.Quote.xp.Type == "Quote") {
			$state.go("quotes.revised", {filters: JSON.stringify({"xp.Type": "Quote","xp.Status": WeirService.OrderStatus.RevisedQuote.id+"|"+WeirService.OrderStatus.RejectedQuote.id,"xp.Active": true})}, {reload: true});
		} else {
			$state.go("orders.revised", {filters: JSON.stringify({"xp.Type": "Order","xp.Status": WeirService.OrderStatus.RevisedOrder.id,"xp.Active": true})}, {reload: true});
		}
	}

	function _gotoRevisions() {
		if(vm.Quote.xp.OriginalOrderID) {
			$state.go("revisions", { quoteID: vm.Quote.xp.OriginalOrderID });
		}
	}

	vm.AddNewComment = function() {
		var comment = {
			date: new Date(),
			by: Me.Profile.FirstName + " " + Me.Profile.LastName,
			val: vm.CommentToWeir,
			IsWeirComment: false
		};

		if (!vm.Quote.xp.CommentsToWeir || Object.prototype.toString.call(vm.Quote.xp.CommentsToWeir) !== '[object Array]') {
			vm.Quote.xp.CommentsToWeir = [];
		}
		vm.Quote.xp.CommentsToWeir.push(comment);

		OrderCloudSDK.Orders.Patch("Outgoing", vm.Quote.ID, {xp:{CommentsToWeir: vm.Quote.xp.CommentsToWeir}})
			.then(function(order) {
				vm.CommentToWeir = "";
				$state.go($state.current,{}, {reload:true});
			})
			.catch(function(ex) {
				$exceptionHandler(ex);
			})
	};

	function download() {
		$timeout($window.print,1);
	}
	function print() {
		$timeout($window.print,1);
	}
	function getStatusLabel() {
		if (vm.Quote.xp.Status) {
			var status = WeirService.LookupStatus(vm.Quote.xp.Status);
			if (status) {
				return status.label[WeirService.Locale()];
				// TODO: Address localization
			}
		}
		return "";
	}
	function _approve() {
		if (vm.Quote.xp.Status == WeirService.OrderStatus.RevisedQuote.id || vm.Quote.xp.Status == WeirService.OrderStatus.RevisedOrder.id) {
			var mods = {
				xp: {
					StatusDate: new Date(),
					Status: vm.Quote.xp.Type == "Quote" ? WeirService.OrderStatus.ConfirmedQuote.id : WeirService.OrderStatus.ConfirmedOrder.id
				}
			};
			WeirService.UpdateQuote(vm.Quote, mods)
				.then(function (qte) {
					toastr.success(vm.labels.ApprovedMessage, vm.labels.ApprovedTitle);
					$state.go('readonly', { quoteID: vm.Quote.ID, buyerID: Me.GetBuyerID() });
				});
		}
	}
	function _reject() {
		if (vm.Quote.xp.Status == WeirService.OrderStatus.RevisedQuote.id || vm.Quote.xp.Status == WeirService.OrderStatus.RevisedOrder.id) {
			var mods = {
				xp: {
					StatusDate: new Date(),
					Status: vm.Quote.xp.Type == "Quote" ? WeirService.OrderStatus.RejectedQuote.id : WeirService.OrderStatus.RejectedRevisedOrder.id
				}
			};
			WeirService.UpdateQuote(vm.Quote, mods)
				.then(function (qte) {
					toastr.success(vm.labels.RejectedMessage, vm.labels.RejectedTitle);
					$state.go('readonly', { quoteID: vm.Quote.ID, buyerID: Me.GetBuyerID() });
				});
		}
	}
	function _comments() {
		if (vm.Quote.Status == 'RV') {
			//console.log("Do something with comments ...");
		}
	}
	function toCsv() {
		var printLabels = angular.copy(vm.labels);
		var printQuote = angular.copy(vm.Quote);
		return QuoteToCsvService.ToCsvJson(printQuote, vm.LineItems, vm.ShippingAddress, vm.Payments, printLabels);
	}
	vm.ToCsvJson = toCsv;
	vm.CsvFilename = vm.Quote.ID + ".csv";
	vm.GetImageUrl = function(img) {
		return vm.ImageBaseUrl + img;
	};

	vm.gotoQuotes = _gotoQuotes;
	vm.gotoRevisions = _gotoRevisions;
	vm.Download = download;
	vm.Print = print;
	vm.GetStatusLabel = getStatusLabel;
	vm.Approve = _approve;
	vm.Reject = _reject;
	vm.Comments = _comments;
}

function ReadonlyQuoteController($sce, $state, WeirService, $timeout, $window, Quote, ShippingAddress, LineItems, PreviousLineItems, Payments,
                                 imageRoot, OCGeography, Underscore, QuoteToCsvService, fileStore, OrderCloudSDK, FilesService, FileSaver, Catalog, Me) {
    var vm = this;
	vm.Catalog = Catalog;
	vm.buyer = Me.Org;
	vm.fileStore = fileStore;
	vm.ImageBaseUrl = imageRoot;
	vm.Zero = 0;
    vm.Quote = Quote;
	vm.currency = (vm.Quote.FromCompanyID.substr(0,5) == "WVCUK") ? ("£") : ((vm.Quote.FromCompanyID.substr(0,5) == "WPIFR") ? ("€") : (""));
    vm.ShippingAddress = ShippingAddress;
    vm.LineItems = LineItems ? LineItems.Items : [];
	vm.BuyerID = Me.GetBuyerID();
	if(PreviousLineItems) {
		vm.PreviousLineItems = Underscore.filter(PreviousLineItems.Items, function (item) {
			if (Underscore.findWhere(LineItems.Items, {ProductID: item.ProductID})) {
				return;
			} else {
				return item;
			}
		});
	} else {
		vm.PreviousLineItems = [];
	}
    vm.Payments = Payments.Items;
	vm.country = function (c) {
		var result = Underscore.findWhere(OCGeography.Countries, { value: c });
		return result ? result.label : '';
	};
    var labels = {
        en: {
            Customer: "Customer; ",
            QuoteNumber: "Quote Number; ",
            QuoteName: "Quote Name; ",
            SerialNum: "Serial Number",
            TagNum: "Tag Number (if available)",
            PartNum: "Part Number",
            PartDesc: "Description of Part",
            RecRepl: "Recommended Replacement (yrs)",
            LeadTime: "Lead Time (days)",
            PricePer: "Price per Item or Set",
            Quantity: "Quantity",
            Total: "Total",
            YourAttachments: "Your Attachments",
            YourReference: "Your Reference No; ",
            CommentsHeader: "Your Comments or Instructions",
            DeliveryOptions: "Delivery Options",
            DeliveryAddress: "Delivery Address",
            WeirComment: "Comment",
	        Save: "Save",
	        Share: "Share",
	        Download: "Download",
	        Print: "Print",
	        Approve: "Approve",
	        Reject: "Reject",
	        Comments: "Comments",
	        Status: "Status",
	        OrderDate: "Order Date;",
	        Currency: "Currency",
	        BackToQuotes: "Back to your Quotes",
	        SubmitWithPO: "Submit Order",
	        PriceDisclaimer: "All prices stated do not include UK VAT or delivery",
	        ViewRevisions: "View Previous Revisions",
	        ReplacementGuidance: "Recommended replacement guidance; If ordering 5 year spares you should also order all 2 year spares. If ordering 10 year spares, you should also order all 5 year and 2 year spares.",
	        POAGuidance: "POA; You can add POA items to your quote and submit your quote for review. We will endeavour to respond with a price for POA items within two days of receipt of your quote request.",
	        LeadTimeNotice: "Lead time for all orders will be based on the longest lead time from the list of spares requested",
	        PONumber: "PO Number;",
            POA: "POA",
	        PartTypes: "Part types for;",
	        Brand: "Brand",
	        ValveType: "Valve Type",
	        DescriptionOfShipping: {
                exworks:'Carriage - Ex Works',
		        standard:'Carriage Charge'
	        },
            POAShipping: "POA"
        },
        fr: {
            Customer: $sce.trustAsHtml("Client "),
            QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation "),
            QuoteName: $sce.trustAsHtml("Nom de la cotation "),
            SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
            TagNum: $sce.trustAsHtml("Numéro de repère soupape"),
            PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
            PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
            RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute; (ans)"),
            LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison (journées)"),
            PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
            Quantity: $sce.trustAsHtml("Quantit&eacute;"),
            Total: $sce.trustAsHtml("Total"),
            YourAttachments: $sce.trustAsHtml("Vos pi&egrave;ces jointes"),
            YourReference: $sce.trustAsHtml("Votre num&eacute;ro de r&eacute;f&eacute;rence; "),
            CommentsHeader: $sce.trustAsHtml("Vos commentaires ou instructions"),
            DeliveryOptions: $sce.trustAsHtml("Options de livraison"),
            DeliveryAddress: $sce.trustAsHtml("Adresse de livraison"),
            WeirComment: $sce.trustAsHtml("Commenter"),
            Save: $sce.trustAsHtml("Sauvegarder"),
	        Share: $sce.trustAsHtml("Partager"),
	        Download: $sce.trustAsHtml("T&eacute;l&eacute;charger"),
	        Print: $sce.trustAsHtml("Imprimer"),
	        Approve: $sce.trustAsHtml("Approuver"),
	        Reject: $sce.trustAsHtml("Rejeter"),
	        Comments: $sce.trustAsHtml("Commentaires"),
	        Status: $sce.trustAsHtml("Statut"),
	        OrderDate: $sce.trustAsHtml("Date de commande;"),
	        Currency: $sce.trustAsHtml("Devise"),
	        BackToQuotes: $sce.trustAsHtml("Retour &agrave; vos cotations"),
	        SubmitWithPO: $sce.trustAsHtml("Soumettre une commande avec bon de commande"),
	        PriceDisclaimer: $sce.trustAsHtml("Tous les prix indiqués ne comprennent pas la TVA ni la livraison en France"),
	        ViewRevisions: $sce.trustAsHtml("Voir les r&eacute;visions de commande"),
	        ReplacementGuidance: $sce.trustAsHtml("Remplacement recommandé: Si vous commandez les pièces recommandées à 5 ans, vous devriez également commander toutes les pièces recommandées à 2 ans. Si vous commandez des pièces recommandées à 10 ans , vous devez également commander toutes les pièces recommandées à 5 et 2 ans."),
	        POAGuidance: $sce.trustAsHtml("Prix à confirmer: Vous pouvez ajouter des articles dont les prix ne sont pas renseignés à votre cotation et soumettre à révision. Nous les renseignerons sur la révision."),
	        LeadTimeNotice: $sce.trustAsHtml("Le délai de livraison pour toutes les commandes sera basé sur le délai le plus long de la liste des pièces de rechanges demandées"),
	        PONumber: $sce.trustAsHtml("Numéro de bon de commande;"),
            POA: $sce.trustAsHtml("POA"),
	        PartTypes: $sce.trustAsHtml("Pièces pour:"),
	        Brand: $sce.trustAsHtml("Marque:"),
	        ValveType: $sce.trustAsHtml("Type:"),
	        DescriptionOfShipping: {
		        exworks:$sce.trustAsHtml('Livraison Départ-Usine (EXW)'),
		        standard:$sce.trustAsHtml('Frais de livraison')
	        },
            POAShipping: "POA"
        }
    };
    vm.labels = WeirService.LocaleResources(labels);

	vm.GetFile = function(fileName) {
		var orderid = vm.Quote.xp.OriginalOrderID ? vm.Quote.xp.OriginalOrderID : vm.Quote.ID;
		FilesService.Get(orderid + fileName)
			.then(function(fileData) {
				//console.log(fileData);
				var file = new Blob([fileData.Body], {type: fileData.ContentType});
				FileSaver.saveAs(file, fileName);
				//var fileURL = URL.createObjectURL(file);
				//window.open(fileURL, "_blank");
			});
	};

	vm.ToCsvJson = toCsv;
	vm.CsvFilename = vm.Quote.ID + ".csv";
	vm.GetImageUrl = function(img) {
		return vm.ImageBaseUrl + img;
	};
	function download() {
		$timeout($window.print,1);
	}
	function print() {
		$timeout($window.print,1);
	}
	function getStatusLabel() {
		if (vm.Quote.xp.Status) {
			var status = WeirService.LookupStatus(vm.Quote.xp.Status);
			if (status) {
				return status.label[WeirService.Locale()];
				// TODO: Address localization
			}
		}
		return "";
	}
	function toCsv() {
		var printLabels = angular.copy(vm.labels);
		var printQuote = angular.copy(vm.Quote);
		return QuoteToCsvService.ToCsvJson(printQuote, vm.LineItems, vm.ShippingAddress, vm.Payments, printLabels);
	}

	function _gotoQuotes() {
		if(vm.Quote.xp.Type == "Quote") {
			$state.go("quotes.revised", {filters: JSON.stringify({"xp.Type": "Quote","xp.Status": WeirService.OrderStatus.RevisedQuote.id+"|"+WeirService.OrderStatus.RejectedQuote.id,"xp.Active": true})}, {reload: true});
		} else {
			$state.go("orders.revised", {filters: JSON.stringify({"xp.Type": "Order","xp.Status": WeirService.OrderStatus.RevisedOrder.id,"xp.Active": true})}, {reload: true});
		}
	}

	function _gotoRevisions() {
		if(vm.Quote.xp.OriginalOrderID) {
			$state.go("revisions", { quoteID: vm.Quote.xp.OriginalOrderID });
		}
	}

	vm.Download = download;
	vm.Print = print;
	vm.GetStatusLabel = getStatusLabel;
	vm.gotoQuotes = _gotoQuotes;
	vm.gotoRevisions = _gotoRevisions;
}

function SubmitController($sce, toastr, WeirService, $timeout, $window, $uibModal, $state, Quote, ShippingAddress, LineItems,
                          PreviousLineItems, Payments, imageRoot, OCGeography, Underscore, OrderCloudSDK, Me, FilesService, FileSaver, Catalog) {
	var vm = this;
	vm.Catalog = Catalog;
	vm.buyer = Me.Org;
	vm.NewComment = null;
	vm.ImageBaseUrl = imageRoot;
	vm.Zero = 0;
	vm.PONumber = "";
	vm.Quote = Quote;
	vm.currency = (vm.Quote.FromCompanyID.substr(0,5) == "WVCUK") ? ("£") : ((vm.Quote.FromCompanyID.substr(0,5) == "WPIFR") ? ("€") : (""));
	vm.ShippingAddress = ShippingAddress;
	vm.LineItems = LineItems ? LineItems.Items : [];
	vm.BuyerID = Me.GetBuyerID();
	if(PreviousLineItems) {
		vm.PreviousLineItems = Underscore.filter(PreviousLineItems.Items, function (item) {
			if (Underscore.findWhere(LineItems.Items, {ProductID: item.ProductID})) {
				return;
			} else {
				return item;
			}
		});
	} else {
		vm.PreviousLineItems = [];
	}
	vm.Payments = Payments.Items;
	var payment = (vm.Payments.length > 0) ? vm.Payments[0] : null;
	if (payment && payment.xp && payment.xp.PONumber) vm.PONumber = payment.xp.PONumber;
	vm.country = function (c) {
		var result = Underscore.findWhere(OCGeography.Countries, { value: c });
		return result ? result.label : '';
	};
	var labels = {
		en: {
			Customer: "Customer; ",
			QuoteNumber: "Quote Number; ",
			QuoteName: "Quote Name; ",
			SerialNum: "Serial Number",
			TagNum: "Tag Number (if available)",
			PartNum: "Part Number",
			PartDesc: "Description of Part",
			RecRepl: "Recommended Replacement (yrs)",
			LeadTime: "Lead Time (days)",
			PricePer: "Price per Item or Set",
			Quantity: "Quantity",
			Total: "Total",
			YourAttachments: "Your Attachments",
			YourReference: "Your Reference No; ",
			CommentsHeader: "Your Comments or Instructions",
			DeliveryOptions: "Delivery Options",
			DeliveryAddress: "Delivery Address",
			WeirComment: "Comment",
			Save: "Save",
			Share: "Share",
			Download: "Download",
			Print: "Print",
			Approve: "Approve",
			Reject: "Reject",
			Comments: "Comments",
			Status: "Status",
			OrderDate: "Order Date;",
			Currency: "Currency",
			BackToQuotes: "Back to your Quotes",
			SubmitWithPO: "Submit Order",
			SubmitOrderAndEmail: "Submit Order & Email PO",
			SubmitOrderWithPO: "Submit Order",
			EmailPoMessage: "*Your order will be confirmed<br class='message-break'>following receipt of your PO.",
			POEntry: "Enter PO Number",
			PriceDisclaimer: "All prices stated do not include UK VAT or delivery",
			DragAndDrop: "Drag and drop Files Here to Upload",
			PONeededHeader: "Please Provide a Purchase Order to Finalise your Order",
			POUpload: "Upload PO Document",
			ReplacementGuidance: "Recommended replacement guidance; If ordering 5 year spares you should also order all 2 year spares. If ordering 10 year spares, you should also order all 5 year and 2 year spares.",
			POAGuidance: "POA; You can add POA items to your quote and submit your quote for review. We will endeavour to respond with a price for POA items within two days of receipt of your quote request.",
			LeadTimeNotice: "Lead time for all orders will be based on the longest lead time from the list of spares requested",
			Add: "Add",
			Cancel: "Cancel",
			AddedComment: " added a comment - ",
			PONumber: "PO Number;",
			POA: "POA",
            EmptyComments: $sce.trustAsHtml("Cannot save an empty comment."),
            EmptyCommentTitle: $sce.trustAsHtml("Empty Comment"),
			DescriptionOfShipping: {
				exworks:'Carriage - Ex Works',
				standard:'Carriage Charge'
			},
			POAShipping: "POA"
		},
		fr: {
			Customer: $sce.trustAsHtml("Client "),
			QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation "),
			QuoteName: $sce.trustAsHtml("Nom de la cotation "),
			SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
			TagNum: $sce.trustAsHtml("Num&eacute;ro de Tag"),
			PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
			PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
			RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute; (ans)"),
			LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison (journées)"),
			PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
			Quantity: $sce.trustAsHtml("Quantit&eacute;"),
			Total: $sce.trustAsHtml("Total"),
			YourAttachments: $sce.trustAsHtml("Vos pi&egrave;ces jointes"),
			YourReference: $sce.trustAsHtml("Votre num&eacute;ro de r&eacute;f&eacute;rence; "),
			CommentsHeader: $sce.trustAsHtml("Vos commentaires ou instructions"),
			DeliveryOptions: $sce.trustAsHtml("Options de livraison"),
			DeliveryAddress: $sce.trustAsHtml("Adresse de livraison"),
			WeirComment: $sce.trustAsHtml("Commenter"),
			Save: $sce.trustAsHtml("Sauvegarder"),
			Share: $sce.trustAsHtml("Partager"),
			Download: $sce.trustAsHtml("T&eacute;l&eacute;charger"),
			Print: $sce.trustAsHtml("Imprimer"),
			Approve: $sce.trustAsHtml("Approuver"),
			Reject: $sce.trustAsHtml("Rejeter"),
			Comments: $sce.trustAsHtml("Commentaires"),
			Status: $sce.trustAsHtml("Statut"),
			OrderDate: $sce.trustAsHtml("Date de commande;"),
			Currency: $sce.trustAsHtml("Devise"),
			BackToQuotes: $sce.trustAsHtml("Retour &agrave; vos devis"),
			SubmitWithPO: $sce.trustAsHtml("Soumettre une commande avec bon de commande"),
			SubmitOrderAndEmail: $sce.trustAsHtml("Soumettre une commande<br>& E-Mail de pi&egrave;ce de rechange"),
			SubmitOrderWithPO: $sce.trustAsHtml("Soumettre une commande<br>avec bon de commande"),
			EmailPoMessage: $sce.trustAsHtml("Votre commande sera confirmée<br class='message-break'>après réception de votre bon de commande."),
			POEntry: $sce.trustAsHtml("Entrer une r&eacute;f&eacute;rence de commande"),
			PriceDisclaimer: $sce.trustAsHtml("Tous les prix indiqués ne comprennent pas la TVA ni la livraison en France"),
			DragAndDrop: $sce.trustAsHtml("Faites glisser vos documents ici pour les t&eacute;l&eacute;charger"),
			PONeededHeader: $sce.trustAsHtml("Veuillez fournir un bon de commande pour finaliser votre commande"),
			POUpload: $sce.trustAsHtml("T&eacute;l&eacute;charger le bon de commande"),
			ReplacementGuidance: $sce.trustAsHtml("Remplacement recommandé: Si vous commandez les pièces recommandées à 5 ans, vous devriez également commander toutes les pièces recommandées à 2 ans. Si vous commandez des pièces recommandées à 10 ans , vous devez également commander toutes les pièces recommandées à 5 et 2 ans."),
			POAGuidance: $sce.trustAsHtml("Prix à confirmer: Vous pouvez ajouter des articles dont les prix ne sont pas renseignés à votre cotation et soumettre à révision. Nous les renseignerons sur la révision."),
			LeadTimeNotice: $sce.trustAsHtml("Le délai de livraison pour toutes les commandes sera basé sur le délai le plus long de la liste des pièces de rechanges demandées"),
			Add: $sce.trustAsHtml("Ajouter"),
			Cancel: $sce.trustAsHtml("Annule"),
			AddedComment: $sce.trustAsHtml("A ajouté un commentaire "),
			PONumber: $sce.trustAsHtml("Numéro de bon de commande;"),
            POA: $sce.trustAsHtml("POA"),
            EmptyComments: $sce.trustAsHtml("Impossible d'enregistrer un commentaire vide."),
            EmptyCommentTitle: $sce.trustAsHtml("Commentaire vide"),
			DescriptionOfShipping: {
				exworks:$sce.trustAsHtml('Livraison Départ-Usine (EXW)'),
				standard:$sce.trustAsHtml('Frais de livraison')
			},
			POAShipping: "POA"
		}
	};
	vm.labels = WeirService.LocaleResources(labels);

	vm.AddNewComment = function() {
		if (vm.NewComment) {
			var comment = {
				date: new Date(),
				by: Me.Profile.FirstName + " " + Me.Profile.LastName,
				val: vm.NewComment,
				IsWeirComment: false
			};

			// Take the new comment, push it onto the current comments to weir then patch.
			if (!vm.Quote.xp.CommentsToWeir || Object.prototype.toString.call(vm.Quote.xp.CommentsToWeir) !== '[object Array]') {
				vm.Quote.xp.CommentsToWeir = [];
			}
			vm.Quote.xp.CommentsToWeir.push(comment);
			OrderCloudSDK.Orders.Patch("Outgoing", vm.Quote.ID, {xp: {CommentsToWeir: vm.Quote.xp.CommentsToWeir}})
				.then(function (quote) {
					vm.Quote = quote;
				});
			vm.NewComment = null; //BE SURE TO DO THIS IN THE CHILD CONTROLLER
		} else {
			toastr.info(vm.labels.EmptyComments,vm.labels.EmptyCommentTitle);
		}
	};

	vm.GetFile = function(fileName) {
		var orderid = vm.Quote.xp.OriginalOrderID ? vm.Quote.xp.OriginalOrderID : vm.Quote.ID;
		FilesService.Get(orderid + fileName)
			.then(function(fileData) {
				//console.log(fileData);
				var file = new Blob([fileData.Body], {type: fileData.ContentType});
				FileSaver.saveAs(file, fileName);
			});
	};

	vm.ToCsvJson = toCsv;
	vm.CsvFilename = vm.Quote.ID + ".csv";
	vm.GetImageUrl = function(img) {
		return vm.ImageBaseUrl + img;
	};

	function download() {
		$timeout($window.print,1);
	}
	function print() {
		$timeout($window.print,1);
	}
	function getStatusLabel() {
		if (vm.Quote.xp.Status) {
			var status = WeirService.LookupStatus(vm.Quote.xp.Status);
			if (status) {
				return status.label[WeirService.Locale()];
				// TODO: Address localization
			}
		}
		return "";
	}
	function toCsv() {
		var printLabels = angular.copy(vm.labels);
		var printQuote = angular.copy(vm.Quote);
		return QuoteToCsvService.ToCsvJson(printQuote, QuoteShareService.LineItems, vm.ShippingAddress, QuoteShareService.Payments, printLabels);
	}
	function _gotoQuotes() {
		if(vm.Quote.xp.Type == "Quote") {
			$state.go("quotes.revised", {filters: JSON.stringify({"xp.Type": "Quote","xp.Status": WeirService.OrderStatus.RevisedQuote.id+"|"+WeirService.OrderStatus.RejectedQuote.id,"xp.Active": true})}, {reload: true});
		} else {
			$state.go("orders.revised", {filters: JSON.stringify({"xp.Type": "Order","xp.Status": WeirService.OrderStatus.RevisedOrder.id,"xp.Active": true})}, {reload: true});
		}
	}
	// ToDo Accept a parameter withPO. It will be true or false.
	function _submitOrder(withPO) {
		if (payment == null) {
			if (vm.PONumber) {
				var data = {
					Type: "PurchaseOrder",
					xp: {
						PONumber: vm.PONumber
					}
				};
				OrderCloudSDK.Payments.Create("Outgoing", vm.Quote.ID, data)
					.then(function (pmt) {
						vm.Payments.push(pmt);
						payment = pmt;
						completeSubmit(withPO);
					})
			} else {
				// email the PO later. Can we acutally submit without a PO?
				completeSubmit(withPO);
			}
		} else if (!payment.xp || payment.xp.PONumber != vm.PONumber) {
			var data = {
				xp: {
					PONumber: vm.PONumber
				}
			};
			OrderCloudSDK.Payments.Patch("Outgoing", vm.Quote.ID, payment.ID, data)
				.then(function (pmt) {
					vm.Payments[0] = pmt;
					payment = pmt;
					completeSubmit(withPO);
				})
		} else {
			completeSubmit(withPO);
		}
	}
	function completeSubmit(withPO) {
		var data = {};
		if(withPO) {
			data = {
				xp: {
					Status: WeirService.OrderStatus.SubmittedWithPO.id,
					StatusDate: new Date(),
					Type: "Order",
					Revised: false,
					PONumber: vm.PONumber,
					PendingPO: false
				}
			};
		} else {
			data = {
				xp: {
					Status: WeirService.OrderStatus.SubmittedPendingPO.id,
					StatusDate: new Date(),
					Type: "Order",
					PendingPO: true,
					PONumber: "Pending",
					Revised: false
				}
			};
		}
		WeirService.UpdateQuote(vm.Quote, data)
			.then(function (info) {
				var modalInstance = $uibModal.open({
					animation: true,
					ariaLabelledBy: 'modal-title',
					ariaDescribedBy: 'modal-body',
					templateUrl: 'myquote/templates/myquote.orderplacedconfirm.tpl.html',
					size: 'lg',
					controller: 'SubmitConfirmCtrl',
					controllerAs: 'submitconfirm',
					resolve: {
						Quote: function () {
							return vm.Quote;
						},
						WithPO: function() {
							return withPO;
						}
					}
				}).closed.then(function () {
					$state.go('readonly', { quoteID: vm.Quote.ID, buyerID: Me.GetBuyerID() });
				});
			});
	}

	vm.Download = download;
	vm.Print = print;
	vm.GetStatusLabel = getStatusLabel;
	vm.gotoQuotes = _gotoQuotes;
	vm.submitOrder = _submitOrder;
}

function TermsAndConditionsController($sce,WeirService){
    var vm = this;
	var labels = {
        en: {
            TermsAndConditions: "Terms And Conditions"
        },
        fr: {
            TermsAndConditions: $sce.trustAsHtml("Termes et conditions")
        }
    };
    var navlabels = WeirService.navBarLabels();
    switch (WeirService.Locale()) {
        case 'fr':
            vm.navlabels = navlabels.fr;
            break;
        default:
            vm.navlabels = navlabels.en;
            break;
    }
    vm.labels = WeirService.LocaleResources(labels);
}

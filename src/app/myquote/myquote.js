angular.module('orderCloud')
    .service( 'QuoteShareService', QuoteShareService)
    .service('QuoteHelperService', QuoteHelperService)
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
;

function QuoteShareService() {
    var svc = {
        LineItems: [],
        Payments: [],
	    Quote: null,
	    Me: null
    };
    return svc;
}

function QuoteHelperService($q, OrderCloud) {
    function findRevisions(quoteID) {
        var filter = {
                "xp.OriginalOrderID": quoteID
        };
        return OrderCloud.Orders.ListOutgoing(null, null, null, 1, 100, null, "DateCreated", filter);
    }

    var service = {
        FindQuoteRevisions: findRevisions
    };
    return service;
}

function MyQuoteConfig($stateProvider) {
	$stateProvider
		.state('myquote', {
		    parent: 'base',
		    url: '/myquote',
		    templateUrl: 'myquote/templates/myquote.tpl.html',
		    controller: 'MyQuoteCtrl',
		    controllerAs: 'myquote',
		    resolve: {
			    Me: function (OrderCloud) {
				    return OrderCloud.Me.Get();
			    },
			    Customer: function (CurrentOrder) {
				    return CurrentOrder.GetCurrentCustomer();
			    },
		        Quote: function (CurrentOrder) {
		            return CurrentOrder.Get();
		        },
		        ShippingAddress: function (Quote, OrderCloud) {
		            if (Quote.ShippingAddressID) return OrderCloud.Addresses.Get(Quote.ShippingAddressID, Quote.xp.CustomerID);
		            return null;
		        },
		        LineItems: function ($q, $state, toastr, Underscore, CurrentOrder, OrderCloud, LineItemHelpers, QuoteShareService) {
		            QuoteShareService.LineItems.length = 0;
		            var dfd = $q.defer();
		            CurrentOrder.GetID()
                        .then(function (id) {
                            OrderCloud.LineItems.List(id)
                                .then(function (data) {
                                    if (!data.Items.length) {
                                        toastr.error('Your quote does not contain any line items.', 'Error');
                                        dfd.resolve({ Items: [] });
                                    } else {
	                                    LineItemHelpers.GetBlankProductInfo(data.Items);
                                        LineItemHelpers.GetProductInfo(data.Items)
                                            .then(function () { dfd.resolve(data); });
                                    }
                                })
                        })
                        .catch(function () {
                            toastr.error('Your quote does not contain any line items.', 'Error');
                            dfd.resolve({ Items: [] });
                        });
		            return dfd.promise;
		        },
			    PreviousLineItems: function($q, toastr, OrderCloud, Quote, LineItemHelpers) {
				    // We can't have a quantity of 0 on a line item. With show previous line items
				    // Split the current order ID. If a rec exists, get, else do nothing.
				    var pieces = Quote.ID.split('-Rev');
				    if(pieces.length > 1) {
					    var prevId = pieces[0] + "-Rev" + (pieces[1] - 1).toString();
					    var dfd = $q.defer();
					    OrderCloud.LineItems.List(prevId,null,null,null,null,null,null,Quote.xp.CustomerID)
						    .then(function(data) {
							    if (!data.Items.length) {
								    toastr.error('Previous quote does not contain any line items.', 'Error');
								    dfd.resolve({ Items: [] });
							    } else {
								    LineItemHelpers.GetBlankProductInfo(data.Items);
								    LineItemHelpers.GetProductInfo(data.Items)
									    .then(function () { dfd.resolve(data); });
							    }
						    })
						    .catch(function () {
							    toastr.error('Previous quote does not contain any line items.', 'Error');
							    dfd.resolve({ Items: [] });
						    });
					    return dfd.promise;
				    } else {
					    return null;
				    }
			    },
		        Payments: function (Quote, OrderCloud) {
		            return OrderCloud.Payments.List(Quote.ID,null,null,null,null,null,null,Quote.xp.CustomerID);
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
				Addresses: function(OrderCloud, Quote) {
					return OrderCloud.Addresses.List(null,null,null,null,null,null,Quote.xp.CustomerID);
				}
			}
		})
		.state( 'myquote.review', {
			url: '/review',
			templateUrl: 'myquote/templates/myquote.review.tpl.html',
			controller: 'ReviewQuoteCtrl',
			controllerAs: 'review'
		})
		.state('revised', {
			parent: 'base',
		    url: '/revised?quoteID&buyerID',
		    templateUrl: 'myquote/templates/myquote.revised.tpl.html',
		    controller: 'RevisedQuoteCtrl',
		    controllerAs: 'revised',
			resolve: {
				Quote: function ($stateParams, OrderCloud) {
					return OrderCloud.Orders.Get($stateParams.quoteID, $stateParams.buyerID);
				},
				ShippingAddress: function (Quote, OrderCloud) {
					if (Quote.ShippingAddressID) return OrderCloud.Addresses.Get(Quote.ShippingAddressID, Quote.xp.CustomerID);
					return null;
				},
				LineItems: function ($q, toastr, OrderCloud, LineItemHelpers, Quote) {
					//QuoteShareService.LineItems.length = 0;
					var dfd = $q.defer();
					OrderCloud.LineItems.List(Quote.ID)
						.then(function (data) {
							if (!data.Items.length) {
								toastr.error('Your quote does not contain any line items.', 'Error');
								dfd.resolve({ Items: [] });
							} else {
								LineItemHelpers.GetBlankProductInfo(data.Items);
								LineItemHelpers.GetProductInfo(data.Items)
									.then(function () { dfd.resolve(data); });
							}
						})
						.catch(function () {
							toastr.error('Your quote does not contain any line items.', 'Error');
							dfd.resolve({ Items: [] });
						});
					return dfd.promise;
				},
				PreviousLineItems: function($q, toastr, OrderCloud, Quote, LineItemHelpers) {
					// We can't have a quantity of 0 on a line item. With show previous line items
					// Split the current order ID. If a rec exists, get, else do nothing.
					var pieces = Quote.ID.split('-Rev');
					if(pieces.length > 1) {
						var prevId = pieces[0] + "-Rev" + (pieces[1] - 1).toString();
						var dfd = $q.defer();
						OrderCloud.LineItems.List(prevId,null,null,null,null,null,null,Quote.xp.CustomerID)
							.then(function(data) {
								if (!data.Items.length) {
									toastr.error('Previous quote does not contain any line items.', 'Error');
									dfd.resolve({ Items: [] });
								} else {
									LineItemHelpers.GetBlankProductInfo(data.Items);
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
				Payments: function ($stateParams, OrderCloud) {
					return OrderCloud.Payments.List($stateParams.quoteID);
				}
			}
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
		.state('myquote.submitquote', {
			url: '/submitquote',
			templateUrl: 'myquote/templates/myquote.review.tpl.html',
			controller: 'ReviewQuoteCtrl',
			controllerAs: 'review'
		})
		.state('readonly', {
			parent: 'base',
		    url: '/readonly?quoteID&buyerID',
		    templateUrl: 'myquote/templates/myquote.readonly.tpl.html',
		    controller: 'ReadonlyQuoteCtrl',
		    controllerAs: 'readonly',
		    resolve: {
			    Quote: function ($stateParams, OrderCloud) {
				    return OrderCloud.Orders.Get($stateParams.quoteID, $stateParams.buyerID);
			    },
			    ShippingAddress: function (Quote, OrderCloud) {
				    if (Quote.ShippingAddressID) return OrderCloud.Addresses.Get(Quote.ShippingAddressID, Quote.xp.CustomerID);
				    return null;
			    },
			    LineItems: function ($q, toastr, OrderCloud, LineItemHelpers, Quote) {
				    //QuoteShareService.LineItems.length = 0;
				    var dfd = $q.defer();
				    OrderCloud.LineItems.List(Quote.ID)
					    .then(function (data) {
						    if (!data.Items.length) {
							    toastr.error('Your quote does not contain any line items.', 'Error');
							    dfd.resolve({ Items: [] });
						    } else {
							    LineItemHelpers.GetBlankProductInfo(data.Items);
							    LineItemHelpers.GetProductInfo(data.Items)
								    .then(function () { dfd.resolve(data); });
						    }
					    })
					    .catch(function () {
						    toastr.error('Your quote does not contain any line items.', 'Error');
						    dfd.resolve({ Items: [] });
					    });
				    return dfd.promise;
			    },
			    PreviousLineItems: function($q, toastr, OrderCloud, Quote, LineItemHelpers) {
				    // We can't have a quantity of 0 on a line item. With show previous line items
				    // Split the current order ID. If a rec exists, get, else do nothing.
				    var pieces = Quote.ID.split('-Rev');
				    if(pieces.length > 1) {
					    var prevId = pieces[0] + "-Rev" + (pieces[1] - 1).toString();
					    var dfd = $q.defer();
					    OrderCloud.LineItems.List(prevId,null,null,null,null,null,null,Quote.xp.CustomerID)
						    .then(function(data) {
							    if (!data.Items.length) {
								    toastr.error('Previous quote does not contain any line items.', 'Error');
								    dfd.resolve({ Items: [] });
							    } else {
								    LineItemHelpers.GetBlankProductInfo(data.Items);
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
			    Payments: function ($stateParams, OrderCloud) {
				    return OrderCloud.Payments.List($stateParams.quoteID);
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
				Quote: function ($stateParams, OrderCloud) {
					return OrderCloud.Orders.Get($stateParams.quoteID, $stateParams.buyerID);
				},
				ShippingAddress: function (Quote, OrderCloud) {
					if (Quote.ShippingAddressID) return OrderCloud.Addresses.Get(Quote.ShippingAddressID, Quote.xp.CustomerID);
					return null;
				},
				LineItems: function ($q, toastr, OrderCloud, LineItemHelpers, Quote) {
					//QuoteShareService.LineItems.length = 0;
					var dfd = $q.defer();
					OrderCloud.LineItems.List(Quote.ID)
						.then(function (data) {
							if (!data.Items.length) {
								toastr.error('Your quote does not contain any line items.', 'Error');
								dfd.resolve({ Items: [] });
							} else {
								LineItemHelpers.GetBlankProductInfo(data.Items);
								LineItemHelpers.GetProductInfo(data.Items)
									.then(function () { dfd.resolve(data); });
							}
						})
						.catch(function () {
							toastr.error('Your quote does not contain any line items.', 'Error');
							dfd.resolve({ Items: [] });
						});
					return dfd.promise;
				},
				PreviousLineItems: function($q, toastr, OrderCloud, Quote, LineItemHelpers) {
					// We can't have a quantity of 0 on a line item. With show previous line items
					// Split the current order ID. If a rec exists, get, else do nothing.
					var pieces = Quote.ID.split('-Rev');
					if(pieces.length > 1) {
						var prevId = pieces[0] + "-Rev" + (pieces[1] - 1).toString();
						var dfd = $q.defer();
						OrderCloud.LineItems.List(prevId,null,null,null,null,null,null,Quote.xp.CustomerID)
							.then(function(data) {
								if (!data.Items.length) {
									toastr.error('Previous quote does not contain any line items.', 'Error');
									dfd.resolve({ Items: [] });
								} else {
									LineItemHelpers.GetBlankProductInfo(data.Items);
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
				Payments: function ($stateParams, OrderCloud) {
					return OrderCloud.Payments.List($stateParams.quoteID);
				}
			}
		})
    ;
}

function MyQuoteController($sce, $state, $uibModal, $timeout, $window, toastr, WeirService, Me, Quote, ShippingAddress, Customer, LineItems, Payments, QuoteShareService, imageRoot, QuoteToCsvService) {
	var vm = this;
	vm.Quote = Quote;
	console.log(vm.Quote);
	vm.Customer = Customer;
	vm.ShippingAddress = ShippingAddress;
	vm.ImageBaseUrl = imageRoot;
	vm.SaveableStatuses = [
		WeirService.OrderStatus.Draft.id,
		WeirService.OrderStatus.Saved.id
	];
	QuoteShareService.Quote = Quote;
	QuoteShareService.Me = Me;
	QuoteShareService.LineItems.push.apply(QuoteShareService.LineItems, LineItems.Items);
	QuoteShareService.Payments.push.apply(QuoteShareService.Payments, Payments.Items);
	vm.GetImageUrl = function(img) {
	    return vm.ImageBaseUrl + img;
	};
	vm.HasLineItems = function () {
	    return (QuoteShareService.LineItems && QuoteShareService.LineItems.length);
	};
	vm.Readonly = function () {
	    $state.go("readonly", { quoteID: vm.Quote.ID, buyerID: vm.Quote.xp.CustomerID });
	};
	vm.imageRoot = imageRoot;
	function toCsv() {
	    return QuoteToCsvService.ToCsvJson(vm.Quote, QuoteShareService.LineItems, vm.ShippingAddress, QuoteShareService.Payments, vm.labels);
	}
	vm.ToCsvJson = toCsv;
	vm.CsvFilename = vm.Quote.ID + ".csv";

	function getStatusLabel() {
	    if (vm.Quote.xp.Status) {
	        var status = WeirService.LookupStatus(vm.Quote.xp.Status);
	        if (status) {
	            return status.label;
	            // TODO: Address localization
	        }
	    }
	    return "";
	}
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

		WeirService.UpdateQuote(vm.Quote, mods, assignQuoteNumber, vm.Customer.id)
			.then(function(quote) {
				if(assignQuoteNumber) {
					vm.Quote = quote;
					toastr.success(vm.labels.SaveSuccessMessage, vm.labels.SaveSuccessTitle);
					var modalInstance = $uibModal.open({
						animation: true,
						ariaLabelledBy: 'modal-title',
						ariaDescribedBy: 'modal-body',
						templateUrl: 'modalConfirmation.html',
						controller: 'ModalInstanceCtrl',
						controllerAs: 'myQuote',
						resolve: {
							quote: function () {
								return vm.Quote;
							},
							labels: function () {
								return vm.labels;
							}
						}
					});
					modalInstance.result;
				}
				return;
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
	            $state.go('readonly', { quoteID: vm.Quote.ID, buyerID: vm.Quote.xp.CustomerID });
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
	            $state.go('readonly', { quoteID: vm.Quote.ID, buyerID: vm.Quote.xp.CustomerID });
            });
        }
	}

	function _comments() {
	    if (vm.Quote.Status == 'RV') {
	        console.log("Do something with comments ...");
	    }
	}

	function gotoDelivery(dirty) {
		if(dirty) {
			save();
		}

		if (!$state.is("myquote.detail") || (vm.Quote.Comments && vm.Quote.xp.RefNum && vm.Quote.xp.Files && vm.Quote.xp.Files.length)) {
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
		$timeout($window.print,1);
	}
	function print() {
		$timeout($window.print,1);
	}

	var labels = {
	    en: {
	        YourQuote: "Your Quote",
	        QuoteNumber: "Quote number; ",
	        QuoteName: "Add your quote name ",
	        YourReference: "Your Reference No; ",
	        DeliveryOptions: "Delivery Options",
	        ReviewQuote: "Review Quote",
	        SubmitQuote: "Submit Quote or Order",
            PONumber: "PO Number",
            SerialNum: "Serial number",
            TagNum: "Tag number (if available)",
            PartNum: "Part number",
            PartDesc: "Description of part",
            RecRepl: "Recommended replacement",
            LeadTime: "Lead time",
            PricePer: "Price per item or set",
            Quantity: "Quantity",
            Total: "Total",
            DeliveryAddress: "Delivery Address",
            Save: "Save",
	        Share: "Share",
	        Download: "Download",
	        Print: "Print",
	        SaveSuccessTitle: "Quote Saved",
	        SaveSuccessMessage: "Your changes have been saved",
	        NoItemsError: "Please add parts to quote before saving",
	        CannotContinueNoItems: "Please add parts to quote before continuing",
	        SaveBody: "Your quote has been saved.",
	        SaveFooter: "View Your Quotes",
	        Approve: "Approve",
	        Reject: "Reject",
	        Comments: "Comments",
	        Status: "Status",
	        OrderDate: "Order date;",
	        RejectedMessage: "The revised quote has been rejected.",
	        RejectedTitle: "Quote updated",
	        ApprovedMessage: "The revised quote has been accepted",
	        ApprovedTitle: "Quote updated",
	        SubmitWithPO: "Submit Order with PO",
	        PriceDisclaimer: "All prices stated do not include UK VAT or delivery"
	    },
		fr: {
		    YourQuote: $sce.trustAsHtml("Votre Cotation"),
		    QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation"),
		    QuoteName: $sce.trustAsHtml("**Ajoutez votre nom de devis "),
		    YourReference: $sce.trustAsHtml("Votre num&eacute;ro de r&eacute;f&eacute;rence; "),
		    DeliveryOptions: $sce.trustAsHtml("Options de livraison"),
		    ReviewQuote: $sce.trustAsHtml("R&eacute;viser votre cotation"),
			SubmitQuote: $sce.trustAsHtml("FR: Submit Quote or Order"),
			PONumber: $sce.trustAsHtml("FR: PO Number"),
			SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
			TagNum: $sce.trustAsHtml("Num&eacute;ro de Tag"),
			PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
			PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
			RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute;"),
			LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison"),
			PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
			Quantity: $sce.trustAsHtml("Quantit&eacute;"),
			Total: $sce.trustAsHtml("Total"),
			DeliveryAddress: $sce.trustAsHtml("Delivery Address"),
			Save: $sce.trustAsHtml("Sauvegarder"),
			Share: $sce.trustAsHtml("Partager"),
			Download: $sce.trustAsHtml("T&eacute;l&eacute;charger"),
			Print: $sce.trustAsHtml("Imprimer"),
			SaveSuccessTitle: $sce.trustAsHtml("Cotation enregistr&eacute;e"),
			SaveSuccessMessage: $sce.trustAsHtml("Vos modifications ont &eacute;t&eacute; enregistr&eacute;es"),
			NoItemsError: $sce.trustAsHtml("Veuillez ajouter des pi&egrave;ces de rechanges avant de sauvegarder"),
			CannotContinueNoItems: $sce.trustAsHtml("Veuillez ajouter des pi&egrave;ces de rechanges avant de continuer"),
			SaveBody: $sce.trustAsHtml("FR: Your quote has been saved."),
			SaveFooter: $sce.trustAsHtml("**Voir vos cotations"),
			Approve: $sce.trustAsHtml("FR: Approve"),
			Reject: $sce.trustAsHtml("FR: Reject"),
			Comments: $sce.trustAsHtml("FR: Comments"),
			Status: $sce.trustAsHtml("FR: Status"),
			OrderDate: $sce.trustAsHtml("FR: Order date;"),
			RejectedMessage: $sce.trustAsHtml("FR: The revised quote has been rejected."),
			RejectedTitle: $sce.trustAsHtml("FR: Quote updated"),
			ApprovedMessage: $sce.trustAsHtml("FR: The revised quote has been accepted"),
			ApprovedTitle: $sce.trustAsHtml("FR: Quote updated"),
			SubmitWithPO: $sce.trustAsHtml("Submit Order with PO"),
			PriceDisclaimer: $sce.trustAsHtml("FR - All prices stated do not include UK VAT or delivery")
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
	vm.GetStatusLabel = getStatusLabel;
	vm.Approve = _approve;
	vm.Reject = _reject;
	vm.Comments = _comments;
}

function MyQuoteDetailController(WeirService, $state, $sce, $exceptionHandler, $rootScope, OrderCloud, QuoteShareService) {
    if ((QuoteShareService.Quote.xp.Status == WeirService.OrderStatus.RevisedQuote.id) ||
        (QuoteShareService.Quote.xp.Status == WeirService.OrderStatus.RevisedOrder.id)) {
        $state.go("revised", {quoteID: QuoteShareService.Quote.ID, buyerID: QuoteShareService.Quote.xp.CustomerID});
    }
	var vm = this;
	vm.LineItems = QuoteShareService.LineItems;
	var labels = {
		en: {
            Customer: "Customer; ",
            QuoteNumber: "Quote number; ",
            QuoteName: "Add your quote name ",
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
            RefNumHeader: "Add your reference number",
            CommentsHeader: "Your comments or instructions",
            CommentsInstr: "Please add any specific comments or instructions for this quote",
		    DeliveryOptions: "Delivery Options",
			Update: "Update",
			DragAndDrop: "Drag and drop files here to upload"
		},
		fr: {
			Customer: $sce.trustAsHtml("Client"),
			QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation"),
			QuoteName: $sce.trustAsHtml("**Ajoutez votre nom de devis "),
			AddNew: $sce.trustAsHtml("Ajouter un item"),
			SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
			TagNum: $sce.trustAsHtml("Num&eacute;ro de Tag"),
			PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
			PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
			RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute;"),
			LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison"),
			PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
			Quantity: $sce.trustAsHtml("Quantit&eacute;"),
			Total: $sce.trustAsHtml("Total"),
			UploadHeader: $sce.trustAsHtml("T&eacute;l&eacute;charger vos documents concernant vos conditions de services"),
            UploadInstruct: $sce.trustAsHtml("Veuillez t&eacute;l&eacute;charger tout type de document concernant vos soupapes ou vos pi&egrave;ces de rechanges. De ce fait, nous pouvons les utiliser comme r&eacute;f&eacute;rence pour cette cotation."),
            RefNumHeader: $sce.trustAsHtml("Ajouter votre num&eacute;ro de r&eacute;f&eacute;rence"),
            CommentsHeader: $sce.trustAsHtml("Vos commentaires ou instructions"),
            CommentsInstr: $sce.trustAsHtml("Veuillez ajouter tout commentaire ou instructions sp&eacute;cifiques pour cette cotation"),
            DeliveryOptions: $sce.trustAsHtml("Options de livraison"),
			Update: $sce.trustAsHtml("Mettre &agrave; jour"),
			DragAndDrop: $sce.trustAsHtml("FR: Drag and drop files here to upload")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);

	vm.deleteLineItem = _deleteLineItem;
	function _deleteLineItem(quoteNumber, itemid) {
		OrderCloud.LineItems.Delete(quoteNumber, itemid, QuoteShareService.Quote.xp.CustomerID)
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
		OrderCloud.LineItems.Patch(quoteNumber, item.ID, patch, QuoteShareService.Quote.xp.CustomerID)
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

}

function QuoteDeliveryOptionController($uibModal, WeirService, $state, $sce, $exceptionHandler, Underscore, toastr, Addresses, OrderCloud, QuoteShareService, OCGeography) {
	var vm = this;
	var activeAddress = function(address) { return address.xp.active == true; };
	vm.addresses = Underscore.sortBy(Addresses.Items, function(address) {
		return address.xp.primary;
	}).filter(activeAddress).reverse();
	//vm.customShipping = false;
	vm.country = function(c) {
		var result = Underscore.findWhere(OCGeography.Countries, {value:c});
		return result ? result.label : '';
	};

	var labels = {
	    en: {
	        DefaultAddress: "Your default address",
	        AddNew: "Add a new address",
	        DeliveryInfo: "Delivery information",
	        DeliverHere: "Deliver to this address",
	        ReviewQuote: "Review quote",
	        BackToQuote: "Back to your quote",
	        InfoText1: "Delivery costs will be confirmed on order.",
	        InfoText2: "Deliveries will be prepared for shipping based on your standard delivery instructions.",
	        InfoText3: "Lead time for all orders will be based on the longest lead time from the list of spares requested."
	    },
	    fr: {
	        DefaultAddress: $sce.trustAsHtml("FR: Your default address"),
	        AddNew: $sce.trustAsHtml("FR: Add a new address"),
	        DeliveryInfo: $sce.trustAsHtml("FR: Delivery information"),
	        DeliverHere: $sce.trustAsHtml("FR: Deliver to this address"),
	        ReviewQuote: $sce.trustAsHtml("FR: Review quote"),
	        BackToQuote: $sce.trustAsHtml("FR: Back to your quote"),
	        InfoText1: $sce.trustAsHtml("FR: Delivery costs will be confirmed on order."),
	        InfoText2: $sce.trustAsHtml("FR: Deliveries will be prepared for shipping based on your standard delivery instructions."),
	        InfoText3: $sce.trustAsHtml("Le d&eacute;lai de livraison pour toutes les commandes sera bas&eacute; sur le d&eacute;lai le plus long de la liste des pi&egrave;ces de rechanges demand&eacute;es")
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
		OrderCloud.Orders.SetShippingAddress(QuoteID, Address, QuoteShareService.Quote.xp.CustomerID)
			.then(function(order) {
				$state.go($state.current, {}, {reload: true});
				toastr.success("Shipping address successfully selected.","Success!");
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

		var newAddressResults = {};
		modalInstance.result
			.then(function (address) {
				return OrderCloud.Addresses.Create(address, QuoteShareService.Quote.xp.CustomerID);
			})
			.then(function(newAddress) {
				newAddressResults.ID = newAddress.ID;
				newAddressResults.Name = newAddress.AddressName;
				return OrderCloud.Orders.SetShippingAddress(QuoteID, newAddress, QuoteShareService.Quote.xp.CustomerID);
			})
			.then(function() {
				return WeirService.AssignAddressToGroups(newAddressResults.ID);
			})
			.then(function() {
				$state.go($state.current, {}, {reload: true});
				toastr.success("Shipping address set to " + newAddressResults.Name,"Shipping Address Set");
			})
			.catch(function(ex) {
				if(ex !== 'cancel') {
					$exceptionHandler(ex);
				}
			});
	}

	vm.labels = WeirService.LocaleResources(labels);
}

function ReviewQuoteController(WeirService, $state, $sce, $exceptionHandler, $rootScope, $uibModal, toastr,
    OrderCloud, QuoteShareService, Underscore, OCGeography, CurrentOrder) {
    var vm = this;
	if( (typeof(QuoteShareService.Quote.xp) == 'undefined') || QuoteShareService.Quote.xp == null) QuoteShareService.Quote.xp = {};
	vm.LineItems = QuoteShareService.LineItems;
    vm.Quote = QuoteShareService.Quote;
    vm.CommentsToWeir = QuoteShareService.Quote.xp.CommentsToWeir;
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
	// TODO: Updates so that the user can come back to a submited order, and submit with the PO. Might need to add extra code so that when just adding
	// a PO, we do not re-submit the Order: simply add the PO and change the status.
	if(vm.Quote.xp.PendingPO == true &&($state.$current.name == "myquote.submitquote") && (vm.Quote.xp.Status == WeirService.OrderStatus.ConfirmedQuote.id || vm.Quote.xp.Type=="Order")) {
		vm.SubmittingWithPO = true;
	}
    // TODO: Also add condition that user has Buyer role
    var allowNextStatuses = [WeirService.OrderStatus.Draft.id, WeirService.OrderStatus.Saved.id];
    vm.ShowNextButton = (QuoteShareService.Me.xp.Roles && QuoteShareService.Me.xp.Roles.indexOf("Buyer") > -1) &&
                            ((vm.Quote.xp.Status == WeirService.OrderStatus.ConfirmedQuote.id) ||
                            (vm.Quote.FromUserID == QuoteShareService.Me.ID && (allowNextStatuses.indexOf(vm.Quote.xp.Status) > -1)));
    var labels = {
        en: {
            Customer: "Customer; ",
            QuoteNumber: "Quote number; ",
            QuoteName: "Quote name; ",
            NextStep: "Next",
            Submit: "Submit quote or order",
            BackToReview: "Review quote",
            BackToDelivery: "Back to delivery",
            TagNum: "Tag number (if available)",
            PartNum: "Part number",
            PartDesc: "Description of part",
            RecRepl: "Recommended replacement",
            LeadTime: "Lead time",
            PricePer: "Price per item or set",
            Quantity: "Quantity",
            Total: "Total",
            YourAttachments: "Your attachments",
            YourReference: "Your Reference No; ",
            CommentsHeader: "Your comments or instructions",
            CommentsInstr: "Please add any specific comments or instructions for this quote",
            DeliveryOptions: "Delivery Options",
            DeliveryAddress: "Delivery Address",
            ChangeAddr: "Change address",
            Update: "Update",
            WeirComment: "Comment",
            AddComment: "Add",
            CancelComment: "Cancel",
            SubmitForReview: "Submit quote for review",
            CommentSavedMsg: "Your quote has been updated",
            PONeededHeader: "Please provide a Purchase Order to finalise your order",
            POUpload: "Upload PO document",
            POEntry: "Enter PO Number",
            SubmitOrderAndEmail: "Submit Order & Email PO",
	        SubmitOrderWithPO: "Submit Order with PO",
	        SerialNum: "Serial number",
	        EmailPoMessage: "*Your order will be confirmed<br class='message-break'>following receipt of your PO."
        },
        fr: {
            Customer: $sce.trustAsHtml("Client "),
            QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation "),
            QuoteName: $sce.trustAsHtml("Nom de la cotation "),
            NextStep: $sce.trustAsHtml("FR: Next"),
            Submit: $sce.trustAsHtml("Submit quote or order"),
            BackToReview: $sce.trustAsHtml("Review quote"),
            BackToDelivery: $sce.trustAsHtml("FR: Back to delivery"),
            SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
            TagNum: $sce.trustAsHtml("Num&eacute;ro de Tag"),
            PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
            PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
            RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute;"),
            LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison"),
            PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
            Quantity: $sce.trustAsHtml("Quantit&eacute;"),
            Total: $sce.trustAsHtml("Total"),
            YourAttachments: $sce.trustAsHtml("FR: Your attachments"),
            YourReference: $sce.trustAsHtml("Votre num&eacute;ro de r&eacute;f&eacute;rence; "),
            CommentsHeader: $sce.trustAsHtml("Vos commentaires ou instructions"),
            CommentsInstr: $sce.trustAsHtml("Veuillez ajouter tout commentaire ou instructions sp&eacute;cifiques pour cette cotation"),
            DeliveryOptions: $sce.trustAsHtml("Options de livraison"),
            DeliveryAddress: $sce.trustAsHtml("FR: Delivery Address"),
            ChangeAddr: $sce.trustAsHtml("FR: Change address"),
            Update: $sce.trustAsHtml("Mettre à jour"),
            WeirComment: $sce.trustAsHtml("** Commentaires"),
            AddComment: $sce.trustAsHtml("FR: Add"),
            CancelComment: $sce.trustAsHtml("FR: Cancel"),
            SubmitForReview: $sce.trustAsHtml("FR: Submit quote for review"),
            CommentSavedMsg: $sce.trustAsHtml("FR:Your quote has been updated"),
            PONeededHeader: $sce.trustAsHtml("FR:Please provide a Purchase Order to finalise your order"),
            POUpload: $sce.trustAsHtml("FR:Upload PO document"),
	        SubmitOrderAndEmail: $sce.trustAsHtml("Submit Order & Email PO"),
	        SubmitOrderWithPO: $sce.trustAsHtml("Submit Order with PO"),
	        SerialNum: $sce.trustAsHtml("Serial number"),
	        EmailPoMessage: $sce.trustAsHtml("*Your order will be confirmed<br>following receipt of your PO.")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);

    function _deleteLineItem(quoteNumber, itemid) {
        OrderCloud.LineItems.Delete(quoteNumber, itemid, vm.Quote.xp.CustomerID)
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
        OrderCloud.LineItems.Patch(quoteNumber, item.ID, patch, vm.Quote.xp.CustomerID)
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

    function _proceedToSubmit() {
        vm.SubmittingToReview = false;
        vm.SubmittingWithPO = false;
        if (!$state.is('myquote.submitquote')) return;
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
                        vm.SubmittingToReview = true;
                    } else if (val == "Submit") {
						vm.SubmittingWithPO = true;
                    }
                }
            );
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
                OrderCloud.Payments.Create(vm.Quote.ID, data, vm.Quote.xp.CustomerID)
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
            OrderCloud.Payments.Patch(vm.Quote.ID, payment.ID, data, vm.Quote.xp.CustomerID)
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
				    Revised: false
			    }
		    };
	    } else {
		    data = {
			    xp: {
				    Status: WeirService.OrderStatus.SubmittedPendingPO.id,
				    StatusDate: new Date(),
				    Type: "Order",
				    PendingPO: true,
				    Revised: false
			    }
		    };
	    }
	    WeirService.UpdateQuote(vm.Quote, data)
            .then(function (qt) {
                return OrderCloud.Orders.Submit(vm.Quote.ID);
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

    function _saveWeirComment() {
        var quote = QuoteShareService.Quote;
        if (vm.CommentsToWeir && (vm.CommentsToWeir != quote.xp.CommentsToWeir)) {
            var data = {
                xp: {
                    CommentsToWeir: vm.CommentsToWeir
                }
            };
            WeirService.UpdateQuote(quote, data)
                .then(function (d) {
                    QuoteShareService.Quote.xp.CommentsToWeir = vm.CommentsToWeir;
                    toastr.success(vm.labels.CommentSavedMsg);
                });
        }
    }
    function _cancelWeirComment() {
        vm.CommentsToWeir = QuoteShareService.Quote.xp.CommentsToWeir;
    }

    function _submitForReview(dirty) {
	    var data = {};
	    if(dirty) {
		    data = {
			    xp: {
				    Status: WeirService.OrderStatus.Submitted.id,
				    StatusDate: new Date(),
				    Revised: false,
				    CommentsToWeir: vm.CommentsToWeir
			    }
		    };
	    } else {
	    	data = {
			    xp: {
				    Status: WeirService.OrderStatus.Submitted.id,
				    StatusDate: new Date(),
				    Revised: false
			    }
		    };
	    }
	    WeirService.UpdateQuote(vm.Quote, data)
		    .then(function (qt) {
			    return OrderCloud.Orders.Submit(vm.Quote.ID);
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

    vm.deleteLineItem = _deleteLineItem;
    vm.updateLineItem = _updateLineItem;
    vm.proceedToSubmit = _proceedToSubmit;
    vm.saveWeirComment = _saveWeirComment;
    vm.cancelWeirComment = _cancelWeirComment;
    vm.submitForReview = _submitForReview;
    vm.submitOrder = _submitOrder;
    vm.backToDelivery = _gotoDelivery;
    vm.toSubmit = _gotoSubmit;
    vm.toReview = _gotoReview;
}

function RevisedQuoteController(WeirService, $state, $sce, $timeout, $window, Underscore, OCGeography, Quote, ShippingAddress, LineItems, PreviousLineItems, Payments, imageRoot, toastr) {
    var vm = this;
	vm.ImageBaseUrl = imageRoot;
	vm.Zero = 0;
    vm.LineItems = LineItems.Items;
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
    vm.Quote = Quote;
	vm.ShippingAddress = ShippingAddress;
    vm.CommentsToWeir = Quote.xp.CommentsToWeir;
    vm.PONumber = "";
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
            QuoteNumber: "Quote number; ",
            QuoteName: "Quote name; ",
            BackToQuotes: "Back to your Quotes",
            SerialNum: "Serial number",
            TagNum: "Tag number (if available)",
            PartNum: "Part number",
            PartDesc: "Description of part",
            RecRepl: "Recommended replacement",
            LeadTime: "Lead time / availability",
            PricePer: "Price per item",
            Quantity: "Quantity",
            Total: "Total",
            Removed: "Removed",
            Updated: "Updated",
            New: "New",
            YourAttachments: "Your attachments",
            YourReference: "Your Reference No; ",
            CommentsHeader: "Your comments or instructions",
            DeliveryAddress: "Delivery Address",
            ViewRevisions: "View Previous revisions",
	        Save: "Save",
	        Share: "Share",
	        Download: "Download",
	        Print: "Print",
	        Approve: "Approve",
	        Reject: "Reject",
	        Comments: "Comments",
	        Status: "Status",
	        OrderDate: "Order date;",
	        RejectedMessage: "The revised quote has been rejected.",
	        RejectedTitle: "Quote updated",
	        ApprovedMessage: "The revised quote has been accepted",
	        ApprovedTitle: "Quote updated"
        },
        fr: {
            Customer: $sce.trustAsHtml("Client "),
            QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation "),
            QuoteName: $sce.trustAsHtml("Nom de la cotation "),
            BackToQuotes: $sce.trustAsHtml("FR: Back to your Quotes"),
            SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
            TagNum: $sce.trustAsHtml("Num&eacute;ro de Tag"),
            PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
            PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
            RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute;"),
            LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison"),
            PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
            Quantity: $sce.trustAsHtml("Quantit&eacute;"),
            Total: $sce.trustAsHtml("Total"),
            Removed: "Removed",
            Updated: "Updated",
            New: "New",
            YourAttachments: $sce.trustAsHtml("FR: Your attachments"),
            YourReference: $sce.trustAsHtml("Votre num&eacute;ro de r&eacute;f&eacute;rence; "),
            CommentsHeader: $sce.trustAsHtml("Vos commentaires ou instructions"),
            DeliveryAddress: $sce.trustAsHtml("FR: Delivery Address"),
            ViewRevisions: $sce.trustAsHtml("FR: View Previous revisions"),
	        Save: $sce.trustAsHtml("Save"),
	        Share: $sce.trustAsHtml("Share"),
	        Download: $sce.trustAsHtml("Download"),
	        Print: $sce.trustAsHtml("Print"),
	        Approve: $sce.trustAsHtml("Approve"),
	        Reject: $sce.trustAsHtml("Reject"),
	        Comments: $sce.trustAsHtml("Comments"),
	        Status: $sce.trustAsHtml("Status"),
	        OrderDate: $sce.trustAsHtml("Order date;"),
	        RejectedMessage: $sce.trustAsHtml("The revised quote has been rejected."),
	        RejectedTitle: $sce.trustAsHtml("Quote updated"),
	        ApprovedMessage: $sce.trustAsHtml("The revised quote has been accepted"),
	        ApprovedTitle: $sce.trustAsHtml("Quote updated")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);

    function _gotoQuotes() {
        $state.go("quotes.revised");
    }

    function _gotoRevisions() {
        $state.go("revisions", { quoteID: vm.Quote.xp.OriginalOrderID });
    }

	vm.ShowUpdated = function (item) {
		// return true if qty <> xp.originalQty and qty > 0
		if(item.xp) {
			return (item.xp.OriginalQty && (item.Quantity != item.xp.OriginalQty)) || (item.xp.OriginalUnitPrice && (item.UnitPrice != item.xp.OriginalUnitPrice)) || (item.xp.OriginalLeadTime && (item.Product.xp.LeadTime != item.xp.OriginalLeadTime));
		} else {
			return false;
		}
	};

	vm.ShowRemoved = _showRemoved;
	function _showRemoved(line) {
		if(line.xp) {
			return line.Quantity == 0 && line.xp.OriginalQty != 0;
		} else {
			return false;
		}
	}

	vm.ShowNew = _showNew;
	function _showNew(line) {
		if(line.xp) {
			return line.xp.OriginalQty==0;
		} else {
			return false;
		}
	}

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
				return status.label;
				// TODO: Address localization
			}
		}
		return "";
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
					$state.go('readonly', { quoteID: vm.Quote.ID, buyerID: vm.Quote.xp.CustomerID });
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
					$state.go('readonly', { quoteID: vm.Quote.ID, buyerID: vm.Quote.xp.CustomerID });
				});
		}
	}
	function _comments() {
		if (vm.Quote.Status == 'RV') {
			console.log("Do something with comments ...");
		}
	}
	function toCsv() {
		return QuoteToCsvService.ToCsvJson(vm.Quote, QuoteShareService.LineItems, vm.ShippingAddress, QuoteShareService.Payments, vm.labels);
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
	    if($state.$current.name != "myquote.delivery") {
            $state.go("myquote.delivery");
	    }
    }

    function cancel() {
		$uibModalInstance.close();
	    $state.go("myquote.detail");
    }
}

function NewAddressModalController($uibModalInstance) {
	var vm = this;
	vm.address = {};
	vm.address.xp = {};
	vm.address.xp.active = true;
	vm.address.xp.primary = false;

	vm.submit = function () {
		$uibModalInstance.close(vm.address);
	};

	vm.cancel = function () {
		vm.address = {};
		$uibModalInstance.dismiss('cancel');
	};
}

function SubmitConfirmOrderController($sce, WeirService, Quote) {
	var vm = this;
	vm.Quote = Quote;

	var labels = {
		en: {
			Title: "Thank you. Your order has submitted for review.​",
			MessageText1: "We have sent you a confirmation email.​",
			MessageText2: "We will be in touch with you to discuss the items you have requested to be reviewed.",
			MessageText3: "If your order needs to be revised we will email you an updated quote."
		},
		fr: {
			Title: $sce.trustAsHtml("Thank you. Your order has submitted for review.​"),
			MessageText1: $sce.trustAsHtml("We have sent you a confirmation email.​"),
			MessageText2: $sce.trustAsHtml("We will be in touch with you to discuss the items you have requested to be reviewed."),
			MessageText3: $sce.trustAsHtml("If your order needs to be revised we will email you an updated quote.")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
}

function SubmitConfirmController($sce, WeirService, Quote, WithPO) {
    var vm = this;
    vm.Quote = Quote;

	var labels = {
		en: {
		    Title: "Thank you. Your order has been placed",
		    MessageText1: "We have sent you a confirmation email.",
		    MessageText2: "Order number; " + Quote.ID,
		    MessageText3: "We will also send you a detailed order confirmation document via email"
		},
		fr: {
		    Title: $sce.trustAsHtml("Thank you. Your order has been placed"),
		    MessageText1: $sce.trustAsHtml("We have sent you a confirmation email."),
		    MessageText2: $sce.trustAsHtml("Order number; " + Quote.ID),
		    MessageText3: $sce.trustAsHtml("We will also send you a detailed order confirmation document via email")
		}
	};

	var labelsPending = {
		en: {
			Title: "Thank you. Your order has been submitted pending your PO.",
			MessageText1: "We have sent you a confirmation email.",
			MessageText2: "When we have received your PO we will confirm your order.",
			MessageText3: "If your order needs to be revised we will email you an updated quote."
		},
		fr: {
			Title: $sce.trustAsHtml("Thank you. Your order has been submitted pending your PO."),
			MessageText1: $sce.trustAsHtml("We have sent you a confirmation email."),
			MessageText2: $sce.trustAsHtml("When we have received your PO we will confirm your order."),
			MessageText3: $sce.trustAsHtml("If your order needs to be revised we will email you an updated quote.")
		}
	}

	if(WithPO) {
		vm.labels = WeirService.LocaleResources(labels);
	} else {
		vm.labels = WeirService.LocaleResources(labelsPending);
	}
}

function ChooseSubmitController($uibModalInstance, $sce, WeirService, QuoteShareService) {
    var vm = this;
    vm.Quote = QuoteShareService.Quote;

    var labels = {
        en: {
            SubmitReview: "Submit quote for review",
            SubmitReviewMessage: $sce.trustAsHtml("<p>Please select Submit quote for review if;<br><br>1. There are items in your quote that you would like Weir to review and confirm.<br>2. You have items in your quote that are POA. Weir will review the quote and provide prices for the POA items.</p>"),
            SubmitReviewBtn: "Submit quote for review",
            ConfirmPO: "Confirm Order",
            ConfirmPOMessage: $sce.trustAsHtml("<p>If you select Confirm Order you will be able to confirm your order as follows;<br><br>1. Submit Order with PO – add your PO number or upload your PO document.<br>2. Submit Order & email PO – submit your order and email your PO (we’ll add it to the order for you).</p>"),
            ConfirmPOBtn: "Confirm Order"
        },
        fr: {
            SubmitReview: $sce.trustAsHtml("FR: Submit quote for review"),
            SubmitReviewMessage: $sce.trustAsHtml("<p>FR: Please select Submit quote for review if;<br><br>1. There are items in your quote that you would like Weir to review and confirm.<br>2. You have items in your quote that are POA. Weir will review the quote and provide prices for the POA items.</p>"),
            SubmitReviewBtn: $sce.trustAsHtml("FR: Submit quote for review"),
            ConfirmPO: $sce.trustAsHtml("FR: Confirm Order"),
            ConfirmPOMessage: $sce.trustAsHtml("<p>If you select Confirm Order you will be able to confirm your order as follows;<br><br>1. Submit Order with PO – add your PO number or upload your PO document.<br>2. Submit Order & email PO – submit your order and email your PO (we’ll add it to the order for you).</p>"),
            ConfirmPOBtn: $sce.trustAsHtml("FR: Confirm Order")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);

    function _submitForReview() {
        $uibModalInstance.close("Review");
    }

    function _confirmOrderWithPO() {
        $uibModalInstance.close("Submit");
    }

    vm.submitForReview = _submitForReview;
    vm.confirmOrderWithPO = _confirmOrderWithPO;
}

function QuoteRevisionsController(WeirService, $state, $sce, QuoteID, Revisions) {
    var vm = this;
    vm.Revisions = Revisions;
    vm.QuoteID = QuoteID;

    function getStatusLabel(statusId) {
        if (statusId) {
            var status = WeirService.LookupStatus(statusId);
            if (status) {
                return status.label;
                // TODO: Address localization
            }
        }
        return "";
    }
    function view(revID, active, buyerId) {
        if (active) {
            // ToDo TEST: Current order should be this one. No altering revised quotes.
	        $state.go("revised", {quoteID: revID, buyerID: buyerId});
        } else {
            $state.go("readonly", { quoteID: revID, buyerID: buyerId });
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
            SubmittedBy: "Submitted by",
            QuoteValue: "Quote value",
            DateRevised: "Date Revised",
            Reviewer: "Reviewer",
            Status: "Status",
            View: "View",
            LoadMore: "Load more"
        },
        fr: {
            QuoteHeading: $sce.trustAsHtml("FR: Quote revisions for Quote; " + QuoteID),
            Instructions1: $sce.trustAsHtml("FR: Select 'view' to view previous revisions for reference"),
            Instructions2: $sce.trustAsHtml("FR: You can view and comment on the current revision"),
            SearchQuotes: $sce.trustAsHtml("FR: Search Quotes"),
            Search: $sce.trustAsHtml("FR: Search"),
            QuoteID: $sce.trustAsHtml("FR: Quote ID"),
            CustomerRef: $sce.trustAsHtml("FR: Customer Ref"),
            BusinessName: $sce.trustAsHtml("FR: Business Name"),
            SubmittedBy: $sce.trustAsHtml("FR: Submitted by"),
            QuoteValue: $sce.trustAsHtml("FR: Quote value"),
            DateRevised: $sce.trustAsHtml("FR: Date Revised"),
            Reviewer: $sce.trustAsHtml("FR: Reviewer"),
            Status: $sce.trustAsHtml("FR: Status"),
            View: $sce.trustAsHtml("FR: View")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);
    vm.GetStatusLabel = getStatusLabel;
    vm.View = view;
}

function ReadonlyQuoteController($sce, WeirService, $timeout, $window, Quote, ShippingAddress, LineItems, PreviousLineItems, Payments, imageRoot, OCGeography, Underscore, QuoteToCsvService) {
    var vm = this;
	vm.ImageBaseUrl = imageRoot;
	vm.Zero = 0;
    vm.Quote = Quote;
    vm.ShippingAddress = ShippingAddress;
    vm.LineItems = LineItems ? LineItems.Items : [];
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
            QuoteNumber: "Quote number; ",
            QuoteName: "Quote name; ",
            SerialNum: "Serial number",
            TagNum: "Tag number (if available)",
            PartNum: "Part number",
            PartDesc: "Description of part",
            RecRepl: "Recommended replacement",
            LeadTime: "Lead time",
            PricePer: "Price per item or set",
            Quantity: "Quantity",
            Total: "Total",
            YourAttachments: "Your attachments",
            YourReference: "Your Reference No; ",
            CommentsHeader: "Your comments or instructions",
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
	        OrderDate: "Order date;",
	        BackToQuotes: "Back to your Quotes",
	        SubmitWithPO: "Submit Order with PO",
	        PriceDisclaimer: "All prices stated do not include UK VAT or delivery"
        },
        fr: {
            Customer: $sce.trustAsHtml("Client "),
            QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation "),
            QuoteName: $sce.trustAsHtml("**Ajoutez votre nom de devis "),
            SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
            TagNum: $sce.trustAsHtml("Num&eacute;ro de Tag"),
            PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
            PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
            RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute;"),
            LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison"),
            PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
            Quantity: $sce.trustAsHtml("Quantit&eacute;"),
            Total: $sce.trustAsHtml("Total"),
            YourAttachments: $sce.trustAsHtml("FR: Your attachments"),
            YourReference: $sce.trustAsHtml("Votre num&eacute;ro de r&eacute;f&eacute;rence; "),
            CommentsHeader: $sce.trustAsHtml("FR: Your comments or instructions"),
            DeliveryOptions: $sce.trustAsHtml("Options de livraison"),
            DeliveryAddress: $sce.trustAsHtml("FR: Delivery Address"),
            WeirComment: $sce.trustAsHtml("** Commentaires"),
	        Save: $sce.trustAsHtml("Save"),
	        Share: $sce.trustAsHtml("Share"),
	        Download: $sce.trustAsHtml("Download"),
	        Print: $sce.trustAsHtml("Print"),
	        Approve: $sce.trustAsHtml("Approve"),
	        Reject: $sce.trustAsHtml("Reject"),
	        Comments: $sce.trustAsHtml("Comments"),
	        Status: $sce.trustAsHtml("Status"),
	        OrderDate: $sce.trustAsHtml("Order date;"),
	        BackToQuotes: $sce.trustAsHtml("Back to your Quotes"),
	        SubmitWithPO: $sce.trustAsHtml("Submit Order with PO"),
	        PriceDisclaimer: $sce.trustAsHtml("All prices stated do not include UK VAT or delivery")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);

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
				return status.label;
				// TODO: Address localization
			}
		}
		return "";
	}
	function toCsv() {
		return QuoteToCsvService.ToCsvJson(vm.Quote, vm.LineItems, vm.ShippingAddress, vm.Payments, vm.labels);
	}

	function _gotoQuotes() {
		$state.go("quotes.revised");
	}
	vm.Download = download;
	vm.Print = print;
	vm.GetStatusLabel = getStatusLabel;
	vm.gotoQuotes = _gotoQuotes;
}

function SubmitController($sce, WeirService, $timeout, $window, $uibModal, $state, Quote, ShippingAddress, LineItems, PreviousLineItems, Payments, imageRoot, OCGeography, Underscore, OrderCloud, toastr) {
	var vm = this;
	vm.ImageBaseUrl = imageRoot;
	vm.Zero = 0;
	vm.PONumber = "";
	vm.Quote = Quote;
	vm.ShippingAddress = ShippingAddress;
	vm.LineItems = LineItems ? LineItems.Items : [];
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
			QuoteNumber: "Quote number; ",
			QuoteName: "Quote name; ",
			SerialNum: "Serial number",
			TagNum: "Tag number (if available)",
			PartNum: "Part number",
			PartDesc: "Description of part",
			RecRepl: "Recommended replacement",
			LeadTime: "Lead time",
			PricePer: "Price per item or set",
			Quantity: "Quantity",
			Total: "Total",
			YourAttachments: "Your attachments",
			YourReference: "Your Reference No; ",
			CommentsHeader: "Your comments or instructions",
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
			OrderDate: "Order date;",
			BackToQuotes: "Back to your Quotes",
			SubmitWithPO: "Submit Order with PO",
			SubmitOrderAndEmail: "Submit Order & Email PO",
			SubmitOrderWithPO: "Submit Order with PO",
			EmailPoMessage: "*Your order will be confirmed<br class='message-break'>following receipt of your PO.",
			POEntry: "Enter PO Number",
			PriceDisclaimer: "All prices stated do not include UK VAT or delivery",
			DragAndDrop: "Drag and drop files here to upload",
			PONeededHeader: "Please provide a Purchase Order to finalise your order",
			POUpload: "Upload PO document"
		},
		fr: {
			Customer: $sce.trustAsHtml("Client "),
			QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation "),
			QuoteName: $sce.trustAsHtml("**Ajoutez votre nom de devis "),
			SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
			TagNum: $sce.trustAsHtml("Num&eacute;ro de Tag"),
			PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
			PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
			RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute;"),
			LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison"),
			PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
			Quantity: $sce.trustAsHtml("Quantit&eacute;"),
			Total: $sce.trustAsHtml("Total"),
			YourAttachments: $sce.trustAsHtml("FR: Your attachments"),
			YourReference: $sce.trustAsHtml("Votre num&eacute;ro de r&eacute;f&eacute;rence; "),
			CommentsHeader: $sce.trustAsHtml("FR: Your comments or instructions"),
			DeliveryOptions: $sce.trustAsHtml("Options de livraison"),
			DeliveryAddress: $sce.trustAsHtml("FR: Delivery Address"),
			WeirComment: $sce.trustAsHtml("** Commentaires"),
			Save: $sce.trustAsHtml("Save"),
			Share: $sce.trustAsHtml("Share"),
			Download: $sce.trustAsHtml("Download"),
			Print: $sce.trustAsHtml("Print"),
			Approve: $sce.trustAsHtml("Approve"),
			Reject: $sce.trustAsHtml("Reject"),
			Comments: $sce.trustAsHtml("Comments"),
			Status: $sce.trustAsHtml("Status"),
			OrderDate: $sce.trustAsHtml("Order date;"),
			BackToQuotes: $sce.trustAsHtml("Back to your Quotes"),
			SubmitWithPO: $sce.trustAsHtml("Submit Order with PO"),
			SubmitOrderAndEmail: $sce.trustAsHtml("Submit Order & Email PO"),
			SubmitOrderWithPO: $sce.trustAsHtml("Submit Order with PO"),
			EmailPoMessage: $sce.trustAsHtml("*Your order will be confirmed<br class='message-break'>following receipt of your PO."),
			POEntry: $sce.trustAsHtml("Enter PO Number"),
			PriceDisclaimer: $sce.trustAsHtml("All prices stated do not include UK VAT or delivery"),
			DragAndDrop: $sce.trustAsHtml("Drag and drop files here to upload"),
			PONeededHeader: $sce.trustAsHtml("Please provide a Purchase Order to finalise your order"),
			POUpload: $sce.trustAsHtml("Upload PO document")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);

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
				return status.label;
				// TODO: Address localization
			}
		}
		return "";
	}
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
				return status.label;
				// TODO: Address localization
			}
		}
		return "";
	}
	function toCsv() {
		return QuoteToCsvService.ToCsvJson(vm.Quote, QuoteShareService.LineItems, vm.ShippingAddress, QuoteShareService.Payments, vm.labels);
	}
	function _gotoQuotes() {
		$state.go("quotes.revised");
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
				OrderCloud.Payments.Create(vm.Quote.ID, data, vm.Quote.xp.CustomerID)
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
			OrderCloud.Payments.Patch(vm.Quote.ID, payment.ID, data, vm.Quote.xp.CustomerID)
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
					$state.go('readonly', { quoteID: vm.Quote.ID, buyerID: vm.Quote.xp.CustomerID });
				});
			});
	}

	vm.Download = download;
	vm.Print = print;
	vm.GetStatusLabel = getStatusLabel;
	vm.gotoQuotes = _gotoQuotes;
	vm.submitOrder = _submitOrder;
}
angular.module( 'orderCloud' )
    .service('SearchTypeService', SearchTypeService)
    .service('UserGroupsService', UserGroupsService)
    .factory('WeirService', WeirService)
;
function SearchTypeService() {
    var searchglobal = false;
    var lastSearchType = 's';
    var svc = {
        IsGlobalSearch: function () { return searchglobal; },
        SetGlobalSearchFlag: function (val) { searchglobal = (val) ? true : false; },
        GetLastSearchType: function () { return lastSearchType; },
        SetLastSearchType: function (val) { lastSearchType = val; }
    };
    return svc;
}

function UserGroupsService($q, OrderCloud) {
    var groups = null;
    function _isUserInGroup(groupList) {
        var d = $q.defer();
        var isInGroup = false;
        if (!groups) {
            OrderCloud.Me.ListUserGroups()
            .then(function (results) {
                groups = [];
                for (var i = 0; i < results.Items.length; i++) {
                    var id = results.Items[i].ID;
                    groups.push(id);
                    if (groupList.indexOf(id) > -1) isInGroup = true;
                }
                d.resolve(isInGroup);
            })
        } else {
            for (var i = 0; i < groups.length; i++) {
                if (groupList.indexOf(groups[i]) > -1) isInGroup = true;
            }
            d.resolve(isInGroup);
        }
        return d.promise;
    }
    return {
        IsUserInGroup: _isUserInGroup,
        Groups: {
            Buyers: 'Buyers',
            Shoppers: 'Shoppers',
            BuyerAdmin: 'BuyerAdmin'
        }
    }
}

function WeirService($q, $cookieStore, $sce, OrderCloud, CurrentOrder, buyerid, SearchTypeService) {
	var orderStatuses = {
		Draft: {id: "DR", label: {en:"Draft",fr:"FR: Draft"}, desc: "This is the current quote under construction"},
		Saved: {id: "SV", label: {en:"Saved",fr:"FR: Saved"}, desc: "Quote has been saved but not yet submitted to weir as quote or order"},
		Submitted: {id:"SB", label: {en:"Quote Submitted for Review",fr:"FR: Quote Submitted for Review"}, desc:"Customer has selected to request review OR review status is conditional based on POA items being included in quote"},
		RevisedQuote: {id:"RV", label: {en:"Revised Quote",fr:"FR: Revised Quote"}, desc:"Weir have reviewed the quote and updated items as required. When the update is saved and ‘shared with the customer this becomes a ‘Revised quote’"},
		RejectedQuote: {id: "RQ", label:  {en:"Rejected Quote",fr:"FR: Rejected Quote"}, desc: "Weir have shared Revised quote with buyer has rejected revision (this would display as a status in the list view of quotes rather than in the navigation)"},
		ConfirmedQuote: {id: "CQ", label:  {en:"Confirmed Quote",fr:"FR: Confirmed Quote"}, desc: "1. Customer has approved revised quote – assumes that if Weir have updated a revised quote the new /revised items are ‘pre-approved’ by Weir. 2. Weir admin has  confirmed a quote submitted for review by the customer."},
		SubmittedWithPO: { id: "SP", label:  {en:"Order submitted with PO",fr:"FR: Order submitted with PO"}, desc: "Order has been submitted to Weir with a PO" },
		SubmittedPendingPO: { id: "SE", label:  {en:"Order submitted pending PO",fr:"FR: Order submitted pending PO"}, desc: "Order has been submitted to Weir with the expectation of a PO to be sent via email" },
		RevisedOrder: { id: "RO", label:  {en:"Revised Order",fr:"FR: Revised Order"}, desc: "1. Weir have reviewed the order and updated items as required. When the update is saved and ‘shared with the customer this becomes a ‘Revised Order’." },
		RejectedRevisedOrder: {id: "RR", label:  {en:"Rejected Revised Order",fr:"FR: Rejected Revised Order"}, desc: "Weir have shared revised order and customer has rejected revision (this would display as a status in the list view of quotes rather than in the navigation)"},
		ConfirmedOrder: {id: "CO", label:  {en:"Confirmed Order",fr:"FR: Confirmed Order"}, desc: "1, Weir have reviewed order and confirmed all details are OK 2, Customer has accepted revised order"},
		Despatched: {id: "DP", label:  {en:"Despatched",fr:"FR: Despatched"}, desc: "Order marked as despatched"},
		Invoiced: {id: "IV", label:  {en:"Invoiced",fr:"FR: Invoiced"}, desc: "Order marked as invoiced"},
		Review: {id: "RE", label:  {en:"Under review",fr:"FR: Under review"}, desc: "Order or Quote has been submitted to Weir, but a change or additional information is needed"}
		/*Shared: {id: "SH", label: "Shared", desc: "Shopper quote has been shared with a buyer"}, //Should this be an XP?
		 Approved: {id: "AP", label: "Approved", desc: "Shopper quote has been shared with a buyer and approved"},
		 Rejected: {id: "RJ", label: "Rejected", desc: "Shopper quote has been shared with a buyer and then rejected"},
		 Submitted: {id: "SB", label: "Submitted", desc: "Customer has selected to request review OR review status is conditional based on POA items being included in quote"},
		 ConfirmedPending: {id: "CP", label: "Confirmed Quote", desc: "Quote has been submitted and confirmed by Weir, pending addition of PO number"},
		 Review: {id: "RV", label: "Under review", desc: "Order has been submitted to Weir, but a change or additional information is needed"},
		 Confirmed: {id: "CF", label: "Confirmed", desc: "Order has been submitted to and confirmed by Weir, and PO number is attached"},
		 Cancelled: {id: "CX", label: "Cancelled", desc: "Order cancelled after submission"},*/
	};
	var orderStatusList = [
		orderStatuses.Draft, orderStatuses.Saved, orderStatuses.Submitted, orderStatuses.RevisedQuote,
		orderStatuses.RejectedQuote, orderStatuses.ConfirmedQuote, orderStatuses.SubmittedWithPO, orderStatuses.RevisedOrder,
		orderStatuses.RejectedRevisedOrder, orderStatuses.ConfirmedOrder, orderStatuses.Despatched, orderStatuses.Invoiced,
        orderStatuses.SubmittedPendingPO, orderStatuses.Review
	];

    function getStatus(id) {
		var match = null;
	        angular.forEach(orderStatusList, function(status) {
	            if (status.id == id) {
				    match = status;
				    return;
			    }
	        });
		return match;
    }

    var service = {
    	AssignAddressToGroups: assignAddressToGroups,
        SerialNumber: serialNumber,
        SerialNumbers: serialNumbers,
        PartNumbers: partNumbers,
        TagNumber: tagNumber,
        TagNumbers: tagNumbers,
        AddPartToQuote: addPartToQuote,
        AddPartsToQuote: addPartsToQuote,
        QuickQuote: quickQuote,
        Locale: getLocale,
        LocaleResources: selectLocaleResources,
        navBarLabels: navlabels,
        SetLastSearchType: SearchTypeService.SetLastSearchType,
        GetLastSearchType: SearchTypeService.GetLastSearchType,
	    SearchType: { Serial: "s", Part: "p", Tag: "t"},
	    //GetWeirGroup: getWeirGroup,
	    //SetWeirGroup: setWeirGroup,
	    OrderStatus: orderStatuses,
	    OrderStatusList: orderStatusList,
	    LookupStatus: getStatus,
	    FindQuotes: findQuotes,
	    FindOrders: findOrders,
	    CartHasItems: cartHasItems,
	    UpdateQuote: updateQuote,
        SetQuoteAsCurrentOrder: setQuoteAsCurrentOrder,
        FindCart: findCart,
        GetValve: getValve
    };

    function assignAddressToGroups(addressId) {
	    var buyerAssignment = {
		    AddressID: addressId,
		    UserID: null,
		    UserGroupID: "Buyers",
		    IsShipping: true,
		    IsBilling: true
	    };
	    var shopperAssignment = {
		    AddressID: addressId,
		    UserID: null,
		    UserGroupID: "Shoppers",
		    IsShipping: true,
		    IsBilling: true
	    };
	    var adminAssignment = {
		    AddressID: addressId,
		    UserID: null,
		    UserGroupID: "BuyerAdmin",
		    IsShipping: true,
		    IsBilling: true
	    };
	     return OrderCloud.Addresses.SaveAssignment(buyerAssignment)
		    .then(function() {
		    	return OrderCloud.Addresses.SaveAssignment(shopperAssignment);
		    })
		    .then(function() {
		    	return OrderCloud.Addresses.SaveAssignment(adminAssignment);
		    })
		    .catch(function(ex) {
			    return ex;
		    });
    }

    function getLocale() {
        var localeOfUser = $cookieStore.get('language');
        if(localeOfUser == null || localeOfUser == false){
            //set the expiration date of the cookie.
            var now = new Date();
            var exp = new Date(now.getFullYear(), now.getMonth()+6, now.getDate());
            //getting the language of the user's browser
            localeOfUser = navigator.language;
            localeOfUser = localeOfUser.substr(0,2);
            //setting the cookie.
            $cookieStore.put('language', localeOfUser, {
                expires: exp
            });

        }
	    return localeOfUser;
    }

    function navlabels(){
        var navLabels = {
            en: {
                privacyTitle: "Privacy Statement",
                newQuote: "New Quote",
                cookieTitle: "Cookie Policy",
                termsTitle: "Terms of Use",
                contactTitle: "Contact",
                YourQuotes: "Your Quotes",
                YourOrders: "Your Orders",
                YourAccount: "Your Account",
                Account: "Account",
                Search: "Search",
	            Current: "Current",
                SavedQuotes: "Saved",
                ReviewQuotes: "Submitted for review",
                RevisedQuotes: "Revised",
                ConfirmedQuotes: "Confirmed",
                language: true,
	            submitted: "Submitted with PO",
	            pending: "Submitted pending PO",
	            revised: "Revised",
	            confirmed: "Confirmed",
	            despatched: "Despatched",
	            invoiced: "Invoiced",
	            home: "Home"
            },
            fr: {
                privacyTitle: $sce.trustAsHtml("Déclaration de confidentialité"),
                newQuote: $sce.trustAsHtml("Nouveau Quote"),
                cookieTitle: $sce.trustAsHtml("Politique de cookie"),
                termsTitle: $sce.trustAsHtml("Conditions d'utilisation"),
                contactTitle: $sce.trustAsHtml("Contact"),
                YourQuotes: $sce.trustAsHtml("Votre Cotations"),
                YourOrders: $sce.trustAsHtml("Vos commandes"),
                YourAccount: $sce.trustAsHtml("Votre compte"),
                Account: $sce.trustAsHtml("Compte"),
                Search: $sce.trustAsHtml("Rechercher"),
	            Current: $sce.trustAsHtml("Cotations en cours"),
                SavedQuotes: $sce.trustAsHtml("Sauvegard&eacute;"),
                ReviewQuotes: $sce.trustAsHtml("Soumis pour r&eacute;vision"),
                RevisedQuotes: $sce.trustAsHtml("R&eacute;vis&eacute;"),
                ConfirmedQuotes: $sce.trustAsHtml("Confirm&eacute;e"),
                language: false,
	            submitted: $sce.trustAsHtml("Soumis avec un bon de commande"),
	            pending: $sce.trustAsHtml("Bon de commande soumis en attente"),
	            revised: $sce.trustAsHtml("R&eacute;vis&eacute;"),
	            confirmed: $sce.trustAsHtml("Confirm&eacute;"),
	            despatched: $sce.trustAsHtml("Expédiée"),
	            invoiced: $sce.trustAsHtml("Facturée"),
	            home: $sce.trustAsHtml("Accueil")
            }
        };
        return navLabels;
    }

    function selectLocaleResources(resource) {
	    var tmp = resource[getLocale()];
	    return (tmp) ? tmp : resource["en"];
    }

    function serialNumber(serialNumber) {
        var deferred = $q.defer();
        var result;

		CurrentOrder.GetCurrentCustomer()
		.then(function (cust) {
            if (cust) {
                if (SearchTypeService.IsGlobalSearch()) {
                    OrderCloud.Me.ListCategories(null, 1, 50, null, "Name", {
                        "xp.SN": serialNumber
                    }, "all", cust.id.substring(0, 5))
                        .then(function (matches) {
                            if (matches.Items.length == 1) {
                                result = matches.Items[0];
                                getParts(result.ID, deferred, result);
                            } else if (matches.Items.length == 0) {
                                return deferred.resolve("No matches found for serial number " + serialNumber);
                            } else {
                                return deferred.resolve("No matches found for serial number " + serialNumber);
                            }
                        });
                } else {
                    OrderCloud.Me.ListCategories(null, 1, 50, "ParentID", null, {
                        "xp.SN": serialNumber,
                        "ParentID": cust.id
                    }, null, cust.id.substring(0, 5))
                        .then(function (matches) {
                            if (matches.Items.length == 1) {
                                result = matches.Items[0];
                                getParts(result.ID, deferred, result);
                            } else if (matches.Items.length == 0) {
                                return deferred.resolve("No matches found for serial number " + serialNumber);
                            } else {
                                return deferred.resolve("No matches found for serial number " + serialNumber);
                            }
                        });
                }
	        } else {
                    throw { message: "Customer for quote / search not set"};
	        }
		})
        .catch(function(ex) {
            return deferred.reject(ex);
        });

        return deferred.promise;
    }

    function tagNumber(tagNumber) {
        var deferred = $q.defer();
        var result;
        CurrentOrder.GetCurrentCustomer()
			.then(function (cust) {
			    if (cust) {
			        if (SearchTypeService.IsGlobalSearch()) {
			            OrderCloud.Me.ListCategories(null, 1, 50, null, "Name", {
			                "TagNumber": tagNumber
			            }, "all", cust.id.substring(0, 5))
                            .then(function (matches) {
                                if (matches.Items.length == 1) {
                                    result = matches.Items[0];
                                    getParts(result.ID, deferred, result);
                                } else if (matches.Items.length == 0) {
                                    return deferred.resolve("No matches found for tag number " + serialNumber);
                                } else {
                                    return deferred.resolve("Data error: Tag number " + tagNumber + " is not unique");
                                }
                            });
			        } else {
			            OrderCloud.Me.ListCategories(null, 1, 50, "ParentID", null, {
			                "xp.TagNumber": tagNumber,
			                "ParentID": cust.id
			            }, null, cust.id.substring(0, 5))
                        .then(function (matches) {
                            if (matches.Items.length == 1) {
                                result = matches.Items[0];
                                getParts(result.ID, deferred, result);
                            } else if (matches.Items.length == 0) {
                                return deferred.resolve("No matches found for tag number " + tagNumber);
                            } else {
                                return deferred.resolve("Data error: Tag number " + tagNumber + " is not unique");
                            }
                        });
			        }
			    } else {
			        throw { message: "Customer for quote / search not set" };
			    }
			})
            .catch(function (ex) {
                deferred.reject(ex);
            });
        return deferred.promise;
    }

    function getValve(id) {
        var deferred = $q.defer();
        var result;
        CurrentOrder.GetCurrentCustomer()
			.then(function (cust) {
			    if (cust) {
			        OrderCloud.Me.ListCategories(null, 1, 50, null, null,
            { "ID": id }, "all", cust.id.substring(0, 5))
            .then(function (matches) {
                if (matches.Items.length == 1) {
                    result = matches.Items[0];
                    getParts(result.ID, deferred, result);
                } else if (matches.Items.length == 0) {
                    return deferred.resolve("No matches found for valve id " + id);
                } else {
                    return deferred.resolve("Data error: Valve id " + id + " is not unique");
                }
            });
			    } else {
			        deferred.resolve("No customer context was set");
			    }
			});
        return deferred.promise;
    }

    function getParts(catId, deferred, result) {
        OrderCloud.Me.ListProducts(null, 1, 100, null, null, null, catId, result.ParentID.substring(0,5))
            .then(function(products) {
                result.Parts = [];
                var hasPrices = [];
                var noPrices = [];
                angular.forEach(products.Items, function (product) {
                    if (product.StandardPriceSchedule && product.StandardPriceSchedule.PriceBreaks && product.StandardPriceSchedule.PriceBreaks.length > 0 && product.StandardPriceSchedule.PriceBreaks[0].Price) {
                        hasPrices.push({ Number: product.ID, Detail: product });
                    } else {
                        noPrices.push({ Number: product.ID, Detail: product });
                    }
                });
                result.Parts.push.apply(result.Parts, hasPrices);
                result.Parts.push.apply(result.Parts, noPrices);
                deferred.resolve(result);
            })
            .catch(function(ex) {
                deferred.reject(ex);
            })
    }

    function serialNumbers(serialNumbers) {
        var deferred = $q.defer();
        var results = [];
        var queue = [];
		CurrentOrder.GetCurrentCustomer()
			.then(function(cust) {
			    if (cust) {
			        if (SearchTypeService.IsGlobalSearch()) {
			            angular.forEach(serialNumbers, function (number) {
			                if (number) {
			                    queue.push((function () {
			                        var d = $q.defer();
			                        OrderCloud.Me.ListCategories(null, 1, 50, null, "Name", {
			                            "xp.SN": number}, "all", cust.id.substring(0, 5))
                                        .then(function (matches) {
                                            if (matches.Items.length == 1) {
                                                results.push({ Number: number, Detail: matches.Items[0] });
                                            } else {
                                                results.push({ Number: number, Detail: null });
                                            }
                                            d.resolve();
                                        })
                                        .catch(function (ex) {
                                            results.push({ Number: number, Detail: null });
                                            d.resolve();
                                        });
			                        return d.promise;
			                    })());
			                }
			            });
			        } else {
			            angular.forEach(serialNumbers, function (number) {
			                if (number) {
			                    queue.push((function () {
			                        var d = $q.defer();
			                        OrderCloud.Me.ListCategories(null, 1, 50, "ParentID", null, {
			                            "xp.SN": number,
			                            "ParentID": cust.id
			                        }, null, cust.id.substring(0, 5))
                                        .then(function (matches) {
                                            if (matches.Items.length == 1) {
                                                results.push({ Number: number, Detail: matches.Items[0] });
                                            } else {
                                                results.push({ Number: number, Detail: null });
                                            }
                                            d.resolve();
                                        })
                                        .catch(function (ex) {
                                            results.push({ Number: number, Detail: null });
                                            d.resolve();
                                        });
			                        return d.promise;
			                    })());
			                }
			            });
			        }
			        $q.all(queue)
                        .then(function () {
                            deferred.resolve(results);
                        });
                } else {
                    deferred.resolve(results);
				}
            })
			.catch(function(ex) {
                d.resolve();
			});
        return deferred.promise;
    }

    function tagNumbers(tagNumbers) {
        var deferred = $q.defer();

        var results = [];
        var queue = [];
	CurrentOrder.GetCurrentCustomer()
	.then(function(cust) {
	    if (cust) {
                angular.forEach(tagNumbers, function(number) {
                    if (number) {
                        queue.push((function () {

                            var d = $q.defer();
                            if (SearchTypeService.IsGlobalSearch()) {
                                OrderCloud.Me.ListCategories(null, 1, 50, null, "Name", {
                                    "xp.TagNumber": number }, "all", cust.id.substring(0, 5))
                                    .then(function (matches) {
                                        if (matches.Items.length > 0) {
                                            for (var i = 0; i < matches.Items.length; i++) {
                                                results.push({ Number: number, Detail: matches.Items[i] });
                                            }
                                        } else {
                                            results.push({ Number: number, Detail: null });
                                        }
                                        d.resolve();
                                    })
                                    .catch(function (ex) {
                                        results.push({ Number: number, Detail: null });
                                        d.resolve();
                                    });
                            } else {
                                OrderCloud.Me.ListCategories(null, 1, 50, "ParentID", null, {
                                    "xp.TagNumber": number,
                                    "ParentID": cust.id
                                }, null, cust.id.substring(0, 5))
                                    .then(function (matches) {
                                        if (matches.Items.length == 1) {
                                            results.push({ Number: number, Detail: matches.Items[0] });
                                        } else {
                                            results.push({ Number: number, Detail: null });
                                        }
                                        d.resolve();
                                    })
                                    .catch(function (ex) {
                                        results.push({ Number: number, Detail: null });
                                        d.resolve();
                                    });
                            }
                            return d.promise;
                        })());
                    }
                });
                $q.all(queue).then(function() {
                    deferred.resolve(results);
                });
	    } else {
                 deferred.resolve(results);
	    }
        })
	.catch(function(ex) {});

        return deferred.promise;
    }

    function partNumbers(weirGroup, partNumbers) {
        var results = {
            Parts: [],
            NumSearched: partNumbers.length
        };
        var queue = [];
        var deferred = $q.defer();

        getParts(weirGroup, partNumbers);
        $q.all(queue)
	    .then(function () {
	        deferred.resolve(results);
	    })
		.catch(function (ex) {
		    deferred.resolve(results);
		});
        return deferred.promise;

        function getParts(weirGroup, partNumbers) {
            angular.forEach(partNumbers, function (number) {
                if (number) {
                    queue.push((function () {
                        var d = $q.defer();

                        OrderCloud.Me.ListProducts(weirGroup, 1, 50, "ID", "Name", { "Name": number })
                            .then(function (products) {
                                if (products.Items.length == 0) {
                                    if (weirGroup = "WVCUK") {
                                        OrderCloud.Me.ListProducts(weirGroup, 1, 50, "ID", "Name", { "xp.AlternatePartNumber": number })
                                            .then(function (products) {
                                                if (products.Items.length == 0) {
                                                    results.Parts.push({ Number: number, Detail: null });
                                                } else {
                                                    angular.forEach(products.Items, function (product) {
                                                        var result = { Number: number, Detail: product };
                                                        results.Parts.push(result);
                                                    });
                                                }
                                                d.resolve();
                                            })
                                            .catch(function (ex) {
                                                results.Parts.push({ Number: number, Detail: null });
                                                d.resolve();
                                            });
                                    } else {
                                        results.Parts.push({ Number: number, Detail: null });
                                        d.resolve();
                                    }
                                } else {
                                    angular.forEach(products.Items, function (product) {
                                        var result = { Number: number, Detail: product };
                                        results.Parts.push(result);
                                    });
                                    d.resolve();
                                }
                            })
                            .catch(function (ex) {
                                results.Parts.push({ Number: number, Detail: null });
                                d.resolve();
                            });
                        return d.promise;
                    })());
                }
            });
        }
    }

    //var lastSearchType = "";
    //function setLastSearchType(type) {
    //    lastSearchType = type;
    //}
    //function getLastSearchType() {
    //    return lastSearchType;
    //}

    // Category representing the weir group of the buyer
    //var weirGroup = {};
    //function setWeirGroup(group) {
    //    weirGroup = group;
    //}
    //function getWeirGroup() {
	//    // TODO: Remove this
	//    if (!weirGroup.ID) {
	//	weirGroup = {
    //                "ID": "WCVUK",
    //                "Name": "Weir Controls and Valves UK",
    //                "Description": null,
    //                "ListOrder": 1,
    //                "Active": true,
    //                "ParentID": null
    //              };
	//    }
    //    return weirGroup;
    //}

    function addPartToQuote(part) {
        var deferred = $q.defer();
        var currentOrder = {};
		var customer = null; //CurrentOrder.GetCurrentCustomer(); // Will this appropriately change?

	    CurrentOrder.GetCurrentCustomer()
		    .then(function(cust) {
		    	customer = cust;
			    return CurrentOrder.Get();
		    })
		    .then(function(order) {
			    // order is the localforge order.
			    currentOrder = order;
			    return OrderCloud.LineItems.List(currentOrder.ID,null,null,null,null,null,null, buyerid);
		    })
		    .then(function(lineItems) {
			    // If the line items contains the current part, then update.
			    var elementPosition = lineItems.Items.map(function(x) {return x.ProductID;}).indexOf(part.Detail.ID);
			    if(elementPosition == -1) {
				    addLineItem(currentOrder);
			    } else {
				    updateLineItem(currentOrder, lineItems.Items[elementPosition]);
			    }
		    })
		    .catch(function() {
			    console.log(customer);
			    var cart = {
				    "ID": randomQuoteID(),
				    "Type": "Standard",
				    xp: {
				    	"BuyerID":OrderCloud.BuyerID.Get(),
					    "Type": "Quote",
					    "CustomerID": customer.id,
					    "CustomerName": customer.name,
					    "Status": "DR",
					    "Active": true
				    }
			    };
			    OrderCloud.Orders.Create(cart)
				    .then(function(order) {
					    CurrentOrder.Set(order.ID);
					    addLineItem(order);
				    })
		    });

        function updateLineItem(order, lineItem) {
            // find the line item and update the quantity of the current order.
            var qty = part.Quantity + lineItem.Quantity;
            var li = {
                ProductID: lineItem.ProductID,
                Quantity: qty
            };
            OrderCloud.LineItems.Patch(order.ID, lineItem.ID, li, OrderCloud.BuyerID.Get())
                .then(function(lineItem) {
                    deferred.resolve({Order: order, LineItem: lineItem});
                });
        }

        function addLineItem(order) {
            var li = {
                ProductID: part.Detail.ID,
                Quantity: part.Quantity,
                xp: {
                    SN: part.xp.SN,
                    TagNumber: part.xp.TagNumber
                }
            };

            OrderCloud.LineItems.Create(order.ID, li, OrderCloud.BuyerID.Get())
                .then(function(lineItem) {
                    deferred.resolve({Order: order, LineItem: lineItem});
                })
	            .catch(function(ex) {
		            console.log(ex);
	            });
        }

        return deferred.promise;
    }

    function addPartsToQuote(parts) {
        var deferred = $q.defer();

        CurrentOrder.Get()
            .then(function(order) {
                addLineItems(order);
            })
            .catch(function() {
	            OrderCloud.Orders.Create({ID: randomQuoteID(), xp:{Type:"Quote",Status:"DR",BuyerID:OrderCloud.BuyerID.Get()}})
                    .then(function(order) {
                        CurrentOrder.Set(order.ID);
                        addLineItems(order);
                    });
            });

        function addLineItems(order) {
            var queue = [];

            angular.forEach(parts, function(part) {
                if (part.Quantity) {
                    queue.push((function() {
                        var d = $q.defer();

                        var li = {
                            ProductID: part.Detail.ID,
                            Quantity: part.Quantity
                        };

                        OrderCloud.LineItems.Create(order.ID, li)
                            .then(function(lineItem) {
                                d.resolve(lineItem);
                            });

                        return d.promise;
                    })());
                }
            });

            $q.all(queue).then(function() {
                deferred.resolve();
            });
        }

        return deferred.promise;
    }

    function quickQuote(parts) {
    	//TODO - This needs to be tested.
        var deferred = $q.defer();

        CurrentOrder.Get()
            .then(function(order) {
                addLineItems(order);
            })
            .catch(function() {
            	CurrentOrder.GetCurrentCustomer()
		            .then(function(customer) {
			            return OrderCloud.Orders.Create({ID: randomQuoteID(), xp: {CustomerID:customer.id,CustomerName:customer.name,BuyerID:OrderCloud.BuyerID.Get()}})
		            })
                    .then(function(order) {
                        CurrentOrder.Set(order.ID);
                        addLineItems(order);
                    });
            });

        function addLineItems(order) {
            var queue = [];

            angular.forEach(parts, function(part) {
                if (part.Number && part.Quantity) {
                    queue.push((function() {
                        var d = $q.defer();

                        var li = {
                            ProductID: part.Number,
                            Quantity: part.Quantity
                        };

                        OrderCloud.LineItems.Create(order.ID, li)
                            .then(function(lineItem) {
                                d.resolve(lineItem);
                            });

                        return d.promise;
                    })());
                }
            });

            $q.all(queue).then(function() {
                deferred.resolve();
            });
        }

        return deferred.promise;
    }

    function randomQuoteID() {
        var id = "";
        var possible = "0123456789";

        for( var i=0; i < 10; i++ )
            id += possible.charAt(Math.floor(Math.random() * possible.length));

        return id;
    }

   // Resolve user
	var users = {};
	function getUser(userId) {
            var deferred = $q.defer();
		if (users[userId]) {
		    deferred.resolve(users[userId]);
		} else {
		    OrderCloud.Users.Get(userId)
			.then(function(usr) {
				users[userId] = usr;
				deferred.resolve(usr);
			})
			.catch(function(ex) {
				deferred.resolve({});
			});
		}
		return deferred.promise;
	}

   // Resolve customer
	var customers = {};
	function getCustomerCategory(orgId) {
            var deferred = $q.defer();
		if (customers[orgId]) {
		    deferred.resolve(customers[orgId]);
		} else {
			OrderCloud.Categories.Get(orgId)
			.then(function(org) {
				customers[orgId] = org;
				deferred.resolve(org);
			})
			.catch(function(ex) {
				deferred.resolve({});
			});
		}
		return deferred.promise;
	}

	function cartHasItems() {
	    return true;
	}

    function findCart(customer) {
        var deferred = $q.defer();
        OrderCloud.Me.Get()
	        .then(function(user) {
                var filter = {
                    "FromUserId": user.ID,
                    "xp.Type": "Quote",
					"xp.CustomerID": customer.id,
	                "xp.CustomerName": customer.name,
					"xp.Status": "DR"
				};
		        OrderCloud.Orders.ListOutgoing(null, null, null, 1, 100, null, null, filter, OrderCloud.BuyerID.Get()) //(from, to, search, page, pageSize, searchOn, sortBy, filters, buyerID)
					.then(function(results) {
						if (results.Items.length > 0) {
							var ct = results.Items[0];
							CurrentOrder.Set(ct.ID);
							deferred.resolve(ct);
						} else {
							var cart = {
								"Type": "Standard",
								xp: {
									"BuyerID":OrderCloud.BuyerID.Get(),
									"Type": "Quote",
									"CustomerID": customer.id,
									"CustomerName": customer.name,
									"Status": "DR",
									"Active": true
								}
							};
							OrderCloud.Orders.Create(cart)
								.then(function(ct) {
									CurrentOrder.Set(ct.ID);
									deferred.resolve(ct);
								})
								.catch(function(ex) {
									deferred.reject(ex);
								});
                        }
                    });
			})
			.catch(function(ex) {
	            d.reject(ex);
			});
		return deferred.promise;
    }

	function findOrders(urlParams, resolveSharedId) {
		var quotes = [];
		var queue = [];
		var deferred = $q.defer();

		if (urlParams) {
			/*var filter = {
				"xp.Type": "Order",
				"xp.Active": true
			};
			var statusFilter = statuses[0].id;
			for(var i=1; i<statuses.length; i++) statusFilter += "|" + statuses[i].id;
			filter["xp.Status"] = statusFilter;*/

			var d = $q.defer();
			OrderCloud.Orders.ListOutgoing(urlParams.from, urlParams.to, urlParams.search, urlParams.page, urlParams.pageSize || 100, urlParams.searchOn, urlParams.sortBy, urlParams.filters, OrderCloud.BuyerID.Get()) //(from, to, search, page, pageSize, searchOn, sortBy, filters, buyerID)
				.then(function(results) {
					angular.forEach(results.Items, function(quote) {
						quotes.push(quote);
					});
					d.resolve();
				})
				.catch(function(ex) {
					d.resolve();
				});

			d.promise.then(function() {
				// resolveCustomers(quotes).then( function() {
				resolveUsers(quotes, resolveSharedId).then(function() {
					deferred.resolve(quotes);
				});
				// });
			});
		} else {
			deferred.resolve(quotes);
		}
		return deferred.promise;
	}

	/* Do not use */
    function findQuotes(statuses, resolveSharedId, urlParams) {
	    var quotes = [];
        var queue = [];
	    var params = urlParams ? urlParams : {from:null,to:null,search:null,page:null,pageSize:null,searchOn:null,sortBy:null};
        var deferred = $q.defer();

	    if (statuses && statuses.length) {
	        var filter = {
	    	    "xp.Type": "Quote",
		        "xp.Active": true
	        };
			var statusFilter = statuses[0].id;
			for(var i=1; i<statuses.length; i++) statusFilter += "|" + statuses[i].id;
                filter["xp.Status"] = statusFilter;

                var d = $q.defer();
		        OrderCloud.Orders.ListOutgoing(params.from, params.to, params.search, params.page || 1, params.pageSize || 100, params.searchOn, params.sortBy, params.filters, OrderCloud.BuyerID.Get()) //(from, to, search, page, pageSize, searchOn, sortBy, filters, buyerID)
                    .then(function(results) {
                        angular.forEach(results.Items, function(quote) {
                            quotes.push(quote);
                        });
                        d.resolve();
                    })
                    .catch(function(ex) {
                        d.resolve();
                    });

                d.promise.then(function() {
                    // resolveCustomers(quotes).then( function() {
		            resolveUsers(quotes, resolveSharedId).then(function() {
                        deferred.resolve(quotes);
		            });
	                // });
	            });
        } else {
             deferred.resolve(quotes);
        }
		return deferred.promise;
    }

    function resolveUsers(quotes, resolveSharedId) {
        var deferred = $q.defer();
        if (resolveSharedId) {
            var userIds = [];
            angular.forEach(quotes, function(quote) {
                if (quote.xp.SharedWithID && userIds.indexOf(quote.xp.SharedWithID) < 0) userIds.push(quote.xp.SharedWithID);
            });
            var queue2 = [];
            angular.forEach(userIds, function(id) {
                queue2.push((function() {
                    var d = $q.defer();
                    getUser(id)
	                .then(function(usr) { d.resolve(); })
	                .catch(function(ex) { d.resolve(); });
                    return d.promise;
                })());
            });
            $q.all(queue2).then(function() {
                angular.forEach(quotes, function(quote) {
                    if (quote.xp.SharedWithID) {
                        var usr = users[quote.xp.SharedWithID];
                        if (usr) {
                            quote.tmp = quote.tmp || {};
                            quote.tmp.user = usr;
                        }
                    }
                });
                deferred.resolve(quotes);
             });
         } else {
             deferred.resolve(quotes);
         }
	return deferred.promise;
    }

    function resolveCustomers(quotes) {
        var deferred = $q.defer();
        var orgIds = [];
        angular.forEach(quotes, function(quote) {
            if (quote.xp.CustomerID && orgIds.indexOf(quote.xp.CustomerID) < 0) orgIds.push(quote.xp.CustomerID);
        });
		var queue = [];
		angular.forEach(orgIds, function(id) {
		    queue.push((function() {
		        var d = $q.defer();
		        getCustomerCategory(id).then(
		            function(org) { d.resolve(); }
		        ).catch(function(ex) { d.resolve(); });
		            return d.promise;
		    })());
		});
	        $q.all(queue).then(function() {
	            angular.forEach(quotes, function(quote) {
	                if (quote.xp.CustomerID) {
	                    var org = customers[quote.xp.CustomerID];
	                    if (org) {
	                        quote.tmp = quote.tmp || {};
	                        quote.tmp.Customer = org;
	                    }
	                }
	            });
	            deferred.resolve(quotes);
		});
		return deferred.promise;
    }

    function updateQuote(quote, data, assignQuoteNumber, prefix) {
        var deferred = $q.defer();
		if (assignQuoteNumber) {
			tryQuoteSaveWithQuoteNumber(deferred, quote, data, prefix, 1);
		} else {
			OrderCloud.Orders.Patch(quote.ID, data)
				.then(function(quote) { deferred.resolve(quote)})
				.catch(function(ex) { deferred.reject(ex); });
		}
			return deferred.promise;
    }

    function tryQuoteSaveWithQuoteNumber(deferred, quote, data, prefix, trycount) {
        var newQuoteId=createQuoteNumber(prefix);
        data.ID = newQuoteId;
		OrderCloud.Orders.Patch(quote.ID, data)
			.then(function(quote) { CurrentOrder.Set(newQuoteId); return quote;})
			.then(function(quote) { deferred.resolve(quote)})
			.catch(function(ex) {
                if(trycount > 4) {
		            deferred.reject(ex);
				} else {
					tryQuoteSaveWithQuoteNumber(deferred, quote, data, prefix, trycount+1);
				}
	   });
    }

    function createQuoteNumber(prefix) {
		// var timeoffset = 1476673277652;
        var now = new Date();
		var testVal = (now.getTime().toString());
        var quoteNum = prefix + "-" + testVal;
		return quoteNum;
    }

    //ToDo this may need to be udpated.
    function setQuoteAsCurrentOrder(quoteId) {
        var deferred = $q.defer();

	    CurrentOrder.Set(quoteId)
		    .then(function() {
		    	return CurrentOrder.Get();
		    })
		    .then(function(quote) {
		    	return CurrentOrder.SetCurrentCustomer({
		    		id: quote.xp.CustomerID,
				    name: quote.xp.CustomerName
			    });
		    })
		    .then(function() {
		    	deferred.resolve();
		    })
		    .catch(function(ex) {
		    	deferred.reject(ex);
		    });

	    return deferred.promise;
    }

    return service;
}

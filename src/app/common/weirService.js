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

function UserGroupsService($q, OrderCloudSDK) {
    var groups = null;
    function _isUserInGroup(groupList) {
        var d = $q.defer();
        var isInGroup = false;
        if (!groups) {
	        OrderCloudSDK.Me.ListUserGroups()
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

function WeirService($q, $cookieStore, $sce, OrderCloudSDK, CurrentOrder, SearchTypeService, Me) {
    var orderStatuses = {
        Enquiry: { id: "EN", label: { en: "Enquiry Submitted", fr: "Demande envoyée" }, desc: "An enquiry for parts not found" },
	    EnquiryReview: {id: "ER", label:{ en: "Enquiry Submitted", fr: "Demande envoyée" },desc: "An enquiry under administrator review."},
        Draft: { id: "DR", label: { en: "Draft", fr: "Brouillon" }, desc: "This is the current quote under construction" },
        Saved: { id: "SV", label: { en: "Saved", fr: "Cotation(s) enregistrée(s)" }, desc: "Quote has been saved but not yet submitted to weir as quote or order" },
        Submitted: { id: "SB", label: { en: "Quote Submitted for Review", fr: "Cotation(s) soumise(s) à révision" }, desc: "Customer has selected to request review OR review status is conditional based on POA items being included in quote" },
        RevisedQuote: { id: "RV", label: { en: "Revised Quote", fr: "Cotation révisée" }, desc: "Weir have reviewed the quote and updated items as required. When the update is saved and ‘shared with the customer this becomes a ‘Revised quote’" },
        RejectedQuote: { id: "RQ", label: { en: "Rejected Quote", fr: "Cotation rejetée" }, desc: "Weir have shared Revised quote with buyer has rejected revision (this would display as a status in the list view of quotes rather than in the navigation)" },
        ConfirmedQuote: { id: "CQ", label: { en: "Confirmed Quote", fr: "Cotation confirmée" }, desc: "1. Customer has approved revised quote – assumes that if Weir have updated a revised quote the new /revised items are ‘pre-approved’ by Weir. 2. Weir admin has  confirmed a quote submitted for review by the customer." },
        SubmittedWithPO: { id: "SP", label: { en: "Order submitted with PO", fr: "Commande avec Bon de Commande" }, desc: "Order has been submitted to Weir with a PO" },
        SubmittedPendingPO: { id: "SE", label: { en: "Order submitted pending PO", fr: "Commande sans Bon de Commande" }, desc: "Order has been submitted to Weir with the expectation of a PO to be sent via email" },
        RevisedOrder: { id: "RO", label: { en: "Revised Order", fr: "Commande révisée" }, desc: "1. Weir have reviewed the order and updated items as required. When the update is saved and ‘shared with the customer this becomes a ‘Revised Order’." },
        RejectedRevisedOrder: { id: "RR", label: { en: "Rejected Revised Order", fr: "Commande révisée rejetée" }, desc: "Weir have shared revised order and customer has rejected revision (this would display as a status in the list view of quotes rather than in the navigation)" },
        ConfirmedOrder: { id: "CO", label: { en: "Confirmed Order", fr: "Commande confimée" }, desc: "1, Weir have reviewed order and confirmed all details are OK 2, Customer has accepted revised order" },
        Despatched: { id: "DP", label: { en: "Despatched", fr: "Expédiée" }, desc: "Order marked as despatched" },
        Invoiced: { id: "IV", label: { en: "Invoiced", fr: "Facturée" }, desc: "Order marked as invoiced" },
        Review: { id: "RE", label: { en: "Under review", fr: "En révision" }, desc: "Order or Quote has been submitted to Weir, but a change or additional information is needed" }
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
        orderStatuses.SubmittedPendingPO, orderStatuses.Review, orderStatuses.Enquiry, orderStatuses.EnquiryReview
    ];

    function getStatus(id) {
        var match = null;
        angular.forEach(orderStatusList, function (status) {
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
        SearchType: { Serial: "s", Part: "p", Tag: "t" },
        OrderStatus: orderStatuses,
        OrderStatusList: orderStatusList,
        LookupStatus: getStatus,
        FindQuotes: findQuotes,
        FindOrders: findOrders,
        CartHasItems: cartHasItems,
        UpdateQuote: updateQuote,
        SetQuoteAsCurrentOrder: setQuoteAsCurrentOrder,
        FindCart: findCart,
        GetValve: getValve,
        GetEnquiryParts: getEnquiryParts,
        GetEnquiryCategories: getEnquiryCategories,
        SubmitEnquiry: submitEnquiry,
        SetEnglishTranslationValve: _setEnglishTranslationValve,
        SetEnglishTranslationParts: _setEnglishTranslationParts
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
        return OrderCloudSDK.Addresses.SaveAssignment(Me.GetBuyerID(),buyerAssignment)
           .then(function () {
               return OrderCloudSDK.Addresses.SaveAssignment(Me.GetBuyerID(),shopperAssignment);
           })
           .then(function () {
               return OrderCloudSDK.Addresses.SaveAssignment(Me.GetBuyerID(),adminAssignment);
           })
           .catch(function (ex) {
               return ex;
           });
    }

    function getLocale() {
        var localeOfUser = $cookieStore.get('language');

        //set the expiration date of the cookie.
        var now = new Date();
        var exp = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());

        if(Me && Me.Org && Me.Org.xp && Me.Org.xp.Lang) {
            localeOfUser = Me.Org.xp.Lang.id;
        } else if (localeOfUser == null || localeOfUser == false) {
            //getting the language of the user's browser
            localeOfUser = navigator.language;
            localeOfUser = localeOfUser.substr(0, 2);
        }

        //setting the cookie.
        $cookieStore.put('language', localeOfUser, {
            expires: exp
        });

        return localeOfUser;
    }

    function navlabels() {
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
                submitted: "Submitted with PO",
                pending: "Submitted pending PO",
                revised: "Revised",
                confirmed: "Confirmed",
                despatched: "Despatched",
                invoiced: "Invoiced",
                home: "Home",
                EnquiryQuotes: "Enquiries"
            },
            fr: {
                privacyTitle: $sce.trustAsHtml("Déclaration de confidentialité"),
                newQuote: $sce.trustAsHtml("Nouvelle cotation"),
                cookieTitle: $sce.trustAsHtml("Politique de cookie"),
                termsTitle: $sce.trustAsHtml("Conditions d'utilisation"),
                contactTitle: $sce.trustAsHtml("Contact"),
                YourQuotes: $sce.trustAsHtml("Vos cotations"),
                YourOrders: $sce.trustAsHtml("Vos commandes"),
                YourAccount: $sce.trustAsHtml("Votre compte"),
                Account: $sce.trustAsHtml("Compte"),
                Search: $sce.trustAsHtml("Rechercher"),
                Current: $sce.trustAsHtml("Cotations en cours"),
                SavedQuotes: $sce.trustAsHtml("Cotation(s) enregistr&eacute;e(s)"),
                ReviewQuotes: $sce.trustAsHtml("Cotation(s) soumise(s) pour r&eacute;vision"),
                RevisedQuotes: $sce.trustAsHtml("Cotation(s) r&eacute;vis&eacute;e(s)"),
                ConfirmedQuotes: $sce.trustAsHtml("Cotation(s) confirm&eacute;e(s)"),
                submitted: $sce.trustAsHtml("Soumise(s) avec bon de commande"),
                pending: $sce.trustAsHtml("Soumise(s) sans bon de commande"),
                revised: $sce.trustAsHtml("Commande(s) r&eacute;vis&eacute;e(s)"),
                confirmed: $sce.trustAsHtml("Commande(s) confirm&eacute;e(s)"),
                despatched: $sce.trustAsHtml("Commande(s) exp&eacute;di&eacute;e(s)"),
                invoiced: $sce.trustAsHtml("Facturée"),
                home: $sce.trustAsHtml("Accueil"),
                EnquiryQuotes: "Demandes"
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
		    var opts = {};
		    if (cust) {
		        if (SearchTypeService.IsGlobalSearch()) {
                    opts = {
                        'page':1,
                        'pageSize':50,
                        'sortBy':"Name",
                        'filters': {
                            "xp.SN": serialNumber
                        },
                        'depth':"all",
                        'catalogID':Me.Org.xp.WeirGroup.label
                    };
			        OrderCloudSDK.Me.ListCategories(opts)
                        .then(function (matches) {
                            if (matches.Items.length == 1) {
                                result = matches.Items[0];
                                getParts(result.ID, deferred, result);
                            } else if (matches.Items.length == 0) {
                                return deferred.resolve("No matches found for serial number " + serialNumber);
                            } else {
                                return deferred.resolve("No matches found for serial number " + serialNumber);
                            }
                        })
                        .catch(function(ex) {
                            console.log(ex);
	                        return deferred.reject(ex);
                        });
		        } else {
		            var filters = {"xp.SN": serialNumber};
		            if (Me.Org.xp.WeirGroup.label == "WVCUK") { //FR users will still search globally.
                        filters.ParentID = cust.id;
                    }

                    opts = {'page':1,
                        'pageSize':50,
                        'filters': filters,
                        'depth':"all",
                        'catalogID':Me.Org.xp.WeirGroup.label
                    };
			        OrderCloudSDK.Me.ListCategories(opts)
                        .then(function (matches) {
                            if (matches.Items.length == 1) {
                                result = matches.Items[0];
                                getParts(result.ID, deferred, result);
                            } else if (matches.Items.length == 0) {
                                return deferred.resolve("No matches found for serial number " + serialNumber);
                            } else {
                                return deferred.resolve("No matches found for serial number " + serialNumber);
                            }
                        })
				        .catch(function(ex) {
				        	console.log(OrderCloudSDK.GetToken());
					        console.log(ex.response.body.Errors["0"].Message);
					        return deferred.reject(ex);
				        });
		        }
		    } else {
		        throw { message: "Customer for quote / search not set" };
		    }
		})
        .catch(function (ex) {
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
				        OrderCloudSDK.Me.ListCategories({'page':1, 'pageSize':50, 'sortBy':"Name", 'filters':{
			                "TagNumber": tagNumber
			            }, 'depth':"all", 'catalogID':Me.Org.xp.WeirGroup.label})
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
				        OrderCloudSDK.Me.ListCategories({'page':1, 'pageSize':50, 'sortBy':"ParentID",'filters':{
			                "xp.TagNumber": tagNumber,
			                "ParentID": cust.id
			            }, 'catalogID':Me.Org.xp.WeirGroup.label})
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
				    OrderCloudSDK.Me.ListCategories({'page':1, 'pageSize':50, 'filters':{ "ID": id }, 'depth':"all", 'catalogID':Me.Org.xp.WeirGroup.label})
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
	    OrderCloudSDK.Me.ListProducts({ 'page':1, 'pageSize':100, 'categoryID':catId, 'catalogID':result.ParentID.substring(0, 5), 'sortBy': 'Name' }) //why was UpdatePart here?
            .then(function (products) {
                result.Parts = [];
                var hasPrices = [];
                var noPrices = [];
                angular.forEach(products.Items, function (product) {
                    if (product.PriceSchedule && product.PriceSchedule.PriceBreaks && product.PriceSchedule.PriceBreaks.length > 0 && product.PriceSchedule.PriceBreaks[0].Price) {
                        hasPrices.push({ Number: product.ID, Detail: product });
                    } else {
                        noPrices.push({ Number: product.ID, Detail: product });
                    }
                });
                result.Parts.push.apply(result.Parts, hasPrices);
                result.Parts.push.apply(result.Parts, noPrices);
                deferred.resolve(_setEnglishTranslationValve(result));
            })
            .catch(function (ex) {
                deferred.reject(ex);
            })
    }

    function serialNumbers(serialNumbers) {
        var deferred = $q.defer();
        var results = [];
        var queue = [];
        CurrentOrder.GetCurrentCustomer()
            .then(function (cust) {
                if (cust) {
                    if (SearchTypeService.IsGlobalSearch()) {
                        angular.forEach(serialNumbers, function (number) {
                            if (number) {
                                queue.push((function () {
                                    var d = $q.defer();
	                                OrderCloudSDK.Me.ListCategories({
                                            'page':1,
                                            'pageSize':50,
                                            'sortBy':"Name",
                                            'filters':{
                                                "xp.SN": number
                                            },
                                            'depth':"all",
                                            'catalogID':cust.id.substring(0, 5)})
                                        .then(function (matchesSN) {
                                            if (matchesSN.Items.length == 1) {
                                                results.push({Number: number, Detail: matchesSN.Items[0]});
                                            }
	                                        OrderCloudSDK.Me.ListCategories({
                                                    'search':number,
                                                    'page':1,
                                                    'pageSize':50,
                                                    'searchOn':"Description",
                                                    'depth':"all",
                                                    'catalogID':cust.id.substring(0, 5)})
                                                .then(function (matchesDescription) {
                                                    if (matchesDescription.Items.length == 1) {
                                                        results.push({Number:  matchesDescription.Items[0].xp.SN, Detail: matchesSN.Items[0]});
                                                    } else {
                                                        for (var i = 0; i <= matchesDescription.Items.length - 1 ; i++) {
                                                            results.push({
                                                                Number: matchesDescription.Items[i].xp.SN,
                                                                Detail: matchesDescription.Items[i]
                                                            });
                                                        }
                                                    }
                                                    results = _.uniq(results, false, function(cat){return cat.Number});
                                                    d.resolve();
                                                })
                                                .catch(function (ex) {
                                                    results.push({Number: number, Detail: null});
                                                    d.resolve();
                                                });
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
                                    var filters = {"xp.SN": number};
                                    if (Me.Org.xp.WeirGroup.label == "WVCUK") { //FR users will still search globally.
                                        filters.ParentID = cust.id;
                                    }

	                                OrderCloudSDK.Me.ListCategories({
                                            'page':1,
                                            'pageSize':50,
                                            'sortBy':"Name",
                                            'filters': filters,
                                            'depth':"all",
                                            'catalogID':Me.Org.xp.WeirGroup.label})
                                        .then(function (matchesSN) {
                                            if (matchesSN.Items.length == 1) {
                                                results.push({Number: number, Detail: matchesSN.Items[0]});
                                            }
	                                        OrderCloudSDK.Me.ListCategories({
                                                    'search':number,
                                                    'page':1,
                                                    'pageSize':50,
                                                    'searchOn':"Description",
                                                    'depth':"all",
                                                    'catalogID':Me.Org.xp.WeirGroup.label})
                                                .then(function (matchesDescription) {
                                                    if (matchesDescription.Items.length == 1) {
                                                        results.push({
                                                            Number: matchesDescription.Items[0].xp.SN,
                                                            Detail: matchesDescription.Items[0]
                                                        });
                                                    } else {
                                                        for(var i = 0; i <= matchesDescription.Items.length-1; i++){
                                                            results.push({
                                                                Number: matchesDescription.Items[i].xp.SN,
                                                                Detail: matchesDescription.Items[i]
                                                            });
                                                        }
                                                    }
                                                    results = _.uniq(results, false, function (cat) {
                                                        return cat.Number
                                                    });
                                                    d.resolve();
                                                });
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
            .catch(function (ex) {
                d.resolve();
            });
        return deferred.promise;
    }

    function tagNumbers(tagNumbers) {
        var deferred = $q.defer();

        var results = [];
        var queue = [];
        CurrentOrder.GetCurrentCustomer()
        .then(function (cust) {
            if (cust) {
                angular.forEach(tagNumbers, function (number) {
                    if (number) {
                        queue.push((function () {
                            var d = $q.defer();
                            if (SearchTypeService.IsGlobalSearch()) {
	                            OrderCloudSDK.Me.ListCategories({'page':1, 'pageSize':50, 'sortBy':"Name", 'filters':{
                                    "xp.TagNumber": number
                                }, 'depth':"all", 'catalogID':Me.Org.xp.WeirGroup.label})
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
	                            OrderCloudSDK.Me.ListCategories({'page':1, 'pageSize':50, 'filters':{
                                    "xp.TagNumber": number,
                                    "ParentID": cust.id
                                }, 'catalogID':Me.Org.xp.WeirGroup.label})
                                    .then(function (matches) {
                                        if (matches.Items.length > 0) {
                                            angular.forEach(matches.Items, function (match, key) {
                                                results.push({ Number: number, Detail: match });
                                            });
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
                $q.all(queue).then(function () {
                    deferred.resolve(results);
                });
            } else {
                deferred.resolve(results);
            }
        })
        .catch(function (ex) { });

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

	                    OrderCloudSDK.Me.ListProducts({'search':weirGroup, 'page':1, 'pageSize':50, 'searchOn':"ID", 'sortBy':"Name", 'filters':{ "Name": number }})
                            .then(function (products) {
                                if (products.Items.length == 0) {
                                    if (weirGroup = "WVCUK") {
	                                    OrderCloudSDK.Me.ListProducts({'search':weirGroup, 'page':1, 'pageSize':50, 'searchOn':"ID", 'sortBy':"Name", 'filters':{ "xp.AlternatePartNumber": number }})
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

    function _setEnglishTranslationValve(valve) {
        if(getLocale() == "en") {
            //ToDO Move the translated xp vals to the standard places.
            if (valve.xp && valve.xp.en) {
                valve.Description = valve.xp.en.Description;
                if(valve.xp.Specs) {
                    valve.xp.Specs.Inlet = valve.xp.en.xpInlet;
                    valve.xp.Specs.Outlet = valve.xp.en.xpOutlet;
                }
            }
            if (valve.Parts && valve.Parts.length > 0) {
                _setEnglishTranslationParts(valve.Parts);
            }
        }

        return valve;
    }

    function _setEnglishTranslationParts(searchResults) {
        if(getLocale() == "en") {
            //ToDO Move the translated xp vals to the standard places.
            angular.forEach(searchResults, function(value, key) {
                if(value.Product && value.Product.xp && value.Product.xp.en)
                    value.Product.Description = value.Product.xp.en.Description;
                if (value.xp && value.xp.en) {
                    value.Description = value.xp.en.Description;
                }
            });
        }
        return searchResults;
    }

    function addPartToQuote(part) {
        var deferred = $q.defer();
        var currentOrder = {};
        var customer = null; //CurrentOrder.GetCurrentCustomer(); // Will this appropriately change?

        CurrentOrder.GetCurrentCustomer()
		    .then(function (cust) {
		        customer = cust;
		        return CurrentOrder.Get();
		    })
		    .then(function (order) {
		        // order is the localforge order.
		        currentOrder = order;
		        return OrderCloudSDK.LineItems.List("Outgoing", currentOrder.ID);
		    })
		    .then(function (lineItems) {
		        // If the line items contains the current part, then update.
		        var elementPosition = lineItems.Items.map(function (x) { return x.ProductID; }).indexOf(part.Detail.ID);
		        if (elementPosition == -1) {
		            addLineItem(currentOrder);
		        } else {
		            updateLineItem(currentOrder, lineItems.Items[elementPosition]);
		        }
		    })
		    .catch(function () {
		        console.log(customer);
		        var cart = {
		            "ID": randomQuoteID(),
		            "Type": "Standard",
		            xp: {
		                "BuyerID": Me.GetBuyerID(),
		                "Type": "Quote",
		                "CustomerID": customer.id,
		                "CustomerName": customer.name,
		                "Status": "DR",
		                "Active": true
		            }
		        };
			    OrderCloudSDK.Orders.Create("Outgoing",cart)
				    .then(function (order) {
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
	        OrderCloudSDK.LineItems.Patch("Outgoing", order.ID, lineItem.ID, li)
                .then(function (lineItem) {
                    deferred.resolve({ Order: order, LineItem: lineItem });
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

	        OrderCloudSDK.LineItems.Create("Outgoing", order.ID, li)
                .then(function (lineItem) {
                    deferred.resolve({ Order: order, LineItem: lineItem });
                })
	            .catch(function (ex) {
	                console.log(ex);
	            });
        }

        return deferred.promise;
    }

    function addPartsToQuote(parts) {
        var deferred = $q.defer();

        CurrentOrder.Get()
            .then(function (order) {
                addLineItems(order);
            })
            .catch(function () {
	            OrderCloudSDK.Orders.Create( "Outgoing", { ID: randomQuoteID(), xp: { Type: "Quote", Status: "DR", BuyerID: Me.GetBuyerID() } })
                    .then(function (order) {
                        CurrentOrder.Set(order.ID);
                        addLineItems(order);
                    });
            });

        function addLineItems(order) {
            var queue = [];

            angular.forEach(parts, function (part) {
                if (part.Quantity) {
                    queue.push((function () {
                        var d = $q.defer();

                        var li = {
                            ProductID: part.Detail.ID,
                            Quantity: part.Quantity
                        };

	                    OrderCloudSDK.LineItems.Create("Outgoing", order.ID, li)
                            .then(function (lineItem) {
                                d.resolve(lineItem);
                            });

                        return d.promise;
                    })());
                }
            });

            $q.all(queue).then(function () {
                deferred.resolve();
            });
        }

        return deferred.promise;
    }

    function quickQuote(parts) {
        //TODO - This needs to be tested.
        var deferred = $q.defer();

        CurrentOrder.Get()
            .then(function (order) {
                addLineItems(order);
            })
            .catch(function () {
                CurrentOrder.GetCurrentCustomer()
		            .then(function (customer) {
		                return OrderCloudSDK.Orders.Create("Outgoing", { ID: randomQuoteID(), xp: { CustomerID: customer.id, CustomerName: customer.name, BuyerID: Me.GetBuyerID() } })
		            })
                    .then(function (order) {
                        CurrentOrder.Set(order.ID);
                        addLineItems(order);
                    });
            });

        function addLineItems(order) {
            var queue = [];

            angular.forEach(parts, function (part) {
                if (part.Number && part.Quantity) {
                    queue.push((function () {
                        var d = $q.defer();

                        var li = {
                            ProductID: part.Number,
                            Quantity: part.Quantity
                        };

	                    OrderCloudSDK.LineItems.Create("Outgoing", order.ID, li)
                            .then(function (lineItem) {
                                d.resolve(lineItem);
                            });

                        return d.promise;
                    })());
                }
            });

            $q.all(queue).then(function () {
                deferred.resolve();
            });
        }

        return deferred.promise;
    }

    function randomQuoteID() {
        var id = "";
        var possible = "0123456789";

        for (var i = 0; i < 10; i++)
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
	        OrderCloudSDK.Users.Get(Me.GetBuyerID(), userId)
			.then(function (usr) {
			    users[userId] = usr;
			    deferred.resolve(usr);
			})
			.catch(function (ex) {
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
	        OrderCloudSDK.Categories.Get(Me.Org.xp.WeirGroup.label, orgId)
			.then(function (org) {
			    customers[orgId] = org;
			    deferred.resolve(org);
			})
			.catch(function (ex) {
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
	    OrderCloudSDK.Me.Get()
	        .then(function (user) {
	            var filter = {
	                "FromUserId": user.ID,
	                "xp.Type": "Quote",
	                "xp.CustomerID": customer.id,
	                "xp.CustomerName": customer.name,
	                "xp.Status": "DR"
	            };
		        OrderCloudSDK.Orders.List("Outgoing", {'page':1, 'pageSize':100, 'filters':filter}) //(from, to, search, page, pageSize, searchOn, sortBy, filters, buyerID)
					.then(function (results) {
					    if (results.Items.length > 0) {
					        var ct = results.Items[0];
					        CurrentOrder.Set(ct.ID);
					        deferred.resolve(ct);
					    } else {
					        var cart = {
					            "Type": "Standard",
					            xp: {
					                "BuyerID": Me.GetBuyerID(),
					                "Type": "Quote",
					                "CustomerID": customer.id,
					                "CustomerName": customer.name,
					                "Status": "DR",
					                "Active": true
					            }
					        };
						    OrderCloudSDK.Orders.Create("Outgoing",cart)
								.then(function (ct) {
								    CurrentOrder.Set(ct.ID);
								    deferred.resolve(ct);
								})
								.catch(function (ex) {
								    deferred.reject(ex);
								});
					    }
					});
	        })
			.catch(function (ex) {
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
	        OrderCloudSDK.Orders.List("Outgoing", {'from':urlParams.from, 'to':urlParams.to, 'search':urlParams.search, 'page':urlParams.page, 'pageSize':urlParams.pageSize || 100, 'searchOn':urlParams.searchOn, 'sortBy':urlParams.sortBy, 'filers':urlParams.filters, 'buyerID':Me.GetBuyerID()})
				.then(function (results) {
				    angular.forEach(results.Items, function (quote) {
				        quotes.push(quote);
				    });
				    d.resolve();
				})
				.catch(function (ex) {
				    d.resolve();
				});

            d.promise.then(function () {
                // resolveCustomers(quotes).then( function() {
                resolveUsers(quotes, resolveSharedId).then(function () {
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
        var params = urlParams ? urlParams : { from: null, to: null, search: null, page: null, pageSize: null, searchOn: null, sortBy: null };
        var deferred = $q.defer();

        if (statuses && statuses.length) {
            var filter = {
                "xp.Type": "Quote",
                "xp.Active": true
            };
            var statusFilter = statuses[0].id;
            for (var i = 1; i < statuses.length; i++) statusFilter += "|" + statuses[i].id;
            filter["xp.Status"] = statusFilter;

            var d = $q.defer();
	        OrderCloudSDK.Orders.List("Outgoing", {'from':params.from, 'to':params.to, 'search':params.search, 'page':params.page || 1, 'pageSize':params.pageSize || 100, 'searchOn':params.searchOn, 'sortBy':params.sortBy, 'filters':params.filters, 'buyerID':Me.GetBuyerID()})
                .then(function (results) {
                    angular.forEach(results.Items, function (quote) {
                        quotes.push(quote);
                    });
                    d.resolve();
                })
                .catch(function (ex) {
                    d.resolve();
                });

            d.promise.then(function () {
                // resolveCustomers(quotes).then( function() {
                resolveUsers(quotes, resolveSharedId).then(function () {
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
            angular.forEach(quotes, function (quote) {
                if (quote.xp.SharedWithID && userIds.indexOf(quote.xp.SharedWithID) < 0) userIds.push(quote.xp.SharedWithID);
            });
            var queue2 = [];
            angular.forEach(userIds, function (id) {
                queue2.push((function () {
                    var d = $q.defer();
                    getUser(id)
	                .then(function (usr) { d.resolve(); })
	                .catch(function (ex) { d.resolve(); });
                    return d.promise;
                })());
            });
            $q.all(queue2).then(function () {
                angular.forEach(quotes, function (quote) {
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
        angular.forEach(quotes, function (quote) {
            if (quote.xp.CustomerID && orgIds.indexOf(quote.xp.CustomerID) < 0) orgIds.push(quote.xp.CustomerID);
        });
        var queue = [];
        angular.forEach(orgIds, function (id) {
            queue.push((function () {
                var d = $q.defer();
                getCustomerCategory(id).then(
		            function (org) { d.resolve(); }
		        ).catch(function (ex) { d.resolve(); });
                return d.promise;
            })());
        });
        $q.all(queue).then(function () {
            angular.forEach(quotes, function (quote) {
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
            OrderCloudSDK.Buyers.Get(Me.GetBuyerID())
            .then(function (buyer) {
                tryQuoteSaveWithQuoteNumber(deferred, quote, data, prefix, 0, buyer);
            });
        } else {
	        OrderCloudSDK.Orders.Patch("OutGoing", quote.ID, data)
				.then(function (quote) { deferred.resolve(quote) })
				.catch(function (ex) { deferred.reject(ex); });
        }
        return deferred.promise;
    }

    function tryQuoteSaveWithQuoteNumber(deferred, quote, data, prefix, trycount, buyer) {
        var newQuoteId = createQuoteNumber(prefix, trycount, buyer);
        data.ID = newQuoteId;
	    OrderCloudSDK.Orders.Patch("Outgoing", quote.ID, data)
			.then(function (quote) { CurrentOrder.Set(newQuoteId); return quote; })
            .then(function(quote) { 
                var data = { xp: { NextOrderNumber: (buyer.xp.NextOrderNumber || 1) + trycount + 1 } };
                OrderCloudSDK.Buyers.Patch(buyer.ID, data);
                return quote;
            })
			.then(function (quote) { deferred.resolve(quote) })
			.catch(function (ex) {
			    if (trycount > 20) {
			        deferred.reject(ex);
			    } else {
			        tryQuoteSaveWithQuoteNumber(deferred, quote, data, prefix, trycount + 1, buyer);
			    }
			});
    }

    function createQuoteNumber(prefix, trycount, buyer) {
        // var timeoffset = 1476673277652;
        // var now = new Date();
        var pfx = prefix + "-E";
        var suffix = (buyer.xp.OrderSuffix) ? buyer.xp.OrderSuffix : "";
        var orderNum = ((buyer.xp.NextOrderNumber) ? buyer.xp.NextOrderNumber : 1) + trycount;
        // var testVal = (now.getTime().toString());
        var testVal = "0000" + orderNum.toString();
        testVal = testVal.substring(testVal.length - 5);
        var quoteNum = pfx + testVal + suffix;
        return quoteNum;
    }

    //ToDo this may need to be udpated.
    function setQuoteAsCurrentOrder(quoteId) {
        var deferred = $q.defer();

        CurrentOrder.Set(quoteId)
		    .then(function () {
		        return CurrentOrder.Get();
		    })
		    .then(function (quote) {
		        return CurrentOrder.SetCurrentCustomer({
		            id: quote.xp.CustomerID,
		            name: quote.xp.CustomerName
		        });
		    })
		    .then(function () {
		        deferred.resolve();
		    })
		    .catch(function (ex) {
		        deferred.reject(ex);
		    });

        return deferred.promise;
    }

	function sortEnquiryCategories(valveType) {
		var items = {
			"Soupape de sûreté conventionnelle - Type Série P Starflow":1,
			"Soupape d'expansion thermique - Type Série 9":2,
			"Soupape pilotées - Type Série 76, Série 78 et Stareco":3,
			"Soupape vapeur basse/moyenne pression - ASME I - Type Starflow V":4,
			"Soupape vapeur haute pression - ASME I - Type Starsteam":5,
			"Soupape pilotées basse pression - API2000 - Type Série 74LP":6
		};

		console.log(valveType);
		var result = Underscore.sortBy(valveType, function(valve) {
			return items[valve.Name];
		});
		return result;
	}

    function getEnquiryCategories() {
        var enqCat = "";
        var deferred = $q.defer();
	    OrderCloudSDK.Buyers.Get(Me.GetBuyerID())
        .then(function (b) {
            if (b.xp.WeirGroup && b.xp.WeirGroup.label) {
                enqCat = b.xp.WeirGroup.label + "_ENQ";
                return OrderCloudSDK.Me.ListCategories({ 'page': 1, 'pageSize': 100, 'sortBy': "Name", 'depth': "2", 'catalogID': enqCat, filters: {"ID": "<>Parts"}});
            } else {
                deferred.resolve([]);
            }
        })
        .then(function (brands) {
	    var lang = getLocale();
            var matches = { manufacturers: [], valvetypes: {}, catalog: enqCat };
            for (var i = 0; i < brands.Items.length; i++) {
                var tmp = brands.Items[i];
		if (lang && tmp.xp && tmp.xp[lang] && tmp.xp[lang].Name) tmp.Name = tmp.xp[lang].Name;
                if (tmp.ParentID) {
                    matches.valvetypes[tmp.ParentID] = matches.valvetypes[tmp.ParentID] || [];
                    matches.valvetypes[tmp.ParentID].push(tmp);
                } else {
                    matches.manufacturers.push(tmp);
                }
            }
	        //matches.valvetypes["WPIFR-Sarasin-SAR"] = sortEnquiryCategories(matches.valvetypes["WPIFR-Sarasin-SAR"]); now sorted in console.

            deferred.resolve(matches);
        })
        .catch(function (ex) {
            deferred.reject(ex);
        });
        return deferred.promise;
    }

    function getEnquiryParts(catalogID, valveType) {
        var deferred = $q.defer();
        OrderCloudSDK.Me.ListProducts({'page':1, 'pageSize':50, 'sortBy':"Name", 'categoryID':valveType.ID, 'catalogID':catalogID})
	        .then(function(parts) {
	            var lang = getLocale();
	            if (lang) {
                    for (var i = 0; i < parts.Items.length; i++) {
                        var tmp = parts.Items[i];
		                if (tmp.xp && tmp.xp[lang] && tmp.xp[lang].Description) tmp.Description = tmp.xp[lang].Description;
	                }
	            }
                deferred.resolve(_setEnglishTranslationParts(parts)); //_setEnglishTranslationParts
	        })
            .catch(function (ex) {
                deferred.reject(ex);
            });
        return deferred.promise;
    }
    //check if the user has other buyer's associated to their account.
    //Note has not been tested with proposed data structure.
    function userBuyers($q, OrderCloudSDK)
    {
        var deferred = $q.defer();
        var multiBuyer = [];
        OrderCloudSDK.Me.Get()
            .then(function (user) {
                if(user)
                {
                    if(user.xp.AKA)
                    {
                        //need to parse the AKA object to see which buyers this user has access to and confirm access.
                        for(var buyerAssociated in user.xp.AKA)
                        {
                            if(user.xp.AKA[buyerAssociated] != null)
                            {
                                var buyerID = user.xp.AKA[buyerAssociated];
                                OrderCloudSDK.Buyers.Get(buyerID).then(function (returnedBuyer) {
                                        if(returnedBuyer.xp != null)
                                        {
                                            if(returnedBuyer.xp.WeirGroup)
                                            {
                                                if(returnedBuyer.xp.WeirGroup.label)
                                                {
                                                    var buyerLabel = returnedBuyer.xp.WeirGroup.label;
                                                    if(multiBuyer.indexOf(buyerLabel) == -1) //do we need to polyfill this for old IE?
                                                    {
                                                        multiBuyer.add(buyerLabel);
                                                    }
                                                    else
                                                    {
                                                        //do nothing
                                                    }
                                                }
                                            }
                                        }
                                })
                            }
                        }
                    }
                }
                deferred.resolve(multiBuyer);

            })
            .catch(function (ex) {
                console.log(ex.toString());
                return deferred.reject([]); //return an empty array something went wrong.
            });

        return deferred.promise;
    }

    function submitEnquiry(enq) {
        var deferred = $q.defer();
	    var buyerId = Me.GetBuyerID();
        //var prefix = 'WPIFR';
        var newQuoteId = createQuoteNumber(buyerId, 0, Me.Org);
        var data = {
            ID: newQuoteId,
            Type: "Standard",
            // "FromUserID": "",
            "ShippingAddressID": enq.Shipping.ID,
            xp: {
                "BuyerID": buyerId,
                "Type": "Quote",
                "CommentsToWeir": [],
                "CustomerID": Me.Org.ID,
                "CustomerName": Me.Org.Name,
                "Status": "EN",
                "Active": true,
                "StatusDate": new Date(),
                "WasEnquiry": true,
                "SN":enq.SerialNumber,
                "Brand":enq.Manufacturer.Name,
                "ValveType":enq.ValveType.Name
            }
        };

        if(enq.Quote && enq.Quote.xp) {
			data.xp.Name = enq.Quote.xp.Name;
			data.xp.RefNum = enq.Quote.xp.RefNum;
        }

        if (enq.Comment.val) {
            data.xp.CommentsToWeir.push(enq.Comment);
        }
        function addLineItem(sernum, itemId, qty) {
            var defer = $q.defer();
            var li = {
                ProductID: itemId,
                Quantity: qty,
                xp: {
                    SN: sernum
                }
            };
	        OrderCloudSDK.LineItems.Create("Outgoing",data.ID, li)
                .then(function (lineItem) {
                    defer.resolve({ Order: data, LineItem: lineItem });
                })
                .catch(function (ex) {
                    defer.reject(ex);
                });
            return defer.promise;
        }
        var queue = [];
        //TODO - Complete quote creation process with ascending trycount if necessary.
        //TODO - Patch the buyers quote id.
        OrderCloudSDK.Buyers.Get(Me.Org.ID)
            .then(function(buyer) {
                Me.Org = buyer;
                return OrderCloudSDK.Orders.Create("Outgoing",data)
            })
            .then(function (quote) {
                for (var p in enq.Parts) {
                    if (enq.Parts[p]) {
                        queue.push(
                            addLineItem(enq.SerialNumber, p, enq.Parts[p])
                        );
                    }
                }
                $q.all(queue)
                    .then(function () {
                        deferred.resolve(data);
                    });
            })
            .then(function() {
                var data = { xp: { NextOrderNumber: (Me.Org.xp.NextOrderNumber || 1) + 1 } };
                return OrderCloudSDK.Buyers.Patch(Me.Org.ID, data);
            })
            .catch(function (ex) {
                deferred.reject(ex);
            });
        return deferred.promise;
    }
    return service;
}
